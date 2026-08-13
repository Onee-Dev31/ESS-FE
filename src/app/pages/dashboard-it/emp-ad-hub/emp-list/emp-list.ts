import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PageHeaderComponent } from '../../../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../../../components/shared/pagination/pagination';
import { ResignManagementService } from '../../../../services/resign-management.service';
import { MasterDataService } from '../../../../services/master-data.service';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-emp-list',
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    PageHeaderComponent,
    SkeletonComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  templateUrl: './emp-list.html',
  styleUrl: './emp-list.scss',
})
export class EmpList {
  pageTitle = 'รายชื่อพนักงาน';
  isLoading = false;

  allEmployees: any[] = [];
  filteredEmployees: any[] = [];
  pagedEmployees: any[] = [];

  filterText = '';
  filterStatus = '';
  filterCompany = '';
  filterDepartment = '';

  statusOptions: string[] = [];
  companyList: { code: string; label: string }[] = [];
  departmentOptions: string[] = [];
  filteredDepartmentOptions: string[] = [];

  currentPage = 0;
  pageSize = 20;
  totalItems = 0;
  readonly copiedField = signal<string | null>(null);
  private copyResetTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private resignService: ResignManagementService,
    private masterService: MasterDataService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadCompanies();
    this.loadData();
  }

  loadCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (res: any[]) => {
        const list = Array.isArray(res) ? res : ((res as any)?.data ?? []);
        const seen = new Set<string>();
        const companyList = list
          .filter(
            (c: any) => c.COMPANY_CODE && !seen.has(c.COMPANY_CODE) && seen.add(c.COMPANY_CODE),
          )
          .map((c: any) => ({
            code: String(c.COMPANY_CODE),
            label: `${c.COMPANY_CODE} - ${c.COMPANY_NAME}`,
          }));

        queueMicrotask(() => {
          this.companyList = companyList;
          this.cdr.markForCheck();
        });
      },
      error: () => {},
    });
  }

  loadData() {
    this.isLoading = true;
    this.resignService.getEmployeeAll().subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res.data ?? []);
        this.allEmployees = raw.map((e: any) => this.mapEmployee(e));
        this.buildOptions();
        this.applyFilter();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  mapEmployee(e: any) {
    const nickname = e.NICKNAME ?? '';
    return {
      ...e,
      nameThai1: e.NAMFIRSTT ?? '',
      nameThai2: e.NAMLASTT ?? '',
      nameThai3: nickname ? `(${nickname})` : '',
      nameEng1: e.NAMFIRSTE ?? '',
      nameEng2: e.NAMLASTE ?? '',
      dept1: e.COSTCENT ?? '',
      dept2: e.NAMECOSTCENT ?? '',
      EMAIL: e.EMAIL?.toLowerCase() ?? '',
      START_DATE: this.formatDate(e.START_DATE),
      RESIGNDATE: this.formatDate(e.RESIGNDATE),
      _search: [e.ID, e.NAMFIRSTT, e.NAMLASTT, e.NAMFIRSTE, e.NAMLASTE, e.NICKNAME]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  }

  formatDate(val: string): string {
    if (!val || val === '-') return '-';
    return val.replace(/-/g, '/');
  }

  buildOptions() {
    this.statusOptions = [
      ...new Set<string>(this.allEmployees.map((e) => e.STATUS).filter(Boolean)),
    ];
    this.departmentOptions = [
      ...new Set<string>(this.allEmployees.map((e) => e.DEPARTMENT).filter(Boolean)),
    ].sort((a, b) => this.sortDepartmentByLeadingNumber(a, b));
    this.filteredDepartmentOptions = [...this.departmentOptions];
  }

  onCompanyChange(code: string) {
    this.filterCompany = code ?? '';
    this.filterDepartment = '';
    this.filteredDepartmentOptions = code
      ? [
          ...new Set<string>(
            this.allEmployees
              .filter((e) => e.COMPANY === code)
              .map((e) => e.DEPARTMENT)
              .filter(Boolean),
          ),
        ].sort((a, b) => this.sortDepartmentByLeadingNumber(a, b))
      : [...this.departmentOptions];
    this.applyFilter();
  }

  private sortDepartmentByLeadingNumber(a: string, b: string): number {
    const numberA = Number(a.match(/^\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
    const numberB = Number(b.match(/^\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);

    return numberA - numberB || a.localeCompare(b, 'th');
  }

  applyFilter() {
    const text = this.filterText.toLowerCase();
    this.filteredEmployees = this.allEmployees.filter((e) => {
      const matchText = !text || e._search.includes(text);
      const matchStatus = !this.filterStatus || e.STATUS === this.filterStatus;
      const matchCompany = !this.filterCompany || e.COMPANY === this.filterCompany;
      const matchDept = !this.filterDepartment || e.DEPARTMENT === this.filterDepartment;
      return matchText && matchStatus && matchCompany && matchDept;
    });
    this.totalItems = this.filteredEmployees.length;
    this.currentPage = 0;
    this.updatePage();
  }

  updatePage() {
    const start = this.currentPage * this.pageSize;
    this.pagedEmployees = this.filteredEmployees.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePage();
  }

  setPageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 0;
    this.updatePage();
  }

  exportCurrentPage(): void {
    if (!this.pagedEmployees.length) return;

    const rows = this.pagedEmployees.map((emp) => ({
      'รหัสพนักงาน': emp.ID ?? '-',
      'ชื่อ (ไทย)': [emp.nameThai1, emp.nameThai2, emp.nameThai3].filter(Boolean).join(' '),
      'ชื่อ (English)': [emp.nameEng1, emp.nameEng2].filter(Boolean).join(' '),
      'บริษัท': emp.COMPANY ?? '-',
      'แผนก': [emp.dept1, emp.dept2].filter(Boolean).join(' '),
      'AD User': emp.AD_USER || '-',
      'เบอร์โทร': emp.TEL || '-',
      'Email': emp.EMAIL || '-',
      'สถานะ': emp.STATUS || '-',
      'วันที่เริ่มงาน': emp.START_DATE || '-',
      'วันที่ลาออก': emp.RESIGNDATE || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 30 },
      { wch: 12 },
      { wch: 35 },
      { wch: 20 },
      { wch: 16 },
      { wch: 32 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
    ];

    const range = XLSX.utils.decode_range(worksheet['!ref']!);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      if (!headerCell) continue;

      headerCell.s = {
        font: { bold: true, color: { rgb: '000000' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'FFD966' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    const statusColumn = 8;
    for (let row = 1; row <= range.e.r; row++) {
      const statusCell = worksheet[XLSX.utils.encode_cell({ r: row, c: statusColumn })];
      if (!statusCell) continue;

      const status = String(statusCell.v ?? '').toLowerCase();
      if (status === 'active') {
        statusCell.s = {
          font: { bold: true, color: { rgb: '008000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      } else if (status === 'resigned') {
        statusCell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: 'FF0000' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    const blackBorder = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (!cell) continue;
        cell.s = { ...(cell.s ?? {}), border: blackBorder };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      cellStyles: true,
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(
      blob,
      `employee-list-page-${this.currentPage + 1}-${this.formatExportDate(new Date())}.xlsx`,
    );
  }

  private formatExportDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  async copyThaiName(emp: any) {
    const fullName = `${emp.nameThai1 ?? ''} ${emp.nameThai2 ?? ''}`.trim();
    await this.copyText(fullName, `${emp.ID}:thai`);
  }

  async copyEnglishName(emp: any) {
    const fullName = `${emp.nameEng1 ?? ''} ${emp.nameEng2 ?? ''}`.trim();
    await this.copyText(fullName, `${emp.ID}:english`);
  }

  async copyDepartment(emp: any) {
    const department = `${emp.dept1 ?? ''} ${emp.dept2 ?? ''}`.trim();
    await this.copyText(department, `${emp.ID}:department`);
  }

  private async copyText(text: string, fieldKey: string) {
    if (!text) return;

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        this.copyTextFallback(text);
      }
    } else {
      this.copyTextFallback(text);
    }

    this.copiedField.set(fieldKey);

    clearTimeout(this.copyResetTimer);
    this.copyResetTimer = setTimeout(() => {
      if (this.copiedField() === fieldKey) this.copiedField.set(null);
    }, 1500);
  }

  private copyTextFallback(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);
    textarea.select();

    try {
      const copied = document.execCommand('copy');
      if (!copied) throw new Error('Copy command was rejected by the browser');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
