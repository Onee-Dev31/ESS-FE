import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastService } from '../../services/toast';

interface MockRequestData {
  requestNo: string;
  requestDate: string;
  requestFor: string;
  phone: string;
  requestCategory: string;
  basicSystems: string[];
  specificSystems: string[];
}

// Mock data - replace with API call later
const MOCK_REQUESTS: MockRequestData[] = [
  {
    requestNo: 'REQ-IT-2603-0004',
    requestDate: '26/03/2025',
    requestFor: 'นาง สมบูรณ์ หูนสุข',
    phone: '-',
    requestCategory: 'Account & Password (ขอรีเซ็ตรหัสผ่าน)',
    basicSystems: ['ห้องประชุม'],
    specificSystems: ['Oracle', 'BMS'],
  },
  {
    requestNo: 'REQ-IT-2603-0005',
    requestDate: '26/03/2025',
    requestFor: 'นาย ทดสอบ ระบบ',
    phone: '081-234-5678',
    requestCategory: 'New Account (ขอสิทธิ์ระบบใหม่)',
    basicSystems: ['Email', 'เครื่องพิมพ์'],
    specificSystems: ['SAP'],
  },
];

@Component({
  selector: 'app-it-request-signature',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './it-request-signature.html',
  styleUrl: './it-request-signature.scss',
})
export class ItRequestSignature implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);

  requestNo = signal<string>('');
  requestData = signal<MockRequestData | null>(null);
  isNotFound = signal<boolean>(false);
  hasSignature = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  signerName = signal<string>('');

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  ngOnInit() {
    const no = this.route.snapshot.queryParamMap.get('requestNo') ?? '';
    this.requestNo.set(no);

    if (no) {
      const found = MOCK_REQUESTS.find(r => r.requestNo === no);
      if (found) {
        this.requestData.set(found);
      } else {
        // TODO: Call API here when ready
        // this.itRequestService.getByRequestNo(no).subscribe(...)
        this.isNotFound.set(true);
      }
    } else {
      // No requestNo param — show first mock for demo
      this.requestData.set(MOCK_REQUESTS[0]);
      this.requestNo.set(MOCK_REQUESTS[0].requestNo);
    }
  }

  ngAfterViewInit() {
    this.initCanvas();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.themeObserver?.disconnect();
  }

  private themeObserver?: MutationObserver;

  private initCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    this.fillCanvasBg();
    this.setupCtxStyle();

    // Watch for theme changes to update stroke color
    this.themeObserver = new MutationObserver(() => {
      this.setupCtxStyle();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  private resizeCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.setupCtxStyle();
    this.ctx.putImageData(imageData, 0, 0);
  }

  private getStrokeColor(): string {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? '#f1f5f9' : '#1e293b';
  }

  private fillCanvasBg() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private setupCtxStyle() {
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.getStrokeColor();
  }

  private onResize() {
    this.resizeCanvas();
  }

  private getPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (event instanceof TouchEvent) {
      const touch = event.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (event as MouseEvent).clientX - rect.left, y: (event as MouseEvent).clientY - rect.top };
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.isDrawing = true;
    // Re-read stroke color in case theme changed
    this.ctx.strokeStyle = this.getStrokeColor();
    const pos = this.getPosition(event);
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    event.preventDefault();
    const pos = this.getPosition(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.hasSignature.set(true);
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearSignature() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.fillCanvasBg();
    this.hasSignature.set(false);
  }

  getSignatureBase64(): string {
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }

  submit() {
    if (!this.hasSignature()) {
      this.toastService.warning('กรุณาเซนชื่อก่อนยืนยัน');
      return;
    }
    this.isSubmitting.set(true);
    const signatureBase64 = this.getSignatureBase64();

    // TODO: Call API to submit approval + signature
    console.log('[IT Signature] requestNo:', this.requestNo());
    console.log('[IT Signature] signature (base64):', signatureBase64.substring(0, 60) + '...');

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.toastService.success('บันทึกลายเซนต์และอนุมัติเรียบร้อยแล้ว');
    }, 800);
  }
}
