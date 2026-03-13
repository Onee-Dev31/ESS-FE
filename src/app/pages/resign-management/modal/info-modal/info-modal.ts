import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-info-modal',
  imports: [],
  templateUrl: './info-modal.html',
  styleUrl: './info-modal.scss',
})
export class InfoModal {

  @Input() emp: any;
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();


  close() {
    this.closeModal.emit();
  }
}
