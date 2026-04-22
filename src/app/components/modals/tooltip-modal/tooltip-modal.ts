import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tooltip-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooltip-modal.html',
  styleUrl: './tooltip-modal.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TooltipModalComponent {
  @Input() content: string = '';
  @Output() onClose = new EventEmitter<void>();

  close() {
    this.onClose.emit();
  }
}
