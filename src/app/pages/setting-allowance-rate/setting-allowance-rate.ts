import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import {
  ClaimAllowanceRate,
  UpsertClaimAllowanceRatePayload,
} from '../../interfaces/allowance.interface';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ModalShellComponent } from '../../components/shared/modal-shell/modal-shell';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';

interface RateForm {
  rate_id?: number;
  min_hours: number;
  max_hours: number;
  rate_amount: number;
  description: string;
}

@Component({
  selector: 'app-setting-allowance-rate',
  imports: [
    FormsModule,
    DecimalPipe,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ModalShellComponent,
  ],
  templateUrl: './setting-allowance-rate.html',
  styleUrl: './setting-allowance-rate.scss',
})
export class SettingAllowanceRate implements OnInit {
  private readonly masterDataService = inject(MasterDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swalService = inject(SwalService);
  private readonly authService = inject(AuthService);

  readonly rates = signal<ClaimAllowanceRate[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly isConfirming = signal(false);
  readonly hasSubmitted = signal(false);
  readonly editingRateId = signal<number | null>(null);
  readonly deletingRateId = signal<number | null>(null);

  form: RateForm = this.createEmptyForm();

  ngOnInit(): void {
    this.loadRates();
  }

  loadRates(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.masterDataService
      .getClaimAllowanceRates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rates.set([...(data ?? [])].sort((a, b) => a.min_hours - b.min_hours));
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลอัตราเบี้ยเลี้ยงได้');
          this.isLoading.set(false);
        },
      });
  }

  openCreate(): void {
    this.editingRateId.set(null);
    this.hasSubmitted.set(false);
    this.form = this.createEmptyForm();
    this.isModalOpen.set(true);
  }

  openEdit(rate: ClaimAllowanceRate): void {
    this.editingRateId.set(rate.rate_id);
    this.hasSubmitted.set(false);
    this.form = {
      rate_id: rate.rate_id,
      min_hours: rate.min_hours,
      max_hours: rate.max_hours,
      rate_amount: rate.rate_amount,
      description: rate.description ?? '',
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving() || this.isConfirming()) return;
    this.isModalOpen.set(false);
  }

  async saveRate(): Promise<void> {
    if (this.isSaving() || this.isConfirming()) return;
    this.hasSubmitted.set(true);
    if (!this.isFormValid()) return;

    this.isConfirming.set(true);
    const confirmation = await this.swalService.confirm(
      this.editingRateId() === null
        ? 'ยืนยันการเพิ่มอัตราเบี้ยเลี้ยง?'
        : 'ยืนยันการแก้ไขอัตราเบี้ยเลี้ยง?',
      'กรุณาตรวจสอบข้อมูลก่อนยืนยัน',
    );
    this.isConfirming.set(false);
    if (!confirmation.isConfirmed) return;

    const payload: UpsertClaimAllowanceRatePayload = {
      rate_id: this.editingRateId() ?? undefined,
      min_hours: this.form.min_hours,
      max_hours: this.form.max_hours,
      rate_amount: this.form.rate_amount,
      description: this.form.description.trim(),
      isDelete: false,
      excuteby: this.getCurrentExecutor(),
    };

    this.isSaving.set(true);
    this.masterDataService
      .upsertClaimAllowanceRate(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          this.swalService.success(
            this.editingRateId() === null
              ? 'เพิ่มอัตราเบี้ยเลี้ยงสำเร็จ'
              : 'แก้ไขอัตราเบี้ยเลี้ยงสำเร็จ',
          );
          this.loadRates();
        },
        error: () => {
          this.isSaving.set(false);
          this.swalService.error('บันทึกไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  async deleteRate(rate: ClaimAllowanceRate): Promise<void> {
    if (this.deletingRateId() !== null) return;

    const confirmation = await this.swalService.confirm(
      'ยืนยันการลบอัตราเบี้ยเลี้ยง?',
      'เมื่อลบแล้ว อัตรานี้จะไม่ถูกนำไปคำนวณเบี้ยเลี้ยงอีกต่อไป',
    );
    if (!confirmation.isConfirmed) return;

    const payload: UpsertClaimAllowanceRatePayload = {
      rate_id: rate.rate_id,
      isDelete: true,
      excuteby: this.getCurrentExecutor(),
    };

    this.deletingRateId.set(rate.rate_id);
    this.masterDataService
      .upsertClaimAllowanceRate(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingRateId.set(null);
          this.swalService.success('ลบอัตราเบี้ยเลี้ยงสำเร็จ');
          this.loadRates();
        },
        error: () => {
          this.deletingRateId.set(null);
          this.swalService.error('ลบไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  isFormValid(): boolean {
    const f = this.form;
    return (
      Number.isFinite(f.min_hours) &&
      f.min_hours >= 0 &&
      Number.isFinite(f.max_hours) &&
      f.max_hours > f.min_hours &&
      Number.isFinite(f.rate_amount) &&
      f.rate_amount >= 0 &&
      f.description.trim().length > 0
    );
  }

  getFieldError(field: 'min_hours' | 'max_hours' | 'rate_amount' | 'description'): string {
    if (!this.hasSubmitted()) return '';

    const f = this.form;
    switch (field) {
      case 'min_hours':
        return f.min_hours < 0 || !Number.isFinite(f.min_hours) ? 'กรุณากรอกชั่วโมงเริ่มต้น' : '';
      case 'max_hours':
        if (!Number.isFinite(f.max_hours)) return 'กรุณากรอกชั่วโมงสูงสุด';
        return f.max_hours <= f.min_hours ? 'ต้องมากกว่าชั่วโมงเริ่มต้น' : '';
      case 'rate_amount':
        return !Number.isFinite(f.rate_amount) || f.rate_amount < 0 ? 'กรุณากรอกจำนวนเงิน' : '';
      case 'description':
        return f.description.trim().length === 0 ? 'กรุณากรอกคำอธิบาย' : '';
    }
  }

  private createEmptyForm(): RateForm {
    return { min_hours: 0, max_hours: 0, rate_amount: 0, description: '' };
  }

  private getCurrentExecutor(): string {
    const user = this.authService.userData();
    return user?.CODEMPID ?? user?.AD_USER ?? '';
  }
}
