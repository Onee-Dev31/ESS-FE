import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ToastService } from '../../services/toast';
import { environment } from '../../../environments/environment';

interface NotificationTemplate {
  id: number;
  event_code: string;
  title_template: string;
  message_template: string;
  active_flag: boolean;
  modified_date: string;
}

interface EditDraft {
  title_template: string;
  message_template: string;
  active_flag: boolean;
}

@Component({
  selector: 'app-setting-notification',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, SkeletonComponent, EmptyStateComponent],
  templateUrl: './setting-notification.html',
  styleUrl: './setting-notification.scss',
})
export class SettingNotification implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  private readonly baseUrl = `${environment.api_url}/notification/templates`;

  loading = signal(false);
  savingId = signal<number | null>(null);
  editingId = signal<number | null>(null);
  templates = signal<NotificationTemplate[]>([]);
  draft: EditDraft = { title_template: '', message_template: '', active_flag: true };

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading.set(true);
    this.http.get<{ success: boolean; data: NotificationTemplate[] }>(this.baseUrl).subscribe({
      next: (res) => {
        this.templates.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('โหลดข้อมูลไม่สำเร็จ');
        this.loading.set(false);
      },
    });
  }

  startEdit(t: NotificationTemplate) {
    this.editingId.set(t.id);
    this.draft = {
      title_template: t.title_template,
      message_template: t.message_template,
      active_flag: t.active_flag,
    };
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  save(t: NotificationTemplate) {
    this.savingId.set(t.id);
    this.http
      .put<{ success: boolean; message: string }>(`${this.baseUrl}/${t.id}`, {
        titleTemplate: this.draft.title_template,
        messageTemplate: this.draft.message_template,
        activeFlag: this.draft.active_flag,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.templates.update((list) =>
              list.map((item) =>
                item.id === t.id
                  ? {
                      ...item,
                      title_template: this.draft.title_template,
                      message_template: this.draft.message_template,
                      active_flag: this.draft.active_flag,
                      modified_date: new Date().toISOString(),
                    }
                  : item,
              ),
            );
            this.editingId.set(null);
            this.toast.success(res.message || 'บันทึกสำเร็จ');
          } else {
            this.toast.error('บันทึกไม่สำเร็จ');
          }
          this.savingId.set(null);
        },
        error: (err) => {
          this.toast.error(err.status === 404 ? 'ไม่พบ Template นี้ในระบบ' : 'เกิดข้อผิดพลาด');
          this.savingId.set(null);
        },
      });
  }

  extractVars(template: string): string[] {
    return [...new Set(template.match(/\{\w+\}/g) ?? [])];
  }

  isEditing(id: number) {
    return this.editingId() === id;
  }

  isSaving(id: number) {
    return this.savingId() === id;
  }
}
