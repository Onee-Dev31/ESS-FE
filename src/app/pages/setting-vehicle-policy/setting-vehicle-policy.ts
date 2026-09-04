import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ToastService } from '../../services/toast';
import { environment } from '../../../environments/environment';

interface VehiclePolicyTextRow {
  id: number;
  text_key: string;
  display_order: number;
  label: string;
  content: string;
  modified_date: string;
}

interface TaxiConditionRow {
  condition_set_id: number;
  daily_limit: number;
  description: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

interface VoucherConditionRow {
  condition_set_id: number;
  early_checkin_time: string;
  late_checkout_hour: number;
  late_tolerance_min: number;
  description: string | null;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

@Component({
  selector: 'app-setting-vehicle-policy',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent],
  templateUrl: './setting-vehicle-policy.html',
  styleUrl: './setting-vehicle-policy.scss',
})
export class SettingVehiclePolicy implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  private readonly baseUrl = `${environment.api_url}/master`;

  loading = signal(false);
  savingId = signal<number | null>(null);
  editingId = signal<number | null>(null);
  rows = signal<VehiclePolicyTextRow[]>([]);
  draftContent = '';

  taxiConditionsLoading = signal(false);
  taxiConditionSaving = signal(false);
  taxiConditions = signal<TaxiConditionRow[]>([]);
  isEditingTaxiLimit = signal(false);
  draftTaxiDailyLimit: number | null = null;
  draftTaxiEffectiveFrom = '';

  activeTaxiCondition = computed<TaxiConditionRow | null>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      this.taxiConditions()
        .filter(
          (r) =>
            r.effective_from.slice(0, 10) <= today &&
            (!r.effective_to || r.effective_to.slice(0, 10) >= today),
        )
        .sort((a, b) =>
          a.effective_from !== b.effective_from
            ? a.effective_from < b.effective_from
              ? 1
              : -1
            : b.condition_set_id - a.condition_set_id,
        )[0] ?? null
    );
  });

  voucherConditionsLoading = signal(false);
  voucherConditionSaving = signal(false);
  voucherConditions = signal<VoucherConditionRow[]>([]);
  isEditingVoucherCondition = signal(false);
  draftEarlyCheckin = '';
  draftLateCheckoutHour: number | null = null;
  draftLateToleranceMin: number | null = null;
  draftVoucherEffectiveFrom = '';

  activeVoucherCondition = computed<VoucherConditionRow | null>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      this.voucherConditions()
        .filter(
          (r) =>
            r.effective_from.slice(0, 10) <= today &&
            (!r.effective_to || r.effective_to.slice(0, 10) >= today),
        )
        .sort((a, b) =>
          a.effective_from !== b.effective_from
            ? a.effective_from < b.effective_from
              ? 1
              : -1
            : b.condition_set_id - a.condition_set_id,
        )[0] ?? null
    );
  });

  ngOnInit() {
    this.loadRows();
    this.loadTaxiConditions();
    this.loadVoucherConditions();
  }

  loadRows() {
    this.loading.set(true);
    this.http.get<VehiclePolicyTextRow[]>(`${this.baseUrl}/GetClaimVoucherPolicyTexts`).subscribe({
      next: (res) => {
        this.rows.set((res ?? []).sort((a, b) => a.display_order - b.display_order));
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('โหลดข้อมูลไม่สำเร็จ');
        this.loading.set(false);
      },
    });
  }

  startEdit(row: VehiclePolicyTextRow) {
    this.editingId.set(row.id);
    this.draftContent = row.content;
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  save(row: VehiclePolicyTextRow) {
    this.savingId.set(row.id);
    this.http
      .post<{ success: boolean; message: string }>(`${this.baseUrl}/UpdateClaimVoucherPolicyText`, {
        id: row.id,
        content: this.draftContent,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.rows.update((list) =>
              list.map((item) =>
                item.id === row.id
                  ? { ...item, content: this.draftContent, modified_date: new Date().toISOString() }
                  : item,
              ),
            );
            this.editingId.set(null);
            this.toast.success(res.message || 'บันทึกสำเร็จ');
          } else {
            this.toast.error(res.message || 'บันทึกไม่สำเร็จ');
          }
          this.savingId.set(null);
        },
        error: (err) => {
          this.toast.error(err.status === 404 ? 'ไม่พบข้อมูลนี้ในระบบ' : 'เกิดข้อผิดพลาด');
          this.savingId.set(null);
        },
      });
  }

  loadTaxiConditions() {
    this.taxiConditionsLoading.set(true);
    this.http.get<TaxiConditionRow[]>(`${this.baseUrl}/GetClaimTaxiConditions`).subscribe({
      next: (res) => {
        this.taxiConditions.set(res ?? []);
        this.taxiConditionsLoading.set(false);
      },
      error: () => {
        this.toast.error('โหลดข้อมูลวงเงินค่าแท็กซี่ไม่สำเร็จ');
        this.taxiConditionsLoading.set(false);
      },
    });
  }

  startEditTaxiLimit() {
    const active = this.activeTaxiCondition();
    this.draftTaxiDailyLimit = active?.daily_limit ?? null;
    this.draftTaxiEffectiveFrom = new Date().toISOString().slice(0, 10);
    this.isEditingTaxiLimit.set(true);
  }

  cancelEditTaxiLimit() {
    this.isEditingTaxiLimit.set(false);
  }

  saveTaxiLimit() {
    if (!this.draftTaxiDailyLimit || this.draftTaxiDailyLimit <= 0 || !this.draftTaxiEffectiveFrom) {
      this.toast.error('กรุณาระบุวงเงินและวันที่มีผลให้ครบถ้วน');
      return;
    }

    this.taxiConditionSaving.set(true);
    this.http
      .post<{ success: boolean; message: string }>(`${this.baseUrl}/UpsertClaimTaxiCondition`, {
        condition_set_id: null,
        daily_limit: this.draftTaxiDailyLimit,
        description: 'ปรับวงเงินผ่านหน้า admin',
        effective_from: this.draftTaxiEffectiveFrom,
        effective_to: null,
        isDelete: false,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.toast.success(res.message || 'บันทึกสำเร็จ');
            this.isEditingTaxiLimit.set(false);
            this.loadTaxiConditions();
          } else {
            this.toast.error(res.message || 'บันทึกไม่สำเร็จ');
          }
          this.taxiConditionSaving.set(false);
        },
        error: (err) => {
          this.toast.error(err.status === 404 ? 'ไม่พบข้อมูลนี้ในระบบ' : 'เกิดข้อผิดพลาด');
          this.taxiConditionSaving.set(false);
        },
      });
  }

  loadVoucherConditions() {
    this.voucherConditionsLoading.set(true);
    this.http.get<VoucherConditionRow[]>(`${this.baseUrl}/GetClaimVoucherConditions`).subscribe({
      next: (res) => {
        this.voucherConditions.set(res ?? []);
        this.voucherConditionsLoading.set(false);
      },
      error: () => {
        this.toast.error('โหลดข้อมูลเงื่อนไขการเบิกค่าพาหนะไม่สำเร็จ');
        this.voucherConditionsLoading.set(false);
      },
    });
  }

  startEditVoucherCondition() {
    const active = this.activeVoucherCondition();
    this.draftEarlyCheckin = active?.early_checkin_time?.slice(0, 5) ?? '';
    this.draftLateCheckoutHour = active?.late_checkout_hour ?? null;
    this.draftLateToleranceMin = active?.late_tolerance_min ?? null;
    this.draftVoucherEffectiveFrom = new Date().toISOString().slice(0, 10);
    this.isEditingVoucherCondition.set(true);
  }

  cancelEditVoucherCondition() {
    this.isEditingVoucherCondition.set(false);
  }

  saveVoucherCondition() {
    if (
      !this.draftEarlyCheckin ||
      this.draftLateCheckoutHour === null ||
      this.draftLateCheckoutHour < 0 ||
      this.draftLateCheckoutHour > 23 ||
      this.draftLateToleranceMin === null ||
      this.draftLateToleranceMin < 0 ||
      !this.draftVoucherEffectiveFrom
    ) {
      this.toast.error('กรุณาระบุข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    this.voucherConditionSaving.set(true);
    this.http
      .post<{ success: boolean; message: string }>(`${this.baseUrl}/UpsertClaimVoucherCondition`, {
        condition_set_id: null,
        early_checkin_time: this.draftEarlyCheckin,
        late_checkout_hour: this.draftLateCheckoutHour,
        late_tolerance_min: this.draftLateToleranceMin,
        description: 'ปรับเงื่อนไขผ่านหน้า admin',
        effective_from: this.draftVoucherEffectiveFrom,
        effective_to: null,
        isDelete: false,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.toast.success(res.message || 'บันทึกสำเร็จ');
            this.isEditingVoucherCondition.set(false);
            this.loadVoucherConditions();
          } else {
            this.toast.error(res.message || 'บันทึกไม่สำเร็จ');
          }
          this.voucherConditionSaving.set(false);
        },
        error: (err) => {
          this.toast.error(err.status === 404 ? 'ไม่พบข้อมูลนี้ในระบบ' : 'เกิดข้อผิดพลาด');
          this.voucherConditionSaving.set(false);
        },
      });
  }

  extractVars(content: string): string[] {
    return [...new Set(content.match(/\{\w+\}/g) ?? [])];
  }

  isEditing(id: number) {
    return this.editingId() === id;
  }

  isSaving(id: number) {
    return this.savingId() === id;
  }
}
