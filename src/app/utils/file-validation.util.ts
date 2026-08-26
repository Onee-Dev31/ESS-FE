export interface FileValidationConfig {
  maxFiles: number;
  maxSizeMB: number;
  allowedTypes: readonly string[];
  allowedExtensions: readonly string[];
}

export interface FileValidationResult {
  validFiles: File[];
  errors: string[];
}

export function validateFiles(
  files: FileList | File[],
  config: FileValidationConfig,
  currentFileCount = 0,
): FileValidationResult {
  const validFiles: File[] = [];
  const errors: string[] = [];

  for (const file of Array.from(files)) {
    const reasons: string[] = [];

    if (currentFileCount + validFiles.length >= config.maxFiles) {
      reasons.push(`เกินจำนวนสูงสุด ${config.maxFiles} ไฟล์`);
    }

    if (file.size > config.maxSizeMB * 1024 * 1024) {
      reasons.push(`ขนาดเกิน ${config.maxSizeMB} MB`);
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (
      !config.allowedTypes.includes(file.type.toLowerCase()) ||
      !config.allowedExtensions.includes(extension)
    ) {
      reasons.push('ประเภทไฟล์ไม่รองรับ');
    }

    if (reasons.length) {
      errors.push(`${file.name} (${reasons.join(', ')})`);
    } else {
      validFiles.push(file);
    }
  }

  return { validFiles, errors };
}
