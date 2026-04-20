import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, signal, inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { ToastService } from '../../services/toast';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { filter } from 'rxjs';

export type TicketType = 'repair' | 'service';

export interface MockRequestData {
  requestNo: string;
  requestDate: string;
  requestFor: string;
  phone: string;
  ticketType: TicketType;
  detail?: string;
  attachments?: string[];

  // Fields for 'service' (ขอใช้บริการ)
  requestCategory?: string;
  basicSystems?: string[];
  specificSystems?: string[];

  // Fields for 'repair' (แจ้งซ่อม)
  device?: string;
  brand?: string;
  model?: string;
  symptom?: string;
}

// Mock data - replace with API call later
// http://localhost:4200/it-request-signature?requestNo=REQ-SR-2603-0004
// http://localhost:4200/it-request-signature?requestNo=REQ-RP-2603-0006
// http://localhost:4200/it-request-signature // เป็นขแใช้บริการ

const MOCK_REQUESTS: MockRequestData[] = [
  {
    requestNo: 'REQ-SR-2603-0004',
    requestDate: '26/03/2025',
    requestFor: 'นาง สมบูรณ์ หูนสุข',
    phone: '081-000-0000',
    ticketType: 'service',
    requestCategory: 'Account & Password (ขอรีเซ็ตรหัสผ่าน)',
    detail: 'ขอรีเซ็ตรหัสผ่านเนื่องจากลืมรหัสผ่าน ไม่ได้เข้าใช้งานนาน',
    basicSystems: ['ห้องประชุม'],
    specificSystems: ['Oracle', 'BMS'],
  },
  {
    requestNo: 'REQ-RP-2603-0006',
    requestDate: '26/03/2025',
    requestFor: 'น.ส. แจ้ง ซ่อม',
    phone: '089-999-9999',
    ticketType: 'repair',
    device: 'Notebook',
    brand: 'Dell',
    model: 'Latitude 3420',
    symptom: 'จอฟ้า เครื่องเปิดไม่ติด',
    attachments: ['bsod.jpg']
  }
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
  requestData = signal<any | null>(null);
  isNotFound = signal<boolean>(false);
  hasSignature = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  signerName = signal<string>('');
  signatureImage = signal<string | null>(null);

  private ctx: CanvasRenderingContext2D | null = null; private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  private pendingSignature: string | null = null;
  private canvasReady = false;
  private ticketLoaded = false;
  private resizeHandler = () => this.onResize();

  ticketNumber: string = "";
  currentApprover = signal<string>('');
  constructor(
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef,
  ) {

  }

  ngOnInit() {
    this.ticketNumber = this.route.snapshot.queryParamMap.get('ticket') || '';
    console.log('ticketNumber:', this.ticketNumber);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCanvas();
      window.addEventListener('resize', this.resizeHandler);

      if (this.ticketNumber) {
        this.loadTicket(this.ticketNumber);
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.themeObserver?.disconnect();
  }

  private themeObserver?: MutationObserver;

  private initCanvas() {
    const canvas = this.ensureCanvasContext();
    if (!canvas) {
      return;
    }

    this.resizeCanvas();

    this.themeObserver = new MutationObserver(() => {
      this.setupCtxStyle();
      this.drawSignatureFromPending();
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  loadTicket(ticketNumber: string) {
    this.ticketService.getTicket(ticketNumber)
      .subscribe({
        next: (ticket) => {
          console.log('ticket : ', ticket);

          if (ticket.NameApprover) {
            this.signerName.set(ticket.NameApprover);
          }

          this.requestNo.set(ticket.ticket_number);

          const data: any = {
            requestNo: ticket.ticket_number,
            requestDate: ticket.created_at,
            requester: ticket.RequesterName,
            phone: ticket.contact_phone,
            openFor: ticket.openFor,
            detail: this.formatDetail(ticket.Tdescription),
            ticketType: ticket.code === 'repair' ? 'repair' : 'service',
            device: ticket.DeviceNameTH,
            brand: ticket.brand,
            model: ticket.model,
            symptom: ticket.Tdescription,
            requestCategory: ticket.TicketTypeName,
            basicSystems: ticket.basic,
            specificSystems: ticket.specific,
            attachments: ticket.attachments?.map((a: any) => a.file_name)
          };

          this.requestData.set(data);
          this.cdr.detectChanges();

          if (ticket.APSignature) {
            this.pendingSignature = ticket.APSignature;
            this.signatureImage.set(ticket.APSignature);

            setTimeout(() => {
              this.drawSignatureFromPending();
            }, 0);
          } else {
            this.pendingSignature = null;
            this.signatureImage.set(null);
            this.hasSignature.set(false);
            setTimeout(() => {
              this.initCanvas();
            }, 0);
          }
        },
        error: () => {
          this.isNotFound.set(true);
        }
      });
  }

  formatDetail(text: string) {
    return text ? text.replace(/\n/g, '<br>') : '-';
  }

  private resizeCanvas() {
    const canvas = this.ensureCanvasContext();
    if (!canvas || !this.ctx) return;

    canvas.width = canvas.offsetWidth || 600;
    canvas.height = canvas.offsetHeight || 200;

    this.setupCtxStyle();
    this.fillCanvasBg();
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
    if (!this.ctx) return;

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
    if (!this.ctx) return;
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
    if (!this.ctx) return;
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
    if (!this.ctx) return;
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

  editAction() {
    // TODO: Navigate back to edit the IT request
    this.toastService.info('ฟังก์ชันแก้ไขกำลังอยู่ในระหว่างพัฒนา');
  }

  private redrawSignature(retry = 0) {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx || !this.pendingSignature) {
      if (retry < 10) {
        setTimeout(() => this.redrawSignature(retry + 1), 100);
      }
      return;
    }

    const width = canvas.offsetWidth || 600;
    const height = canvas.offsetHeight || 200;

    canvas.width = width;
    canvas.height = height;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.fillCanvasBg();
    this.setupCtxStyle();

    const img = new Image();
    img.onload = () => {
      const currentCanvas = this.canvasRef?.nativeElement;
      if (!currentCanvas || !this.ctx) return;

      this.ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      this.fillCanvasBg();
      this.ctx.drawImage(img, 0, 0, currentCanvas.width, currentCanvas.height);
      this.hasSignature.set(true);
    };

    img.onerror = () => {
      console.error('signature image load error');
    };

    img.src = this.pendingSignature.startsWith('data:')
      ? this.pendingSignature
      : `data:image/png;base64,${this.pendingSignature}`;
  }

  private drawSignatureFromPending(retry = 0) {
    const canvas = this.ensureCanvasContext();

    if (!canvas || !this.ctx || !this.pendingSignature) {
      console.log('draw skipped', {
        hasCanvas: !!canvas,
        hasCtx: !!this.ctx,
        hasPending: !!this.pendingSignature
      });

      if (retry < 10) {
        setTimeout(() => this.drawSignatureFromPending(retry + 1), 100);
      }
      return;
    }

    canvas.width = canvas.offsetWidth || 600;
    canvas.height = canvas.offsetHeight || 200;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.fillCanvasBg();
    this.setupCtxStyle();

    const img = new Image();
    img.onload = () => {
      const latestCanvas = this.ensureCanvasContext();
      if (!latestCanvas || !this.ctx) return;

      this.ctx.clearRect(0, 0, latestCanvas.width, latestCanvas.height);
      this.fillCanvasBg();
      this.ctx.drawImage(img, 0, 0, latestCanvas.width, latestCanvas.height);
      this.hasSignature.set(true);

      console.log('signature drawn OK');
    };

    img.onerror = () => {
      console.error('signature image load error');
    };

    img.src = this.pendingSignature.startsWith('data:')
      ? this.pendingSignature
      : `data:image/png;base64,${this.pendingSignature}`;
  }

  private ensureCanvasContext(): HTMLCanvasElement | null {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return null;

    if (!this.ctx) {
      this.ctx = canvas.getContext('2d');
    }

    return this.ctx ? canvas : null;
  }
}
