import dayjs from 'dayjs';

export const FORM_VALIDATION_PATTERNS = {
  thaiName: /^[\u0E00-\u0E7F]+(?:[ .'-][\u0E00-\u0E7F]+)*$/,
  englishName: /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^\d{3}-\d{3}-\d{4}$/,
} as const;

export function sanitizeThaiName(value: string): string {
  return value.replace(/[^\u0E00-\u0E7F .'-]/g, '');
}

export function sanitizeEnglishName(value: string): string {
  return value.replace(/[^A-Za-z .'-]/g, '');
}

export function formatPhoneNumber(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  allowSameDay = true,
): boolean {
  if (!startDate || !endDate) return true;

  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid()) return false;

  return start.isBefore(end, 'day') || (allowSameDay && start.isSame(end, 'day'));
}

export function isDateAfter(
  date: Date | string,
  maximumDate: Date | string | null | undefined,
): boolean {
  return !!maximumDate && dayjs(date).isAfter(dayjs(maximumDate), 'day');
}

export function isDateBefore(
  date: Date | string,
  minimumDate: Date | string | null | undefined,
): boolean {
  return !!minimumDate && dayjs(date).isBefore(dayjs(minimumDate), 'day');
}
