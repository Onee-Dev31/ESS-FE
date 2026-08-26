import type { FileValidationConfig } from '../utils/file-validation.util';

export const TIME_OFF_ATTACHMENT_FILE_CONFIG: FileValidationConfig = {
  maxFiles: 5,
  maxSizeMB: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
};

export const TIME_OFF_ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf';
