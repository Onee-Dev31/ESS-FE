import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { NzModalModule } from 'ng-zorro-antd/modal';
import { SignatureService } from '../../../services/signature.service';

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [CommonModule, NzModalModule],
  templateUrl: './signature-modal.html',
  styleUrl: './signature-modal.scss',
})
export class SignatureModal implements AfterViewInit {
  employee = input<any>();

  closed = output();

  @ViewChild('signatureCanvas')
  signatureCanvasRef!: ElementRef<HTMLCanvasElement>;

  hasSignature = signal(false);

  isDrawing = false;

  lastX = 0;
  lastY = 0;

  private signatureService = inject(SignatureService);

  constructor() {
    effect(() => {
      const emp = this.employee();

      if (emp?.empCode) {
        setTimeout(() => {
          this.loadSignature();
        }, 300);
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.resizeCanvas();
    });
  }

  close() {
    this.closed.emit();
  }

  // =========================================
  // LOAD SIGNATURE
  // =========================================

  loadSignature() {
    const empCode = this.employee()?.empCode;

    if (!empCode) return;

    this.signatureService.getEmployeeSignature(empCode).subscribe({
      next: (res) => {
        const base64 = res?.data?.Base64Signature;

        if (!base64) return;

        const img = new Image();

        img.onload = () => {
          const canvas = this.signatureCanvasRef.nativeElement;

          const ctx = canvas.getContext('2d');

          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = '#ffffff';

          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          this.hasSignature.set(true);
        };

        img.src = base64;
      },
      error: () => {
        console.log('no signature');
      },
    });
  }

  renderSignature(base64: string) {
    const canvas = this.signatureCanvasRef.nativeElement;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      this.hasSignature.set(true);
    };

    img.src = base64;
  }

  // =========================================
  // CANVAS
  // =========================================

  resizeCanvas() {
    if (!this.signatureCanvasRef) return;

    const canvas = this.signatureCanvasRef.nativeElement;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.scale(ratio, ratio);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;
  }

  private getPosition(event: MouseEvent | TouchEvent) {
    const canvas = this.signatureCanvasRef.nativeElement;

    const rect = canvas.getBoundingClientRect();

    if (event instanceof TouchEvent) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    event.preventDefault();

    const pos = this.getPosition(event);

    this.isDrawing = true;

    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;

    event.preventDefault();

    const canvas = this.signatureCanvasRef.nativeElement;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const pos = this.getPosition(event);

    ctx.beginPath();

    ctx.moveTo(this.lastX, this.lastY);

    ctx.lineTo(pos.x, pos.y);

    ctx.stroke();

    this.lastX = pos.x;
    this.lastY = pos.y;

    this.hasSignature.set(true);
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearSignature() {
    const canvas = this.signatureCanvasRef.nativeElement;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.hasSignature.set(false);
  }

  saveSignature() {
    const canvas = this.signatureCanvasRef.nativeElement;

    const base64 = canvas.toDataURL('image/png');

    const payload = {
      codeEmpId: this.employee()?.empCode,
      base64Signature: base64,
      isActive: true,
    };

    this.signatureService.saveEmployeeSignature(payload).subscribe({
      next: () => {
        console.log('saved');

        this.close();
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/no-profile.png';
  }
}
