import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TextEditorImageService {
  private http = inject(HttpClient);
  private baseUrl = environment.api_url;

  uploadTemp(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(`${this.baseUrl}/text-editor-images/temp`, formData);
  }

  deleteTemp(body: { image_paths: string[] }) {
    return this.http.delete<any>(`${this.baseUrl}/text-editor-images/temp`, {
      body,
    });
  }

  confirm(body: { image_paths: string[] }) {
    return this.http.post<any>(`${this.baseUrl}/text-editor-images/confirm`, body);
  }
}
