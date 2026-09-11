import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appImageErrorFallback]',
  standalone: true,
})
export class ImageErrorFallbackDirective {
  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const onImageError = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !host.contains(image)) return;

      const fileName = this.getFileName(image);
      const message = fileName ? `เปิดรูปภาพไม่ได้: ${fileName}` : 'เปิดรูปภาพไม่ได้';
      const placeholder = host.ownerDocument.createElement('span');
      placeholder.className = 'image-error-placeholder';
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', message);

      const icon = host.ownerDocument.createElement('i');
      icon.className = 'fa-regular fa-image';
      icon.setAttribute('aria-hidden', 'true');
      const label = host.ownerDocument.createElement('span');
      label.textContent = message;
      placeholder.append(icon, label);
      image.replaceWith(placeholder);
    };

    // Image errors do not bubble; capture also handles images inserted by innerHTML.
    host.addEventListener('error', onImageError, true);
    inject(DestroyRef).onDestroy(() => host.removeEventListener('error', onImageError, true));
  }

  private getFileName(image: HTMLImageElement): string {
    const source = image.currentSrc || image.getAttribute('src');
    if (source) {
      try {
        const url = new URL(source, image.ownerDocument.baseURI);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const name = decodeURIComponent(url.pathname.split('/').pop() ?? '');
          if (/\.[a-z0-9]{1,10}$/i.test(name)) return name;
        }
      } catch {
        // Invalid URLs or encoded names can still have a useful alt label.
      }
    }
    return image.alt.trim();
  }
}
