import Quill from 'quill';

export class TextEditorImageManager {
  constructor(
    private quill: Quill,
    private uploadImage: (file: File) => void,
  ) {}

  attach() {
    const toolbar = this.quill.getModule('toolbar') as any;

    toolbar.addHandler('image', () => this.selectImage());

    this.registerPaste();
  }

  private registerPaste() {
    this.quill.root.addEventListener(
      'paste',
      this.onPaste,
      true, // capture เพื่อดักก่อน Quill
    );
  }

  private selectImage() {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const file = input.files?.[0];

      if (file) {
        this.uploadImage(file);
      }
    };

    input.click();
  }

  private onPaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;

    if (!items) return;

    const image = Array.from(items).find((i) => i.type.startsWith('image/'));

    if (!image) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const file = image.getAsFile();

    if (!file) return;

    this.uploadImage(file);
  };

  destroy() {
    this.quill.root.removeEventListener('paste', this.onPaste, true);
  }

  //   onEditorCreated(quill: Quill) {
  //     this.quill = quill;

  //     this.imageManager = new TextEditorImageManager(quill, (file) => this.uploadEditorImage(file));

  //     this.imageManager.attach();
  //   }
}
