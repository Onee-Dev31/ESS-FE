export class PhoneUtil {
  // static formatPhoneNumber(value: string): string {
  //   if (!value) return '';

  //   const cleaned = value.replace(/\D/g, '');

  //   const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

  //   if (match) {
  //     return `${match[1]}-${match[2]}-${match[3]}`;
  //   }

  //   if (cleaned.length > 6) {
  //     return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  //   } else if (cleaned.length > 3) {
  //     return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}`;
  //   }

  //   return cleaned;
  // }
  static formatPhoneNumber(value: string): string {
    if (!value) return '';
    return value.replace(/\D/g, '');
  }
}
