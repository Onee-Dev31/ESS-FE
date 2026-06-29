import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { TextEditorImageManager } from './image-manager';
import Quill from 'quill';
import { TextEditorImageService } from '../../../services/text-editor-image.service';
import { SwalService } from '../../../services/swal.service';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './text-editor.html',
  styleUrl: './text-editor.scss',
})
export class TextEditorComponent {
  @Input() value = '';

  @Input() placeholder = 'กรอกรายละเอียด...';

  @Output() valueChange = new EventEmitter<string>();

  @Output() imagePathsChange = new EventEmitter<string[]>();

  quill: any;

  private imageManager!: TextEditorImageManager;

  private uploadedImages = new Set<string>();

  quillConfig = {
    toolbar: [['bold', 'italic'], ['image']],
  };

  private swalService = inject(SwalService);
  private textEditorImageService = inject(TextEditorImageService);

  onEditorCreated(quill: Quill) {
    this.quill = quill;

    this.imageManager = new TextEditorImageManager(quill, (file) => this.uploadEditorImage(file));

    this.imageManager.attach();
  }

  private uploadEditorImage(file: File) {
    this.textEditorImageService.uploadTemp(file).subscribe({
      next: (res) => {
        console.log(res);

        if (!res.success) return;

        const imageUrl = res.data.filePath;

        this.uploadedImages.add(imageUrl);

        this.emitImagePaths();

        const range = this.quill.getSelection(true);

        this.quill.insertEmbed(
          range ? range.index : this.quill.getLength(),
          'image',
          imageUrl,
          'user',
        );

        const images = this.quill.root.querySelectorAll('img');

        images.forEach((img: HTMLImageElement) => {
          if (img.src.startsWith('data:image/')) {
            img.remove();
          }
        });

        this.quill.setSelection((range ? range.index : this.quill.getLength()) + 1);

        console.log(this.quill.root.innerHTML);
      },
      error: (err) => {
        console.error(err);

        this.swalService.warning('ไม่สามารถอัปโหลดรูปภาพได้');
      },
    });
  }

  private checkDeletedImages() {
    if (!this.quill) return;

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

    if (!deletedImages.length) return;

    console.log('Deleted Images', deletedImages);

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

          console.log('Delete success');
        },
        error: (err) => {
          console.error(err);
        },
      });
  }

  onContentChange(value: string) {
    this.value = value;
    this.valueChange.emit(value);

    this.checkDeletedImages();
  }

  private emitImagePaths() {
    this.imagePathsChange.emit([...this.uploadedImages]);
  }
}
