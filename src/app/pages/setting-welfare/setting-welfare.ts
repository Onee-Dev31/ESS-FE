import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MasterDataService } from '../../services/master-data.service';
import { CompanyWelfare, CompanyWelfarePayload } from '../../interfaces/welfare.interface';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { ModalShellComponent } from '../../components/shared/modal-shell/modal-shell';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';

interface WelfareForm {
  id?: number;
  companyCode: string;
  companyShortName: string;
  companyNameTH: string;
  companyNameEN: string;
  welfareCode: string;
  welfareNameTH: string;
  welfareNameEN: string;
  welfareDescriptionTH: string;
  welfareDescriptionEN: string;
  sortOrder: number;
}

interface CompanyOption {
  CompanyCode: string;
  CompanyShortName?: string;
  CompanyNameTH?: string;
  CompanyNameEN?: string;
}

type CompanyMasterRow = Partial<CompanyOption> & {
  COMPANY_CODE?: string;
  COMPANY_NAME?: string;
  CompanyName?: string;
  companyCode?: string;
  companyShortName?: string;
  companyName?: string;
  companyNameTH?: string;
  companyNameEN?: string;
};

type CompanyWelfareRow = Partial<CompanyWelfare> & {
  ID?: number;
  CompanyCode?: string;
  CompanyShortName?: string;
  CompanyNameTH?: string;
  CompanyNameEN?: string;
  WelfareCode?: string;
  WelfareNameTH?: string;
  WelfareNameEN?: string;
  WelfareDescriptionTH?: string;
  WelfareDescriptionEN?: string;
  SortOrder?: number;
};

@Component({
  selector: 'app-setting-welfare',
  imports: [
    FormsModule,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    ModalShellComponent,
  ],
  templateUrl: './setting-welfare.html',
  styleUrl: './setting-welfare.scss',
})
export class SettingWelfare implements OnInit {
  private readonly masterDataService = inject(MasterDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly swalService = inject(SwalService);
  private readonly authService = inject(AuthService);

  readonly welfares = signal<CompanyWelfare[]>([]);
  readonly companies = signal<CompanyOption[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly isConfirming = signal(false);
  readonly isLoadingDetail = signal(false);
  readonly hasSubmitted = signal(false);
  readonly editingWelfareId = signal<number | null>(null);
  readonly deletingWelfareId = signal<number | null>(null);

  form: WelfareForm = this.createEmptyForm();

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      welfares: this.masterDataService.getCompanyWelfares(),
      companies: this.masterDataService.getCompanyMaster(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ welfares, companies }) => {
          this.welfares.set(this.sortWelfares(this.normalizeWelfares(welfares)));
          this.companies.set(
            this.normalizeCompanies(this.extractArray<CompanyMasterRow>(companies)),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลสวัสดิการได้');
          this.isLoading.set(false);
        },
      });
  }

  loadWelfares(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.masterDataService
      .getCompanyWelfares()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.welfares.set(this.sortWelfares(this.normalizeWelfares(data)));
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลสวัสดิการได้');
          this.isLoading.set(false);
        },
      });
  }

  openCreate(): void {
    this.editingWelfareId.set(null);
    this.hasSubmitted.set(false);
    this.form = this.createEmptyForm();
    this.isModalOpen.set(true);
  }

  openEdit(welfare: CompanyWelfare): void {
    this.editingWelfareId.set(welfare.id);
    this.hasSubmitted.set(false);
    this.form = this.mapWelfareToForm(welfare);
    this.isModalOpen.set(true);
    this.isLoadingDetail.set(true);

    this.masterDataService
      .getCompanyWelfare(welfare.companyCode, welfare.welfareCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const normalizedDetail = this.normalizeWelfare(data) ?? welfare;
          this.form = this.mapWelfareToForm(normalizedDetail);
          this.editingWelfareId.set(this.form.id ?? welfare.id);
          this.isLoadingDetail.set(false);
        },
        error: () => {
          this.isLoadingDetail.set(false);
        },
      });
  }

  closeModal(): void {
    if (this.isSaving() || this.isConfirming()) return;
    this.isModalOpen.set(false);
  }

  onCompanyChange(): void {
    const company = this.companies().find((item) => item.CompanyCode === this.form.companyCode);
    if (!company) {
      this.form.companyShortName = '';
      this.form.companyNameTH = '';
      this.form.companyNameEN = '';
      return;
    }

    this.form.companyShortName = '';
    this.form.companyNameTH = company.CompanyNameTH || company.CompanyNameEN || '';
    this.form.companyNameEN = company.CompanyNameEN || company.CompanyNameTH || '';
  }

  async saveWelfare(): Promise<void> {
    if (this.isSaving() || this.isConfirming()) return;
    this.hasSubmitted.set(true);
    if (!this.isFormValid()) return;

    this.isConfirming.set(true);
    const confirmation = await this.swalService.confirm(
      this.editingWelfareId() === null ? 'ยืนยันการเพิ่มสวัสดิการ?' : 'ยืนยันการแก้ไขสวัสดิการ?',
      'กรุณาตรวจสอบข้อมูลก่อนยืนยัน',
    );
    this.isConfirming.set(false);
    if (!confirmation.isConfirmed) return;

    const payload = this.buildPayload();
    const request =
      this.editingWelfareId() === null
        ? this.masterDataService.createCompanyWelfare(payload)
        : this.masterDataService.updateCompanyWelfare(this.editingWelfareId()!, payload);

    this.isSaving.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isModalOpen.set(false);
        this.swalService.success(
          this.editingWelfareId() === null ? 'เพิ่มสวัสดิการสำเร็จ' : 'แก้ไขสวัสดิการสำเร็จ',
        );
        this.loadWelfares();
      },
      error: () => {
        this.isSaving.set(false);
        this.swalService.error('บันทึกไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
      },
    });
  }

  async deleteWelfare(welfare: CompanyWelfare): Promise<void> {
    if (this.deletingWelfareId() !== null) return;

    const confirmation = await this.swalService.confirm(
      'ยืนยันการลบสวัสดิการ?',
      'เมื่อลบแล้ว สวัสดิการนี้จะไม่แสดงในรายการอีกต่อไป',
    );
    if (!confirmation.isConfirmed) return;

    this.deletingWelfareId.set(welfare.id);
    this.masterDataService
      .deleteCompanyWelfare(welfare.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingWelfareId.set(null);
          this.swalService.success('ลบสวัสดิการสำเร็จ');
          this.loadWelfares();
        },
        error: () => {
          this.deletingWelfareId.set(null);
          this.swalService.error('ลบไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  isFormValid(): boolean {
    const f = this.form;
    return (
      f.companyCode.trim().length > 0 &&
      f.companyShortName.trim().length > 0 &&
      f.companyNameTH.trim().length > 0 &&
      f.welfareCode.trim().length > 0 &&
      f.welfareNameTH.trim().length > 0 &&
      f.welfareNameEN.trim().length > 0 &&
      f.welfareDescriptionTH.trim().length > 0 &&
      f.welfareDescriptionEN.trim().length > 0 &&
      Number.isFinite(f.sortOrder) &&
      f.sortOrder > 0
    );
  }

  getFieldError(field: keyof WelfareForm): string {
    if (!this.hasSubmitted()) return '';

    const value = this.form[field];
    if (field === 'sortOrder') {
      return Number.isFinite(value) && Number(value) > 0 ? '' : 'กรุณากรอกลำดับ';
    }

    return String(value ?? '').trim().length === 0 ? 'กรุณากรอกข้อมูล' : '';
  }

  private createEmptyForm(): WelfareForm {
    return {
      companyCode: '',
      companyShortName: '',
      companyNameTH: '',
      companyNameEN: '',
      welfareCode: '',
      welfareNameTH: '',
      welfareNameEN: '',
      welfareDescriptionTH: '',
      welfareDescriptionEN: '',
      sortOrder: 1,
    };
  }

  private mapWelfareToForm(welfare: CompanyWelfare): WelfareForm {
    return {
      id: welfare.id,
      companyCode: welfare.companyCode ?? '',
      companyShortName: welfare.companyShortName ?? '',
      companyNameTH: welfare.companyNameTH ?? '',
      companyNameEN: welfare.companyNameEN ?? '',
      welfareCode: welfare.welfareCode ?? '',
      welfareNameTH: welfare.welfareNameTH ?? '',
      welfareNameEN: welfare.welfareNameEN ?? '',
      welfareDescriptionTH: welfare.welfareDescriptionTH ?? '',
      welfareDescriptionEN: welfare.welfareDescriptionEN ?? '',
      sortOrder: welfare.sortOrder ?? 1,
    };
  }

  private buildPayload(): CompanyWelfarePayload {
    const executeBy = this.getCurrentExecutor();
    const auditDate = new Date().toISOString();
    const auditPayload =
      this.editingWelfareId() === null
        ? { createdBy: executeBy, createdDate: auditDate }
        : { updatedBy: executeBy, updatedDate: auditDate };

    return {
      companyCode: this.form.companyCode.trim(),
      companyShortName: this.form.companyShortName.trim(),
      companyNameTH: this.form.companyNameTH.trim(),
      companyNameEN: null,
      welfareCode: this.form.welfareCode.trim(),
      welfareNameTH: this.form.welfareNameTH.trim(),
      welfareNameEN: this.form.welfareNameEN.trim(),
      welfareDescriptionTH: this.form.welfareDescriptionTH.trim(),
      welfareDescriptionEN: this.form.welfareDescriptionEN.trim(),
      sortOrder: this.form.sortOrder,
      ...auditPayload,
    };
  }

  private sortWelfares(welfares: CompanyWelfare[]): CompanyWelfare[] {
    return [...welfares].sort((a, b) => {
      const companySort = (a.companyCode ?? '').localeCompare(b.companyCode ?? '');
      if (companySort !== 0) return companySort;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }

  private normalizeWelfares(response: unknown): CompanyWelfare[] {
    return this.extractArray<CompanyWelfareRow>(response)
      .map((row) => this.normalizeWelfare(row))
      .filter((row): row is CompanyWelfare => row !== null);
  }

  private normalizeWelfare(response: unknown): CompanyWelfare | null {
    const [row] = this.extractArray<CompanyWelfareRow>(response);
    const welfare = row ?? this.extractObject<CompanyWelfareRow>(response);
    if (!welfare) return null;

    const id = Number(welfare.id ?? welfare.ID ?? 0);

    return {
      id,
      companyCode: welfare.companyCode ?? welfare.CompanyCode ?? '',
      companyShortName: welfare.companyShortName ?? welfare.CompanyShortName ?? '',
      companyNameTH: welfare.companyNameTH ?? welfare.CompanyNameTH ?? '',
      companyNameEN: welfare.companyNameEN ?? welfare.CompanyNameEN ?? '',
      welfareCode: welfare.welfareCode ?? welfare.WelfareCode ?? '',
      welfareNameTH: welfare.welfareNameTH ?? welfare.WelfareNameTH ?? '',
      welfareNameEN: welfare.welfareNameEN ?? welfare.WelfareNameEN ?? '',
      welfareDescriptionTH: welfare.welfareDescriptionTH ?? welfare.WelfareDescriptionTH ?? '',
      welfareDescriptionEN: welfare.welfareDescriptionEN ?? welfare.WelfareDescriptionEN ?? '',
      sortOrder: Number(welfare.sortOrder ?? welfare.SortOrder ?? 0),
    };
  }

  private normalizeCompanies(companies: CompanyMasterRow[]): CompanyOption[] {
    return companies
      .map((company) => ({
        CompanyCode: company.CompanyCode ?? company.COMPANY_CODE ?? company.companyCode ?? '',
        CompanyShortName: company.CompanyShortName ?? company.companyShortName ?? '',
        CompanyNameTH:
          company.CompanyNameTH ??
          company.CompanyName ??
          company.COMPANY_NAME ??
          company.companyNameTH ??
          company.companyName ??
          '',
        CompanyNameEN: company.CompanyNameEN ?? company.companyNameEN ?? '',
      }))
      .filter((company) => company.CompanyCode.trim().length > 0);
  }

  private extractArray<T>(response: unknown): T[] {
    if (Array.isArray(response)) return response as T[];
    if (response && typeof response === 'object') {
      const data =
        (response as { data?: unknown; Data?: unknown }).data ??
        (response as { Data?: unknown }).Data;
      if (Array.isArray(data)) return data as T[];
    }
    return [];
  }

  private extractObject<T>(response: unknown): T | null {
    if (!response || typeof response !== 'object') return null;

    const data =
      (response as { data?: unknown; Data?: unknown }).data ??
      (response as { Data?: unknown }).Data;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as T;
    }

    return response as T;
  }

  private getCurrentExecutor(): string {
    const currentUser = this.authService.currentUser();
    if (currentUser) return currentUser;

    const user = this.authService.userData();
    return user?.CODEMPID ?? user?.codeempid ?? user?.AD_USER ?? user?.adUser ?? '';
  }
}
