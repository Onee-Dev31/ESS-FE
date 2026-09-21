import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import Quill, { Delta } from 'quill';
import DOMPurify from 'dompurify';
import { map, Observable, of } from 'rxjs';

import { TextEditorImageManager } from './image-manager';
import { TextEditorImageService } from '../../../services/text-editor-image.service';
import { SwalService } from '../../../services/swal.service';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './text-editor.html',
  styleUrl: './text-editor.scss',
})
export class TextEditorComponent implements OnChanges {
  @Input() value = '';
  @Input() focusAtStart = false;
  @Input() preserveTypedSpacing = false;
  @Input() placeholder = 'กรอกรายละเอียด...';

  @Output() valueChange = new EventEmitter<string>();
  @Output() imagePathsChange = new EventEmitter<string[]>();

  quill!: Quill;

  /**
   * ค่า HTML ภายใน editor
   *
   * สำคัญ:
   * ไม่ bind Quill เข้ากับ @Input value โดยตรง
   * เพราะ parent จะส่ง value กลับมา แล้ว Quill จะ import HTML ใหม่
   * ซึ่งอาจ normalize whitespace ของ template เก่า
   */
  editorValue = '';

  private imageManager!: TextEditorImageManager;
  private uploadedImages = new Set<string>();

  /**
   * ป้องกัน ngOnChanges เอาค่าที่เราเพิ่ง emit
   * กลับมา setContents ซ้ำอีกครั้ง
   */
  private lastEmittedValue = '';

  private swalService = inject(SwalService);
  private textEditorImageService = inject(TextEditorImageService);

  quillConfig = {
    toolbar: [['bold', 'italic'], ['image']],

    keyboard: {
      bindings: {
        // Tab = 4 spaces จริง ๆ
        // replyTab: {
        //   key: 'Tab',
        //   shiftKey: false,
        //   handler: (range: { index: number; length: number }) => {
        //     if (!this.preserveTypedSpacing) {
        //       return true;
        //     }
        //     this.insertSpacing(range, '\u00A0'.repeat(4));
        //     return false;
        //   },
        // },
        // Spacebar = space ที่ HTML ไม่ยุบ
        // replySpace: {
        //   key: ' ',
        //   handler: (range: { index: number; length: number }) => {
        //     if (!this.preserveTypedSpacing) {
        //       return true;
        //     }
        //     this.insertSpacing(range, '\u00a0');
        //     return false;
        //   },
        // },
      },
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['value']) {
      return;
    }

    const incomingValue = this.value ?? '';

    /**
     * ถ้าเป็นค่าที่ editor เพิ่ง emit ออกไปเอง
     * ไม่ต้อง import กลับเข้า Quill
     */
    if (incomingValue === this.lastEmittedValue) {
      return;
    }

    this.editorValue = incomingValue;

    /**
     * ถ้า Quill ถูกสร้างแล้ว และ parent เปลี่ยน value
     * จากภายนอกจริง ๆ เช่นเปลี่ยน ticket
     */
    if (this.quill) {
      this.setExternalValue(incomingValue);
    }
  }

  onEditorCreated(quill: Quill): void {
    this.quill = quill;

    if (this.preserveTypedSpacing) {
      const keyboard = quill.getModule('keyboard') as any;

      const tabBinding = {
        key: 'Tab',

        handler: (range: { index: number; length: number }) => {
          this.insertSpacing(range, '\u00A0'.repeat(4));
          return false;
        },
      };

      keyboard.bindings['Tab'] = [tabBinding, ...(keyboard.bindings['Tab'] ?? [])];
    }

    this.imageManager = new TextEditorImageManager(quill, (file) => this.uploadEditorImage(file));

    this.imageManager.attach();

    if (this.value) {
      this.setExternalValue(this.value);
    }

    if (this.focusAtStart) {
      queueMicrotask(() => {
        quill.focus({ preventScroll: true });
        quill.setSelection(0, 0, 'silent');
        quill.root.scrollTop = 0;
      });
    }
  }

  /**
   * รับค่าจาก parent จริง ๆ
   * เช่นเปิด ticket ใหม่
   */
  private setExternalValue(html: string): void {
    if (!this.quill) {
      return;
    }

    const sanitizedHtml = DOMPurify.sanitize(html ?? '');

    const preparedHtml = this.preserveHtmlSpaces(sanitizedHtml);

    const delta = this.quill.clipboard.convert({
      html: preparedHtml,
    });

    this.quill.setContents(delta, 'silent');

    this.editorValue = this.quill.root.innerHTML;
  }

  /**
   * แปลง whitespace ที่ HTML ปกติจะ collapse
   *
   * เช่น
   *
   * <p>        ข้อความ</p>
   *
   * ให้กลายเป็น NBSP ก่อนเข้า Quill
   *
   * ไม่ใช้ ql-indent เพราะ requirement
   * คือรักษา space จริง ๆ จาก template
   */
  private preserveHtmlSpaces(html: string): string {
    const template = document.createElement('template');

    template.innerHTML = html;

    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);

    let node: Node | null;

    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';

      if (!text) {
        continue;
      }

      /**
       * whitespace ระหว่าง tag เช่น
       *
       * </p>
       * <p>
       *
       * ไม่ต้องเก็บ
       */
      if (!text.trim() && /[\r\n]/.test(text)) {
        continue;
      }

      node.textContent = this.convertSignificantSpaces(text);
    }

    return template.innerHTML;
  }

  /**
   * รักษา:
   * - space ต้นข้อความ
   * - space หลายตัวติดกัน
   *
   * แต่ space ปกติระหว่างคำ 1 ตัว
   * ยังคงเป็น normal space
   */
  private convertSignificantSpaces(text: string): string {
    return (
      text
        /**
         * leading spaces
         */
        .replace(/^ +/, (spaces) => '\u00a0'.repeat(spaces.length))

        /**
         * consecutive spaces
         */
        .replace(/ {2,}/g, (spaces) => '\u00a0'.repeat(spaces.length))

        /**
         * tab = 4 spaces
         */
        .replace(/\t/g, '\u00a0'.repeat(4))
    );
  }

  /**
   * ใช้สำหรับ Tab ที่ผู้ใช้กดเอง
   */
  private insertSpacing(
    range: {
      index: number;
      length: number;
    },
    spacing: string,
  ): void {
    if (!this.quill) {
      return;
    }

    const formats = this.quill.getFormat(range.index, range.length);

    this.quill.updateContents(
      new Delta().retain(range.index).delete(range.length).insert(spacing, formats),
      'user',
    );

    this.quill.setSelection(range.index + spacing.length, 0, 'silent');
  }

  /**
   * ngx-quill เรียกตอนผู้ใช้พิมพ์
   *
   * สำคัญ:
   * update editorValue ภายใน
   * แล้ว emit parent
   *
   * แต่ไม่เอา @Input value มาเขียนทับ Quill
   */
  onContentChange(value: string | null): void {
    const normalizedValue = value ?? '';

    this.editorValue = normalizedValue;
    this.lastEmittedValue = normalizedValue;

    this.valueChange.emit(normalizedValue);

    this.checkDeletedImages();
  }

  appendHtml(html: string): boolean {
    if (!this.quill) return false;

    const editor = this.quill;

    const sanitizedHtml = DOMPurify.sanitize(html);
    const preparedHtml = this.preserveHtmlSpaces(sanitizedHtml);

    const content = editor.clipboard.convert({
      html: preparedHtml,
    });

    let insertIndex = Math.max(0, editor.getLength() - 1);

    if (insertIndex > 0) {
      editor.insertText(insertIndex, '\n', 'user');
      insertIndex++;
    }

    editor.updateContents(new Delta().retain(insertIndex).concat(content), 'user');

    const end = Math.max(0, editor.getLength() - 1);

    editor.focus({ preventScroll: true });
    editor.setSelection(end, 0, 'silent');

    return true;
  }

  private preserveSpacesForOutput(html: string): string {
    const template = document.createElement('template');
    template.innerHTML = html;

    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);

    let node: Node | null;

    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';

      if (!text) continue;

      // ไม่ยุ่งกับ whitespace ที่ใช้จัด format HTML ระหว่าง tags
      if (!text.trim() && /[\r\n]/.test(text)) {
        continue;
      }

      node.textContent = text
        // tab -> NBSP 4 ตัว
        .replace(/\t/g, '\u00A0'.repeat(4))

        // space ที่ต้นบรรทัด
        .replace(/^ +/, (spaces) => '\u00A0'.repeat(spaces.length))

        // space 2 ตัวขึ้นไป
        .replace(/ {2,}/g, (spaces) => '\u00A0'.repeat(spaces.length));
    }

    return template.innerHTML.replace(/\u00A0/g, '&nbsp;');
  }

  getOutputHtml(): string {
    const html = this.quill ? this.quill.root.innerHTML : this.editorValue;

    return this.preserveSpacesForOutput(html);
  }

  private preserveDeltaSpaces(text: string): string {
    return (
      text
        // Tab จริง -> NBSP 4 ตัว
        .replace(/\t/g, '\u00A0'.repeat(4))

        // space หลายตัวติดกัน -> NBSP
        .replace(/ {2,}/g, (spaces) => '\u00A0'.repeat(spaces.length))

        // space ต้นบรรทัด -> NBSP
        .replace(
          /(^|\n)( +)/g,
          (_, prefix: string, spaces: string) => prefix + '\u00A0'.repeat(spaces.length),
        )
    );
  }

  private getCurrentHtml(): string {
    if (!this.quill) {
      return this.editorValue;
    }

    return this.quill.root.innerHTML.replace(/\u00A0/g, '&nbsp;');
  }

  private emitCurrentHtml(): void {
    const html = this.getCurrentHtml();

    this.editorValue = html;
    this.lastEmittedValue = html;

    this.valueChange.emit(html);
  }
  private uploadEditorImage(file: File): void {
    this.textEditorImageService.uploadTemp(file).subscribe({
      next: (res) => {
        if (!res.success) {
          return;
        }

        const imageUrl = res.data.filePath;

        this.uploadedImages.add(imageUrl);

        this.emitImagePaths();

        const range = this.quill.getSelection(true);

        const index = range ? range.index : Math.max(0, this.quill.getLength() - 1);

        this.quill.insertEmbed(index, 'image', imageUrl, 'user');

        const images = this.quill.root.querySelectorAll('img');

        images.forEach((img: HTMLImageElement) => {
          if (img.src.startsWith('data:image/')) {
            img.remove();
          }
        });

        this.quill.setSelection(index + 1, 0, 'silent');
      },

      error: (err) => {
        console.error(err);

        this.swalService.warning('ไม่สามารถอัปโหลดรูปภาพได้');
      },
    });
  }

  private checkDeletedImages(): void {
    if (!this.quill) {
      return;
    }

    const currentImages = new Set(
      Array.from(this.quill.root.querySelectorAll('img') as NodeListOf<HTMLImageElement>).map(
        (img) => img.src,
      ),
    );

    const deletedImages: string[] = [];

    this.uploadedImages.forEach((url) => {
      if (!currentImages.has(url)) {
        deletedImages.push(url);
      }
    });

    if (!deletedImages.length) {
      return;
    }

    this.textEditorImageService
      .deleteTemp({
        image_paths: deletedImages,
      })
      .subscribe({
        next: () => {
          deletedImages.forEach((url) => {
            this.uploadedImages.delete(url);
          });

          this.emitImagePaths();
        },

        error: (err) => {
          console.error(err);
        },
      });
  }

  confirmImages(): Observable<string> {
    const rawHtml = this.quill ? this.quill.root.innerHTML : this.editorValue;

    const currentHtml = this.preserveSpacesForOutput(rawHtml);

    if (this.uploadedImages.size === 0) {
      return of(currentHtml);
    }

    return this.textEditorImageService
      .confirm({
        image_paths: [...this.uploadedImages],
      })
      .pipe(
        map((res) => {
          let html = currentHtml;

          res.data.forEach((item: any) => {
            html = html.replaceAll(item.tempPath, item.fileUrl);
          });

          return html;
        }),
      );
  }

  clear(): void {
    this.clearImages();

    this.uploadedImages.clear();

    this.editorValue = '';
    this.lastEmittedValue = '';

    if (this.quill) {
      this.quill.setText('', 'silent');
    }

    this.valueChange.emit('');
  }

  clearImages(): void {
    if (this.uploadedImages.size === 0) {
      return;
    }

    const imagePaths = [...this.uploadedImages];

    this.textEditorImageService
      .deleteTemp({
        image_paths: imagePaths,
      })
      .subscribe({
        next: () => {
          this.uploadedImages.clear();

          this.emitImagePaths();
        },

        error: (err) => {
          console.error(err);
        },
      });
  }

  private emitImagePaths(): void {
    this.imagePathsChange.emit([...this.uploadedImages]);
  }
}
