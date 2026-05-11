import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PageHeaderComponent } from '../../../components/shared/page-header/page-header';
import { PaginationComponent } from '../../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../../components/shared/skeleton/skeleton';
import { EmpAdService } from '../../../services/emp-ad-service';
import { MasterDataService } from '../../../services/master-data.service';
import { EmpAdForm } from './emp-ad-form/emp-ad-form';

@Component({
  selector: 'app-empployee-ad-management',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzModalModule,
    NzSelectModule,
    PageHeaderComponent,
    PaginationComponent,
    EmptyStateComponent,
    SkeletonComponent,
    EmpAdForm,
  ],
  templateUrl: './empployee-ad-management.html',
  styleUrl: './empployee-ad-management.scss',
})
export class EmpployeeAdManagement {
  pageTitle = 'จัดการ Employee AD';
  isLoading = false;

  showForm = false;
  formMode: 'view' | 'add' = 'view';
  selectedEmployeeId = '';
  isFilterOpen = false;

  searchText = '';
  filterCompany: any = null;
  filterDepartment: any = null;

  appliedSearch = '';
  appliedCompany = '';
  appliedDepartment = '';

  companyList: any[] = [];
  departmentList: any[] = [];
  filteredDepartmentList: any[] = [];

  employees: any[] = [];
  totalItems = 0;
  totalPages = 1;
  currentPage = 0;
  pageSize = 50;

  appliedFilters: { key: string; label: string; value: string }[] = [];
  hasFilters = false;

  constructor(
    private empAdService: EmpAdService,
    private masterService: MasterDataService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.getCompanies();
    this.getDepartments();
    this.loadData(1, this.pageSize);
  }

  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
        this.companyList = data;
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  getDepartments() {
    this.masterService.getDepartmentMaster().subscribe({
      next: (data) => {
        this.departmentList = data;
      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  onCompanyChange(company: any) {
    this.filterCompany = company;
    this.filterDepartment = null;
    this.filteredDepartmentList = company
      ? this.departmentList.filter((d) => d.COMPANY_CODE === company.COMPANY_CODE)
      : [];
  }

  updateAppliedFilters() {
    const filters: { key: string; label: string; value: string }[] = [];
    if (this.appliedCompany)
      filters.push({ key: 'company', label: 'Company', value: this.appliedCompany });
    if (this.appliedDepartment)
      filters.push({ key: 'department', label: 'Department', value: this.appliedDepartment });
    if (this.appliedSearch)
      filters.push({ key: 'search', label: 'Search', value: `"${this.appliedSearch}"` });
    this.appliedFilters = filters;
    this.hasFilters = filters.length > 0;
  }

  toggleFilter() {
    this.isFilterOpen = !this.isFilterOpen;
  }

  applyFilter() {
    this.appliedSearch = this.searchText;
    this.appliedCompany = this.filterCompany?.COMPANY_CODE ?? '';
    this.appliedDepartment = this.filterDepartment
      ? `${this.filterDepartment.COSTCENT} ${this.filterDepartment.NAMECOSTCENT}`
      : '';
    this.currentPage = 0;
    this.updateAppliedFilters();
    this.loadData(1, this.pageSize);
  }

  removeFilter(key: string) {
    if (key === 'company') {
      this.filterCompany = null;
      this.filterDepartment = null;
      this.filteredDepartmentList = [];
      this.appliedCompany = '';
      this.appliedDepartment = '';
    }
    if (key === 'department') {
      this.filterDepartment = null;
      this.appliedDepartment = '';
    }
    if (key === 'search') {
      this.searchText = '';
      this.appliedSearch = '';
    }
    this.currentPage = 0;
    this.updateAppliedFilters();
    this.loadData(1, this.pageSize);
  }

  clearAllFilters() {
    this.filterCompany = null;
    this.filterDepartment = null;
    this.filteredDepartmentList = [];
    this.searchText = '';
    this.appliedCompany = '';
    this.appliedDepartment = '';
    this.appliedSearch = '';
    this.currentPage = 0;
    this.updateAppliedFilters();
    this.loadData(1, this.pageSize);
  }

  openAdd() {
    this.formMode = 'add';
    this.selectedEmployeeId = '';
    this.showForm = true;
  }

  openView(emp: any) {
    this.formMode = 'view';
    this.selectedEmployeeId = emp.employeeId;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedEmployeeId = '';
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadData(page + 1, this.pageSize);
  }

  setPageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadData(1, size);
  }

  private splitAtSpace(text: string): [string, string] {
    const idx = text.indexOf(' ');
    if (idx === -1) return [text, ''];
    return [text.substring(0, idx), text.substring(idx + 1)];
  }

  private mapEmployee(item: any) {
    const [nameThai1, nameThai2] = this.splitAtSpace(item.NameThai ?? '');
    const [nameEng1, nameEng2] = this.splitAtSpace(item.NameEng ?? '');
    const [headName1, headName2] = this.splitAtSpace(item.HeadName ?? '');
    return {
      employeeId: item.EmployeeID ?? '',
      nameThai1,
      nameThai2,
      nameEng1,
      nameEng2,
      firstName: item.FirstName ?? '',
      lastName: item.LastName ?? '',
      email: item.Email ?? '',
      department: item.Department ?? '',
      position: item.Position ?? '',
      companyName: item.CompanyName ?? '',
      companyCode: item.CompanyCode ?? '',
      headName1,
      headName2,
      adUser: item.ADUser ?? '',
      nickname: item.Nickname ?? item.nickname ?? '',
      employeeType: item.EmployeeType ?? '',
      employeeStatus: item.EmployeeStatus ?? '',
    };
  }

  private loadData(page: number, pageSize: number) {
    this.isLoading = true;

    this.empAdService
      .getEmployees({
        pageNumber: page,
        pageSize,
        searchText: this.appliedSearch || undefined,
        companyCode: this.appliedCompany || undefined,
        department: this.appliedDepartment || undefined,
      })
      .subscribe({
        next: (res: any) => {
          const items = Array.isArray(res) ? res : (res.data ?? []);
          const pagination = res.pagination;

          this.employees = items.map((i: any) => this.mapEmployee(i));

          if (pagination) {
            this.totalItems = pagination.total ?? items.length;
            this.totalPages = pagination.totalPages ?? Math.ceil(this.totalItems / pageSize);
            this.currentPage = (pagination.page ?? page) - 1;
          } else {
            this.totalItems = items.length;
            this.totalPages = Math.ceil(items.length / pageSize) || 1;
          }

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }
}
