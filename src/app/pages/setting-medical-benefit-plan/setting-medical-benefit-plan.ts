import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import {
  MedicalBenefitPlan,
  UpsertMedicalBenefitPlanPayload,
} from '../../interfaces/medical.interface';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ModalShellComponent } from '../../components/shared/modal-shell/modal-shell';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';

interface PlanForm {
  plan_id?: number;
  plan_no: number;
  job_class_label: string;
  job_class_min: number;
  job_class_max: number;
  opd_limit: number;
  ipd_limit: number;
  dental_limit: number;
  vision_limit: number;
  opd_per_visit_cap: number;
  opd_over_cap: number;
  ipd_daily_cap: number;
  ipd_daily_over_cap: number;
  is_active: boolean;
}

@Component({
  selector: 'app-setting-medical-benefit-plan',
  imports: [
    FormsModule,
    DecimalPipe,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ModalShellComponent,
  ],
  templateUrl: './setting-medical-benefit-plan.html',
  styleUrl: './setting-medical-benefit-plan.scss',
})
export class SettingMedicalBenefitPlan implements OnInit {
  private readonly masterDataService = inject(MasterDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swalService = inject(SwalService);
  private readonly authService = inject(AuthService);

  readonly plans = signal<MedicalBenefitPlan[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly isConfirming = signal(false);
  readonly hasSubmitted = signal(false);
  readonly editingPlanId = signal<number | null>(null);
  readonly deletingPlanId = signal<number | null>(null);
  readonly togglingPlanId = signal<number | null>(null);

  form: PlanForm = this.createEmptyForm();

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.masterDataService
      .getMedicalBenefitPlans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.plans.set([...(data ?? [])].sort((a, b) => a.plan_no - b.plan_no));
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลแผนสวัสดิการรักษาพยาบาลได้');
          this.isLoading.set(false);
        },
      });
  }

  openCreate(): void {
    this.editingPlanId.set(null);
    this.hasSubmitted.set(false);
    this.form = this.createEmptyForm();
    this.isModalOpen.set(true);
  }

  openEdit(plan: MedicalBenefitPlan): void {
    this.editingPlanId.set(plan.plan_id);
    this.hasSubmitted.set(false);
    this.form = {
      plan_id: plan.plan_id,
      plan_no: plan.plan_no,
      job_class_label: plan.job_class_label ?? '',
      job_class_min: plan.job_class_min,
      job_class_max: plan.job_class_max,
      opd_limit: plan.opd_limit,
      ipd_limit: plan.ipd_limit,
      dental_limit: plan.dental_limit,
      vision_limit: plan.vision_limit,
      opd_per_visit_cap: plan.opd_per_visit_cap,
      opd_over_cap: plan.opd_over_cap,
      ipd_daily_cap: plan.ipd_daily_cap,
      ipd_daily_over_cap: plan.ipd_daily_over_cap,
      is_active: plan.is_active,
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    if (this.isSaving() || this.isConfirming()) return;
    this.isModalOpen.set(false);
  }

  async savePlan(): Promise<void> {
    if (this.isSaving() || this.isConfirming()) return;
    this.hasSubmitted.set(true);
    if (!this.isFormValid()) return;

    this.isConfirming.set(true);
    const confirmation = await this.swalService.confirm(
      this.editingPlanId() === null ? 'ยืนยันการเพิ่มแผนสวัสดิการ?' : 'ยืนยันการแก้ไขแผนสวัสดิการ?',
      'กรุณาตรวจสอบข้อมูลก่อนยืนยัน',
    );
    this.isConfirming.set(false);
    if (!confirmation.isConfirmed) return;

    const payload: UpsertMedicalBenefitPlanPayload = {
      plan_id: this.editingPlanId() ?? undefined,
      plan_no: this.form.plan_no,
      job_class_label: this.form.job_class_label.trim(),
      job_class_min: this.form.job_class_min,
      job_class_max: this.form.job_class_max,
      opd_limit: this.form.opd_limit,
      ipd_limit: this.form.ipd_limit,
      dental_limit: this.form.dental_limit,
      vision_limit: this.form.vision_limit,
      opd_per_visit_cap: this.form.opd_per_visit_cap,
      opd_over_cap: this.form.opd_over_cap,
      ipd_daily_cap: this.form.ipd_daily_cap,
      ipd_daily_over_cap: this.form.ipd_daily_over_cap,
      is_active: this.form.is_active,
      isDelete: false,
      excuteby: this.getCurrentExecutor(),
    };

    this.isSaving.set(true);
    this.masterDataService
      .upsertMedicalBenefitPlan(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          this.swalService.success(
            this.editingPlanId() === null ? 'เพิ่มแผนสวัสดิการสำเร็จ' : 'แก้ไขแผนสวัสดิการสำเร็จ',
          );
          this.loadPlans();
        },
        error: () => {
          this.isSaving.set(false);
          this.swalService.error('บันทึกไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  async toggleActive(plan: MedicalBenefitPlan): Promise<void> {
    if (this.togglingPlanId() !== null) return;

    const nextActive = !plan.is_active;
    const confirmation = await this.swalService.confirm(
      nextActive ? 'ยืนยันการเปิดใช้งานแผนนี้?' : 'ยืนยันการปิดใช้งานแผนนี้?',
    );
    if (!confirmation.isConfirmed) return;

    const payload: UpsertMedicalBenefitPlanPayload = {
      plan_id: plan.plan_id,
      plan_no: plan.plan_no,
      job_class_label: plan.job_class_label,
      job_class_min: plan.job_class_min,
      job_class_max: plan.job_class_max,
      opd_limit: plan.opd_limit,
      ipd_limit: plan.ipd_limit,
      dental_limit: plan.dental_limit,
      vision_limit: plan.vision_limit,
      opd_per_visit_cap: plan.opd_per_visit_cap,
      opd_over_cap: plan.opd_over_cap,
      ipd_daily_cap: plan.ipd_daily_cap,
      ipd_daily_over_cap: plan.ipd_daily_over_cap,
      is_active: nextActive,
      isDelete: false,
      excuteby: this.getCurrentExecutor(),
    };

    this.togglingPlanId.set(plan.plan_id);
    this.masterDataService
      .upsertMedicalBenefitPlan(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.togglingPlanId.set(null);
          this.swalService.success(nextActive ? 'เปิดใช้งานสำเร็จ' : 'ปิดใช้งานสำเร็จ');
          this.loadPlans();
        },
        error: () => {
          this.togglingPlanId.set(null);
          this.swalService.error('ดำเนินการไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  async deletePlan(plan: MedicalBenefitPlan): Promise<void> {
    if (this.deletingPlanId() !== null) return;

    const confirmation = await this.swalService.confirm(
      'ยืนยันการลบแผนสวัสดิการ?',
      'เมื่อลบแล้ว แผนนี้จะไม่ถูกนำไปคำนวณสิทธิ์รักษาพยาบาลอีกต่อไป',
    );
    if (!confirmation.isConfirmed) return;

    const payload: UpsertMedicalBenefitPlanPayload = {
      plan_id: plan.plan_id,
      is_active: false,
      isDelete: true,
      excuteby: this.getCurrentExecutor(),
    };

    this.deletingPlanId.set(plan.plan_id);
    this.masterDataService
      .upsertMedicalBenefitPlan(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingPlanId.set(null);
          this.swalService.success('ลบแผนสวัสดิการสำเร็จ');
          this.loadPlans();
        },
        error: () => {
          this.deletingPlanId.set(null);
          this.swalService.error('ลบไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  isFormValid(): boolean {
    const f = this.form;
    return (
      f.plan_no > 0 &&
      f.job_class_label.trim().length > 0 &&
      Number.isFinite(f.job_class_min) &&
      f.job_class_min >= 0 &&
      Number.isFinite(f.job_class_max) &&
      f.job_class_max >= f.job_class_min &&
      f.opd_limit >= 0 &&
      f.ipd_limit >= 0 &&
      f.dental_limit >= 0 &&
      f.vision_limit >= 0 &&
      f.opd_per_visit_cap >= 0 &&
      f.opd_over_cap >= 0 &&
      f.ipd_daily_cap >= 0 &&
      f.ipd_daily_over_cap >= 0
    );
  }

  getFieldError(field: 'plan_no' | 'job_class_label' | 'job_class_min' | 'job_class_max'): string {
    if (!this.hasSubmitted()) return '';

    const f = this.form;
    switch (field) {
      case 'plan_no':
        return f.plan_no > 0 ? '' : 'กรุณากรอกลำดับแผน';
      case 'job_class_label':
        return f.job_class_label.trim().length === 0 ? 'กรุณากรอกชื่อแผน' : '';
      case 'job_class_min':
        return f.job_class_min < 0 ? 'กรุณากรอก Job Class เริ่มต้น' : '';
      case 'job_class_max':
        return f.job_class_max < f.job_class_min ? 'ต้องไม่น้อยกว่า Job Class เริ่มต้น' : '';
    }
  }

  private createEmptyForm(): PlanForm {
    return {
      plan_no: 0,
      job_class_label: '',
      job_class_min: 0,
      job_class_max: 0,
      opd_limit: 0,
      ipd_limit: 0,
      dental_limit: 0,
      vision_limit: 0,
      opd_per_visit_cap: 0,
      opd_over_cap: 0,
      ipd_daily_cap: 0,
      ipd_daily_over_cap: 0,
      is_active: true,
    };
  }

  private getCurrentExecutor(): string {
    const user = this.authService.userData();
    return user?.CODEMPID ?? user?.AD_USER ?? '';
  }
}
