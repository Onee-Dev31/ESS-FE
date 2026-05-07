import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-example-service-request-modal',
  imports: [],
  templateUrl: './example-service-request-modal.html',
  styleUrl: './example-service-request-modal.scss',
})
export class ExampleServiceRequestModal {
  @Input() type: 1 | 2 = 1;
  @Output() onClose = new EventEmitter<void>();

  close() {
    this.onClose.emit();
  }
}
