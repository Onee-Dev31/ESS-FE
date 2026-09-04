import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import {
  formatPhoneNumber,
  sanitizeEnglishName,
  sanitizeThaiName,
} from '../utils/form-validation.util';

function applySanitizedValue(
  input: HTMLInputElement,
  control: NgControl | null,
  sanitizer: (value: string) => string,
): void {
  const sanitized = sanitizer(input.value);
  if (sanitized === input.value) return;

  const cursor = input.selectionStart ?? sanitized.length;
  const removedBeforeCursor = input.value.slice(0, cursor).length - sanitizer(input.value.slice(0, cursor)).length;

  input.value = sanitized;
  control?.control?.setValue(sanitized, { emitEvent: false });

  queueMicrotask(() => {
    const nextCursor = Math.max(0, cursor - removedBeforeCursor);
    input.setSelectionRange(nextCursor, nextCursor);
  });
}

@Directive({
  selector: 'input[appThaiOnly]',
  standalone: true,
})
export class ThaiOnlyDirective {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input')
  onInput(): void {
    applySanitizedValue(this.element.nativeElement, this.control, sanitizeThaiName);
  }
}

@Directive({
  selector: 'input[appEnglishOnly]',
  standalone: true,
})
export class EnglishOnlyDirective {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input')
  onInput(): void {
    applySanitizedValue(this.element.nativeElement, this.control, sanitizeEnglishName);
  }
}

@Directive({
  selector: 'input[appPhoneNumber]',
  standalone: true,
})
export class PhoneNumberDirective {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input')
  onInput(): void {
    const input = this.element.nativeElement;
    const formatted = formatPhoneNumber(input.value);
    if (formatted === input.value) return;

    input.value = formatted;
    this.control?.control?.setValue(formatted, { emitEvent: false });
    queueMicrotask(() => input.setSelectionRange(formatted.length, formatted.length));
  }
}

@Directive({
  selector: 'input[appNumbersOnly]',
  standalone: true,
})
export class NumbersOnlyDirective {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input')
  onInput(): void {
    const input = this.element.nativeElement;
    const digits = input.value.replace(/\D/g, '');
    if (digits === input.value) return;

    input.value = digits;
    this.control?.control?.setValue(digits, { emitEvent: false });
    queueMicrotask(() => input.setSelectionRange(digits.length, digits.length));
  }
}
