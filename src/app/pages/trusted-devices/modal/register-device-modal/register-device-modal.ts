import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RegisteredDeviceDraft {
  name: string;
  type: string;
  note?: string;
}

@Component({
  selector: 'app-register-device-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-device-modal.html',
  styleUrl: './register-device-modal.scss',
})
export class RegisterDeviceModalComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() registered = new EventEmitter<RegisteredDeviceDraft>();

  step = signal<1 | 2 | 3>(1);
  deviceName = '';
  deviceType = '';
  deviceNote = '';

  createQrCode(): void {
    if (!this.deviceName.trim() || !this.deviceType) return;
    this.step.set(2);
  }

  completeRegistration(): void {
    this.registered.emit({
      name: this.deviceName.trim(),
      type: this.deviceType,
      note: this.deviceNote.trim() || undefined,
    });
    this.step.set(3);
  }
}
