import { Component, input, output } from '@angular/core';

export interface AttachmentUploadConfig {
  maxFiles: number;
  maxSizeMB: number;
  allowedExtensions: readonly string[];
}

@Component({
  selector: 'app-attachment-upload',
  standalone: true,
  templateUrl: './attachment-upload.html',
  styleUrl: './attachment-upload.scss',
})
export class AttachmentUploadComponent {
  readonly attachments = input.required<readonly { name: string }[]>();
  readonly config = input.required<AttachmentUploadConfig>();
  readonly fileSelected = output<Event>();
  readonly filesDropped = output<DragEvent>();
  readonly previewRequested = output<number>();
  readonly removeRequested = output<number>();
}
