import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, signal, inject, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastService } from '../../services/toast';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-save-signature',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './save-signature.html',
  styleUrl: './save-signature.scss',
})
export class SaveSignature implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  signerName = signal<string>('');
  hasSignature = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isSaved = signal<boolean>(false);
  savedSignatureUrl = signal<string | null>(null);

  // from query param e.g. ?name=สมชาย
  prefillName = signal<string>('');

  // ข้อมูล login จาก AuthService
  loginUser = computed(() => this.authService.userData());
  loginNameTH = computed(() => {
    const u = this.authService.userData();
    if (!u) return '-';
    return [u.NAMFIRSTT, u.NAMLASTT].filter(Boolean).join(' ') || '-';
  });
  loginNameEN = computed(() => {
    const u = this.authService.userData();
    if (!u) return '-';
    return [u.NAMFIRSTE, u.NAMLASTE].filter(Boolean).join(' ') || '-';
  });

  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private themeObserver?: MutationObserver;

  ngOnInit() {
    const nameFromParam = this.route.snapshot.queryParamMap.get('name') ?? '';
    const userData = this.authService.userData();

    const nameFromLogin = userData?.USR_FNAME
      ? `${userData.USR_FNAME} ${userData.USR_LNAME ?? ''}`.trim()
      : (this.authService.currentUser() ?? '');

    const resolvedName = nameFromParam || nameFromLogin;
    this.prefillName.set(resolvedName);
    this.signerName.set(resolvedName);
  }

  ngAfterViewInit() {
    this.initCanvas();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.themeObserver?.disconnect();
  }

  private initCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d')!;
    this.resizeCanvas();
    this.fillCanvasBg();
    this.setupCtxStyle();

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
    this.isSaved.set(false);
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearSignature() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.fillCanvasBg();
    this.hasSignature.set(false);
    this.isSaved.set(false);
    this.savedSignatureUrl.set(null);
  }

  editSignature() {
    this.isSaved.set(false);
    this.savedSignatureUrl.set(null);
  }

  editAction() {
    this.toastService.info('ฟังก์ชันแก้ไขกำลังอยู่ในระหว่างพัฒนา');
  }

  saveSignature() {
    if (!this.hasSignature()) {
      this.toastService.warning('กรุณาเซนชื่อก่อนบันทึก');
      return;
    }
    this.isSaving.set(true);
    const base64 = this.canvasRef.nativeElement.toDataURL('image/png');

    // TODO: Call API to save signature
    console.log('[SaveSignature] name:', this.signerName());
    console.log('[SaveSignature] signature (base64):', base64.substring(0, 60) + '...');

    setTimeout(() => {
      this.savedSignatureUrl.set(base64);
      this.isSaving.set(false);
      this.isSaved.set(true);
      this.toastService.success('บันทึกลายเซนต์เรียบร้อยแล้ว');
    }, 600);
  }
}
