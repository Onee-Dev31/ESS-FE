import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';

export interface RegisteredDeviceDraft {
  name: string;
  type: string;
  note?: string;
}

@Component({
  selector: 'app-register-device-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './register-device-modal.html',
  styleUrl: './register-device-modal.scss',
})
export class RegisterDeviceModalComponent implements OnDestroy {
  @Output() closed = new EventEmitter<void>();
  @Output() registered = new EventEmitter<RegisteredDeviceDraft>();

  step = signal<1 | 2 | 3>(1);
  deviceName = '';
  deviceType = '';
  deviceNote = '';
  qrUrl = signal('');
  secondsRemaining = signal(58);
  qrExpired = signal(false);
  private countdownId?: ReturnType<typeof setInterval>;

  createQrCode(): void {
    if (!this.deviceName.trim() || !this.deviceType) return;
    this.step.set(2);
    this.generateQrCode();
  }

  generateQrCode(): void {
    this.stopCountdown();
    const token = crypto.randomUUID();
    const qrUrl = new URL('/device-register/confirm', window.location.origin);
    qrUrl.searchParams.set('token', token);
    this.qrUrl.set(qrUrl.toString());
    this.secondsRemaining.set(58);
    this.qrExpired.set(false);
    this.countdownId = setInterval(() => {
      const next = this.secondsRemaining() - 1;
      this.secondsRemaining.set(Math.max(next, 0));
      if (next <= 0) {
        this.qrExpired.set(true);
        this.stopCountdown();
      }
    }, 1000);
  }

  get countdownDisplay(): string {
    return `00 : ${this.secondsRemaining().toString().padStart(2, '0')}`;
  }

  completeRegistration(): void {
    if (this.qrExpired()) return;
    this.stopCountdown();
    this.registered.emit({
      name: this.deviceName.trim(),
      type: this.deviceType,
      note: this.deviceNote.trim() || undefined,
    });
    this.step.set(3);
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private stopCountdown(): void {
    if (this.countdownId) clearInterval(this.countdownId);
    this.countdownId = undefined;
  }
}
