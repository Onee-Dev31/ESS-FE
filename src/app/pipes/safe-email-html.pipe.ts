import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import DOMPurify from 'dompurify';

@Pipe({
  name: 'safeEmailHtml',
  standalone: true,
  pure: true,
})
export class SafeEmailHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: unknown): SafeHtml {
    if (typeof value !== 'string' || !value) return '';

    const cleanHtml = DOMPurify.sanitize(this.normalizeEmailUrls(value), {
      USE_PROFILES: { html: true },
      FORBID_TAGS: [
        'script',
        'style',
        'iframe',
        'object',
        'embed',
        'form',
        'input',
        'button',
        'textarea',
        'select',
        'meta',
        'link',
        'base',
      ],
      ADD_ATTR: ['target', 'referrerpolicy', 'loading'],
      ALLOW_DATA_ATTR: false,
    });

    // DOMPurify removes executable markup first. Trusting only its result keeps
    // Gmail's safe inline formatting from being stripped by Angular a second time.
    return this.sanitizer.bypassSecurityTrustHtml(cleanHtml);
  }

  private normalizeEmailUrls(html: string): string {
    return html
      .replace(
        /<img\b[^>]*\bsrc\s*=\s*(["'])[^"']*mail\.google\.com\/mail\/[^"']*\/images\/cleardot\.gif[^"']*\1[^>]*>/gi,
        '',
      )
      .replace(
        /\b(src|href)\s*=\s*(["'])\[(https?:\/\/[^\]]+)\]\((https?:\/\/[^)]+)\)\2/gi,
        (_match, attribute: string, quote: string, _labelUrl: string, targetUrl: string) =>
          `${attribute}=${quote}${targetUrl}${quote}`,
      )
      .replace(/\btarget=(["'])\\_blank\1/gi, 'target=$1_blank$1')
      .replace(
        /<img\b(?![^>]*\breferrerpolicy\s*=)/gi,
        '<img referrerpolicy="no-referrer" loading="lazy"',
      );
  }
}
