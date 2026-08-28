import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export type ModalShellSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalShellHeader = 'plain' | 'primary';
export type ModalShellFooterAlign = 'start' | 'center' | 'end' | 'between';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.scss',
})
export class ModalShellComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() size: ModalShellSize = 'md';
  @Input() width = '';
  @Input() headerStyle: ModalShellHeader = 'plain';
  @Input() footerAlign: ModalShellFooterAlign = 'end';
  @Input() showClose = true;
  @Input() showFooter = true;
  @Input() padded = true;
  @Input() mobileFullscreen = false;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Output() closeModal = new EventEmitter<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdrop) this.closeModal.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.closeOnEscape) this.closeModal.emit();
  }
}
