import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { EmailConfigService, TestRecipient } from '../../services/email-config.service';
import { AuthService } from '../../services/auth.service';
import { SwalService } from '../../services/swal.service';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-setting-email',
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './setting-email.html',
  styleUrl: './setting-email.scss',
})
export class SettingEmail implements OnInit {
  private api = inject(EmailConfigService);
  private auth = inject(AuthService);
  private swal = inject(SwalService);
  private toast = inject(ToastService);
  loading = signal(true);
  busy = signal(false);
  error = signal('');
  mode = signal<boolean | null>(null);
  recipients = signal<TestRecipient[]>([]);
  formOpen = signal(false);
  editing = false;
  draft: TestRecipient = { id: 0, name: '', email: '' };

  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(
        forkJoin({ mode: this.api.getMode(), recipients: this.api.getRecipients() }),
      );
      this.mode.set(result.mode.data[0].IS_TEST_MODE);
      this.recipients.set(
        result.recipients.data.map(
          (row: { ID: number; EMAIL: string; NAME: string; CREATE_BY: string | null }) => ({
            id: row.ID,
            email: row.EMAIL,
            name: row.NAME,
            createBy: row.CREATE_BY,
          }),
        ),
      );
    } catch (error) {
      this.mode.set(null);
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }
  private message(error: unknown): string {
    const e = error as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || 'ไม่สามารถติดต่อระบบได้ กรุณาลองใหม่';
  }
  private actor(): string {
    const actor = this.auth.currentUser()?.trim();
    if (!actor) throw new Error('ไม่พบ AD user กรุณาเข้าสู่ระบบใหม่');
    return actor;
  }
  async changeMode() {
    if (this.busy() || this.loading() || this.mode() === null) return;
    this.busy.set(true);
    const next = !this.mode();
    try {
      const result = await this.swal.confirm(
        next ? 'เปิดโหมดทดสอบ?' : 'เปิดโหมดส่งจริง?',
        next ? 'อีเมลจะใช้รายชื่อผู้รับทดสอบที่กำหนดไว้' : 'อีเมลจะส่งถึงผู้รับจริงตามรายการงาน',
      );
      if (!result.isConfirmed) return;
      await firstValueFrom(this.api.updateMode(next, this.actor()));
      this.toast.success('บันทึกโหมดส่งอีเมลแล้ว');
      await this.load();
    } catch (error) {
      this.toast.error(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  openForm(recipient?: TestRecipient) {
    if (this.busy() || this.loading()) return;
    this.editing = !!recipient;
    this.draft = recipient ? { ...recipient } : { id: 0, name: '', email: '' };
    this.formOpen.set(true);
  }
  async save(form: NgForm) {
    if (this.busy() || this.loading() || form.invalid) return;
    const draft = { ...this.draft, name: this.draft.name.trim(), email: this.draft.email.trim() };
    if (!draft.name || !draft.email) return;
    if (
      this.recipients().some(
        (r) => r.id !== draft.id && r.email.toLowerCase() === draft.email.toLowerCase(),
      )
    ) {
      this.toast.error('มีอีเมลนี้ในรายชื่อผู้รับทดสอบแล้ว');
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.saveRecipient(draft, this.actor(), this.editing));
      this.formOpen.set(false);
      this.toast.success('บันทึกผู้รับทดสอบแล้ว');
      await this.load();
    } catch (error) {
      this.toast.error(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }
  async remove(recipient: TestRecipient) {
    if (this.busy() || this.loading()) return;
    this.busy.set(true);
    try {
      const result = await this.swal.confirm(
        'ลบผู้รับทดสอบ?',
        `${recipient.name} (${recipient.email})`,
      );
      if (!result.isConfirmed) return;
      await firstValueFrom(this.api.deleteRecipient(recipient.id, this.actor()));
      this.toast.success('ลบผู้รับทดสอบแล้ว');
      await this.load();
    } catch (error) {
      this.toast.error(this.message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
