import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PageHeaderComponent } from '../../../../components/shared/page-header/page-header';
import { SkeletonComponent } from '../../../../components/shared/skeleton/skeleton';
import { EmptyStateComponent } from '../../../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../../../components/shared/pagination/pagination';
import { ResignManagementService } from '../../../../services/resign-management.service';
import { MasterDataService } from '../../../../services/master-data.service';

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
        this.companyList = list
          .filter(
            (c: any) => c.COMPANY_CODE && !seen.has(c.COMPANY_CODE) && seen.add(c.COMPANY_CODE),
          )
          .map((c: any) => ({
            code: c.COMPANY_CODE,
            label: `${c.COMPANY_CODE} - ${c.COMPANY_NAME}`,
          }));
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
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
    ];
    this.filteredDepartmentOptions = [...this.departmentOptions];
  }

  onCompanyChange(code: string) {
    this.filterCompany = code;
    this.filterDepartment = '';
    this.filteredDepartmentOptions = code
      ? [
          ...new Set<string>(
            this.allEmployees
              .filter((e) => e.COMPANY === code)
              .map((e) => e.DEPARTMENT)
              .filter(Boolean),
          ),
        ]
      : [...this.departmentOptions];
    this.applyFilter();
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
}
