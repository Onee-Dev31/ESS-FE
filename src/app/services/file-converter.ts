import { Injectable } from '@angular/core';
import dayjs from 'dayjs';
import { environment } from '../../environments/environment';

export interface ConvertedFile {
  name: string;
  file: File;
  description: string;

  fileId?: string;
  fieldId?: string;

  uploadedByAduser?: string;
  createdDate?: string;

  filePath?: string;
  size?: number;
  type?: string;

  // เผื่อ backend เพิ่ม field
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class FileConverterService {
  private readonly FILE_URL = environment.file_url;

  constructor() {}

  // แปลงไฟล์เดียว
  async convertUrlToFile(fileData: any): Promise<ConvertedFile> {
    const response = await fetch(fileData.FILE_DIR || fileData.file_url);
    if (!response.ok)
      throw new Error('Failed to fetch file: ' + (fileData.FILE_NAME || fileData.file_name));

    const blob = await response.blob();
    const file = new File([blob], fileData.FILE_NAME || fileData.file_name, {
      type: fileData.FILE_TYPE || fileData.file_type,
    });

    console.log('fileData', fileData);
    return {
      fieldId: fileData.FileID || fileData.attachment_id,
      name: fileData.FILE_NAME || fileData.file_name,
      file: file,
      description: fileData.DESCRIPTION || fileData.file_description || '',
      uploadedByAduser: fileData.uploadedByaAduser,
      createdDate: fileData.created_at,
      filePath: fileData.file_path || fileData.file_url,
      size: fileData.file_size,
      type: fileData.file_type,
      ...fileData,
    };
  }

  // แปลงหลายไฟล์
  async convertUrlsToFiles(fileArray: any[]): Promise<any[]> {
    if (!fileArray?.length) return [];
    return await Promise.all(fileArray.map((f) => this.convertUrlToFile(f)));
  }

  buildPreviewFile(file: any) {
    console.log(file);
    let url = file.fileUrl || file.filePath || file.url;

    if (!url) {
      const actualFile =
        file instanceof File ? file : file?.file instanceof File ? file.file : null;

      if (actualFile) {
        url = URL.createObjectURL(actualFile);
      }
    }

    console.log(url);
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = this.FILE_URL + (url.startsWith('/') ? '' : '/') + url;
    }

    const date =
      file.createdDate || file.createdAt
        ? dayjs(file.createdDate || file.createdAt).isValid()
          ? dayjs(file.createdDate || file.createdAt).format('DD/MM/YYYY HH:mm')
          : ''
        : '';

    return {
      fileName: file.fileName || file.name || 'unknown',
      date: date,
      url: url || '',
      type: file.fileType || file.type || file.file_type || '',
    };
  }

  buildPreviewFiles(files: any[]): any[] {
    if (!files?.length) return [];
    return files.map((f) => this.buildPreviewFile(f));
  }
}
