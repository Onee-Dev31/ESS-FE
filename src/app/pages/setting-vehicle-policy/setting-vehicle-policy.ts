import { Component, inject, signal, OnInit } from '@angular/core';
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

  ngOnInit() {
    this.loadRows();
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
