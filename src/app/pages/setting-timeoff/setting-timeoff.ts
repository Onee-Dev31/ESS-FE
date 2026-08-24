import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LeaveQuotaRule,
  LeaveTypeMaster,
  TimeOffService,
  UpsertLeaveQuotaRulePayload,
} from '../../services/time-off.service';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';
import { PageLoaderComponent } from '../../components/shared/page-loader/page-loader';

interface LeaveQuotaGroup {
  leave_type_id: number;
  leave_code: string;
  leave_name_th: string;
  leave_name_en: string;
  rules: LeaveQuotaRule[];
}

@Component({
  selector: 'app-setting-timeoff',
  imports: [FormsModule, NzSelectModule, PageHeaderComponent, PageLoaderComponent],
  templateUrl: './setting-timeoff.html',
  styleUrl: './setting-timeoff.scss',
})
export class SettingTimeoff implements OnInit {
  private readonly timeOffService = inject(TimeOffService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swalService = inject(SwalService);
  private readonly authService = inject(AuthService);

  readonly quotaRules = signal<LeaveQuotaRule[]>([]);
  readonly leaveTypes = signal<LeaveTypeMaster[]>([]);
  readonly selectedLeaveCode = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isRuleModalOpen = signal(false);
  readonly isSavingRule = signal(false);
  readonly isConfirmingSave = signal(false);
  readonly hasSubmittedRule = signal(false);
  readonly editingRuleId = signal<number | null>(null);
  readonly deletingRuleId = signal<number | null>(null);
  readonly serviceYearMinOptions = [0.3, ...Array.from({ length: 69 }, (_, index) => index + 1)];
  ruleForm: UpsertLeaveQuotaRulePayload = this.createEmptyRuleForm();

  readonly quotaGroups = computed<LeaveQuotaGroup[]>(() => {
    return this.leaveTypes().map((leaveType) => {
      const rules = this.quotaRules().filter(
        (rule) => rule.leave_type_id === leaveType.leave_type_id,
      );

      return {
        ...leaveType,
        rules,
      };
    });
  });

  readonly selectedGroup = computed(() => {
    const code = this.selectedLeaveCode();
    return code ? (this.quotaGroups().find((group) => group.leave_code === code) ?? null) : null;
  });

  ngOnInit(): void {
    this.loadQuotaRules();
  }

  loadQuotaRules(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.timeOffService
      .getQuotaRules()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          console.log(data);
          this.leaveTypes.set(data.master ?? []);
          this.quotaRules.set(data.rules ?? []);
          const selectedCode = this.selectedLeaveCode();
          const selectedStillExists = data.master?.some(
            (leaveType) => leaveType.leave_code === selectedCode,
          );
          if (!selectedStillExists) {
            this.selectedLeaveCode.set(data.master?.[0]?.leave_code ?? null);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลกฎโควตาการลาได้');
          this.isLoading.set(false);
        },
      });
  }

  openGroup(leaveCode: string): void {
    this.selectedLeaveCode.set(leaveCode);
  }

  onJobClassInput(event: Event, field: 'jobclass_min' | 'jobclass_max'): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 3);
    input.value = digitsOnly;
    this.ruleForm[field] = digitsOnly ? Number(digitsOnly) : -1;
  }

  onQuotaDaysInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '');
    input.value = digitsOnly;
    this.ruleForm.quota_days = digitsOnly ? Number(digitsOnly) : -1;
  }

  onServiceYearMinChange(year: number): void {
    this.ruleForm.service_year_min = year;
    const maximum = this.ruleForm.service_year_max;
    if (maximum !== 99 && maximum < year) {
      this.ruleForm.service_year_max = -1;
    }
  }

  getServiceYearMaxOptions(): number[] {
    const minimum = this.ruleForm.service_year_min;
    const availableYears = this.serviceYearMinOptions.filter(
      (year) => year !== 0.3 && (minimum < 0 || year >= minimum),
    );
    return [99, ...availableYears];
  }

  openCreateRule(): void {
    const group = this.selectedGroup();
    if (!group) return;

    this.editingRuleId.set(null);
    this.hasSubmittedRule.set(false);
    this.ruleForm = this.createEmptyRuleForm(group.leave_type_id);
    this.isRuleModalOpen.set(true);
  }

  openEditRule(rule: LeaveQuotaRule): void {
    this.editingRuleId.set(rule.rule_id);
    this.hasSubmittedRule.set(false);
    this.ruleForm = {
      rule_id: rule.rule_id,
      leave_type_id: rule.leave_type_id,
      jobclass_min: rule.jobclass_min,
      jobclass_max: rule.jobclass_max,
      service_year_min: rule.service_year_min,
      service_year_max: rule.service_year_max ?? 99,
      quota_days: rule.quota_days,
    };
    this.isRuleModalOpen.set(true);
  }

  @HostListener('document:keydown.escape')
  closeRuleModal(): void {
    if (!this.isRuleModalOpen() || this.isSavingRule() || this.isConfirmingSave()) return;
    this.isRuleModalOpen.set(false);
  }

  async saveRule(): Promise<void> {
    if (this.isSavingRule() || this.isConfirmingSave()) return;
    this.hasSubmittedRule.set(true);
    if (!this.isRuleFormValid()) return;

    this.isConfirmingSave.set(true);
    const confirmation = await this.swalService.confirm(
      this.editingRuleId() === null ? 'ยืนยันการเพิ่มเงื่อนไข?' : 'ยืนยันการแก้ไขเงื่อนไข?',
      'กรุณาตรวจสอบข้อมูลก่อนยืนยัน',
    );
    this.isConfirmingSave.set(false);
    if (!confirmation.isConfirmed) return;

    const payload: UpsertLeaveQuotaRulePayload = {
      ...this.ruleForm,
      isDelete: false,
      excuteBy: this.getCurrentExecutor(),
    };
    if (this.editingRuleId() === null) delete payload.rule_id;

    this.isSavingRule.set(true);
    this.timeOffService
      .upsertQuotaRule(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSavingRule.set(false);
          this.isRuleModalOpen.set(false);
          this.swalService.success(
            this.editingRuleId() === null ? 'เพิ่มเงื่อนไขสำเร็จ' : 'แก้ไขเงื่อนไขสำเร็จ',
          );
          this.loadQuotaRules();
        },
        error: () => {
          this.isSavingRule.set(false);
          this.swalService.error('บันทึกไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  async deleteRule(rule: LeaveQuotaRule): Promise<void> {
    if (this.deletingRuleId() !== null) return;

    const confirmation = await this.swalService.confirm(
      'ยืนยันการลบเงื่อนไข?',
      'เมื่อลบแล้ว เงื่อนไขนี้จะไม่ถูกนำไปคำนวณสิทธิ์การลา',
    );
    if (!confirmation.isConfirmed) return;

    const payload: UpsertLeaveQuotaRulePayload = {
      rule_id: rule.rule_id,
      leave_type_id: rule.leave_type_id,
      jobclass_min: rule.jobclass_min,
      jobclass_max: rule.jobclass_max,
      service_year_min: rule.service_year_min,
      service_year_max: rule.service_year_max ?? 99,
      quota_days: rule.quota_days,
      isDelete: true,
      excuteBy: this.getCurrentExecutor(),
    };

    this.deletingRuleId.set(rule.rule_id);
    this.timeOffService
      .upsertQuotaRule(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingRuleId.set(null);
          this.swalService.success('ลบเงื่อนไขสำเร็จ');
          this.loadQuotaRules();
        },
        error: () => {
          this.deletingRuleId.set(null);
          this.swalService.error('ลบไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  isRuleFormValid(): boolean {
    const form = this.ruleForm;
    return (
      form.leave_type_id > 0 &&
      Number.isInteger(form.jobclass_min) &&
      form.jobclass_min >= 0 &&
      form.jobclass_min <= 999 &&
      Number.isInteger(form.jobclass_max) &&
      form.jobclass_max >= form.jobclass_min &&
      form.jobclass_max <= 999 &&
      form.service_year_min >= 0.3 &&
      form.service_year_max >= form.service_year_min &&
      Number.isInteger(form.quota_days) &&
      form.quota_days >= 0
    );
  }

  getRuleFieldError(
    field: 'jobclass_min' | 'jobclass_max' | 'service_year_min' | 'service_year_max' | 'quota_days',
  ): string {
    if (!this.hasSubmittedRule()) return '';

    const form = this.ruleForm;
    switch (field) {
      case 'jobclass_min':
        if (form.jobclass_min < 0) return 'กรุณากรอก Job Class เริ่มต้น';
        if (!Number.isInteger(form.jobclass_min) || form.jobclass_min > 999)
          return 'กรอกได้เฉพาะจำนวนเต็มไม่เกิน 999';
        return '';
      case 'jobclass_max':
        if (form.jobclass_max < 0) return 'กรุณากรอก Job Class สูงสุด';
        if (!Number.isInteger(form.jobclass_max) || form.jobclass_max > 999)
          return 'กรอกได้เฉพาะจำนวนเต็มไม่เกิน 999';
        if (form.jobclass_max < form.jobclass_min) return 'ต้องไม่น้อยกว่าค่าเริ่มต้น';
        return '';
      case 'service_year_min':
        return form.service_year_min < 0.3 ? 'กรุณาเลือกอายุงานเริ่มต้น' : '';
      case 'service_year_max':
        if (form.service_year_max < 0.3) return 'กรุณาเลือกอายุงานสูงสุด';
        if (form.service_year_max < form.service_year_min) return 'ต้องไม่น้อยกว่าค่าเริ่มต้น';
        return '';
      case 'quota_days':
        if (form.quota_days < 0) return 'กรุณากรอกจำนวนวันลา';
        return Number.isInteger(form.quota_days) ? '' : 'กรอกได้เฉพาะจำนวนเต็ม';
    }
  }

  getServiceYearLabel(year: number, isMaximum = false): string {
    if (year === 0.3) return 'ผ่านโปร';
    if (year === 99 && isMaximum) return 'ขึ้นไป (ไม่จำกัด)';
    return `${year} ปี`;
  }

  getServiceYearRangeLabel(minimum: number, maximum: number | null): string {
    const minimumLabel = this.getServiceYearLabel(minimum);
    return maximum == null || maximum === 99
      ? `${minimumLabel}ขึ้นไป`
      : `${minimumLabel}–${this.getServiceYearLabel(maximum)}`;
  }

  private createEmptyRuleForm(leaveTypeId = 0): UpsertLeaveQuotaRulePayload {
    return {
      leave_type_id: leaveTypeId,
      jobclass_min: -1,
      jobclass_max: -1,
      service_year_min: -1,
      service_year_max: -1,
      quota_days: -1,
    };
  }

  private getCurrentExecutor(): string {
    const user = this.authService.userData();
    return user?.CODEMPID ?? user?.AD_USER ?? '';
  }
}
