import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appOpenDescriptionImage]',
  standalone: true,
})
export class OpenDescriptionImageDirective {
  @HostListener('click', ['$event'])
  openImage(event: MouseEvent): void {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;

    const source = image.currentSrc || image.src;
    if (!source) return;

    const url = new URL(source, document.baseURI);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

    event.preventDefault();
    event.stopPropagation();
    window.open(url.href, '_blank', 'noopener,noreferrer');
  }
}
