import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar-preview-modal',
  imports: [],
  templateUrl: './avatar-preview-modal.html',
  styleUrl: './avatar-preview-modal.scss',
})
export class AvatarPreviewModal {
  @Input() src = '';
  @Input() name = '';

  isOpen = false;

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/user.png';
  }
}
