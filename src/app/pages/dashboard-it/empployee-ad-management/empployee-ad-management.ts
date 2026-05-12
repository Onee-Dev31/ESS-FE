import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { PageHeaderComponent } from '../../../components/shared/page-header/page-header';
import { PaginationComponent } from '../../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../../components/shared/skeleton/skeleton';
import Swal from 'sweetalert2';
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

  isEditOpen = false;
  editEmp: any = null;
  editAdUser = '';

  isResetOpen = false;
  resetEmp: any = null;
  resetNewPassword = '';
  resetShowPassword = false;

  adInfoMap: { [adUser: string]: { IsDisabled: string; IsLocked: string } } = {};
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

  openEdit(emp: any) {
    this.editEmp = emp;
    this.editAdUser = emp.adUser ?? '';
    this.isEditOpen = true;
  }

  closeEdit() {
    this.isEditOpen = false;
    this.editEmp = null;
    this.editAdUser = '';
  }

  private loadAdInfo(employees: any[]) {
    const withAd = employees.filter((e) => e.adUser);
    if (!withAd.length) return;

    const requests = withAd.map((e) =>
      this.empAdService.getAdUserInfo(e.adUser).pipe(
        map((res) => ({ adUser: e.adUser, data: res })),
        catchError(() => of({ adUser: e.adUser, data: null })),
      ),
    );

    forkJoin(requests).subscribe((results) => {
      const newMap: { [k: string]: any } = {};
      results.forEach((r) => {
        if (r.data) newMap[r.adUser] = r.data;
      });
      this.adInfoMap = newMap;
      this.cdr.detectChanges();
    });
  }

  async toggleDisable(emp: any) {
    if (!emp.adUser) return;

    const info = this.adInfoMap[emp.adUser];
    const isDisabled = info?.IsDisabled === 'Yes';
    const actionTh = isDisabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน';

    const result = await Swal.fire({
      title: `ยืนยันการ${actionTh} Account?`,
      text: `AD User: ${emp.adUser}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;

    const api$ = isDisabled
      ? this.empAdService.enableAccount(emp.adUser)
      : this.empAdService.disableAccount(emp.adUser);

    api$.subscribe({
      next: () => {
        this.adInfoMap = {
          ...this.adInfoMap,
          [emp.adUser]: { ...info, IsDisabled: isDisabled ? 'No' : 'Yes' },
        };
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: `${actionTh}สำเร็จ`, confirmButtonText: 'ตกลง' });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err?.error?.message ?? 'ลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
        });
      },
    });
  }

  openReset(emp: any) {
    this.resetEmp = emp;
    this.resetNewPassword = '';
    this.resetShowPassword = false;
    this.isResetOpen = true;
  }

  closeReset() {
    this.isResetOpen = false;
    this.resetEmp = null;
    this.resetNewPassword = '';
  }

  confirmReset() {
    if (!this.resetNewPassword || !this.resetEmp) return;

    this.empAdService.resetPassword(this.resetEmp.adUser, this.resetNewPassword).subscribe({
      next: () => {
        this.closeReset();
        this.cdr.detectChanges();
        setTimeout(() => {
          Swal.fire({ icon: 'success', title: 'Reset Password สำเร็จ', confirmButtonText: 'ตกลง' });
        }, 300);
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err?.error?.message ?? 'ลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
        });
      },
    });
  }

  async extendPassword(emp: any) {
    if (!emp.adUser) return;

    const result = await Swal.fire({
      title: 'ยืนยัน Extend Password?',
      text: `AD User: ${emp.adUser}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;

    this.empAdService.extendPasswordExpiration(emp.adUser).subscribe({
      next: () => {
        this.loadAdInfo([emp]);
        Swal.fire({ icon: 'success', title: 'Extend Password สำเร็จ', confirmButtonText: 'ตกลง' });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err?.error?.message ?? 'ลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
        });
      },
    });
  }

  async toggleLock(emp: any) {
    const info = this.adInfoMap[emp.adUser];
    const isLocked = info?.IsLocked === 'Locked';
    const actionTh = isLocked ? 'ปลดล็อก' : 'ล็อก';

    const result = await Swal.fire({
      title: `ยืนยันการ${actionTh} User?`,
      text: `AD User: ${emp.adUser}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;

    const api$ = isLocked
      ? this.empAdService.unlockUser(emp.adUser)
      : this.empAdService.lockUserAccount(emp.adUser);

    api$.subscribe({
      next: () => {
        this.adInfoMap = {
          ...this.adInfoMap,
          [emp.adUser]: { ...info, IsLocked: isLocked ? 'Unlocked' : 'Locked' },
        };
        this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: `${actionTh}สำเร็จ`, confirmButtonText: 'ตกลง' });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: err?.error?.message ?? 'ลองใหม่อีกครั้ง',
          confirmButtonText: 'ตกลง',
        });
      },
    });
  }

  confirmEdit() {
    if (!this.editEmp) return;

    const emp = this.editEmp;
    const payload = {
      codeMpId: emp.employeeId,
      adUser: this.editAdUser,
      empTypeId: emp.empTypeId ?? null,
      staEmp: emp.employeeStatus ?? '',
      firstName: emp.nameEng1 ?? emp.firstName ?? '',
      lastName: emp.nameEng2 ?? emp.lastName ?? '',
      displayName: `${emp.nameThai1 ?? ''} ${emp.nameThai2 ?? ''}`.trim(),
      email: emp.email ?? '',
      jobTitle: emp.position ?? '',
      department: emp.department ?? '',
      company: emp.companyCode ?? '',
      description: '',
      adUserOld: emp.adUser ?? '',
    };

    this.empAdService.updateEmployeeX1(payload).subscribe({
      next: () => {
        this.closeEdit();
        this.cdr.detectChanges();
        setTimeout(() => {
          Swal.fire({
            icon: 'success',
            title: 'อัปเดตสำเร็จ',
            text: `อัปเดต AD User สำหรับ ${payload.codeMpId} เรียบร้อยแล้ว`,
            confirmButtonText: 'ตกลง',
          }).then(() => this.loadData(this.currentPage + 1, this.pageSize));
        }, 300);
      },
      error: (err) => {
        this.closeEdit();
        this.cdr.detectChanges();
        setTimeout(() => {
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: err?.error?.message ?? 'ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่',
            confirmButtonText: 'ตกลง',
          });
        }, 300);
      },
    });
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
    const nickname = item.nickname ?? item.Nickname ?? '';
    const [headName1, headName2] = this.splitAtSpace(item.HeadName ?? '');
    return {
      employeeId: item.EmployeeID ?? '',
      nameThai1: item.FirstNameT ?? '',
      nameThai2: item.LastNameT
        ? nickname
          ? `${item.LastNameT} (${nickname})`
          : item.LastNameT
        : '',
      nameEng1: item.FirstName ?? '',
      nameEng2: item.LastName ?? '',
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
      nickname,
      employeeType: item.EmployeeType ?? '',
      employeeStatus: item.EmployeeStatus ?? '',
      empTypeId: item.EmpTypeID ?? null,
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
          this.loadAdInfo(this.employees);
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }
}
