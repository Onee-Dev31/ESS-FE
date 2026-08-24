import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeaveQuotaRule, LeaveTypeMaster, TimeOffService } from '../../services/time-off.service';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface LeaveQuotaGroup {
  leave_type_id: number;
  leave_code: string;
  leave_name_th: string;
  leave_name_en: string;
  rules: LeaveQuotaRule[];
}

@Component({
  selector: 'app-setting-timeoff',
  imports: [FormsModule, NzSelectModule, PageHeaderComponent],
  templateUrl: './setting-timeoff.html',
  styleUrl: './setting-timeoff.scss',
})
export class SettingTimeoff implements OnInit {
  private readonly timeOffService = inject(TimeOffService);
  private readonly destroyRef = inject(DestroyRef);

  readonly quotaRules = signal<LeaveQuotaRule[]>([]);
  readonly leaveTypes = signal<LeaveTypeMaster[]>([]);
  readonly selectedLeaveCode = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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

}
