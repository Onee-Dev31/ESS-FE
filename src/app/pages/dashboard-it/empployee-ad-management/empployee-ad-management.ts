import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { from, merge, of, Subscription } from 'rxjs';
import { catchError, finalize, map, mergeMap, toArray } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTransferModule, TransferItem } from 'ng-zorro-antd/transfer';
import { SettingService } from '../../../services/setting.service';
import { PageHeaderComponent } from '../../../components/shared/page-header/page-header';
import { PaginationComponent } from '../../../components/shared/pagination/pagination';
import { EmptyStateComponent } from '../../../components/shared/empty-state/empty-state';
import { SkeletonComponent } from '../../../components/shared/skeleton/skeleton';
import Swal from 'sweetalert2';
import { EmpAdService } from '../../../services/emp-ad-service';
import { LoadingService } from '../../../services/loading';
import { MasterDataService } from '../../../services/master-data.service';
import { SwalService } from '../../../services/swal.service';
import { EmpAdForm } from './emp-ad-form/emp-ad-form';
import { ModalShellComponent } from '../../../components/shared/modal-shell/modal-shell';
import { getPasswordError } from '../../../utils/form-validation.util';

@Component({
  selector: 'app-empployee-ad-management',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzModalModule,
    NzSelectModule,
    NzTransferModule,
    PageHeaderComponent,
    PaginationComponent,
    EmptyStateComponent,
    SkeletonComponent,
    EmpAdForm,
    ModalShellComponent,
  ],
  templateUrl: './empployee-ad-management.html',
  styleUrl: './empployee-ad-management.scss',
})
export class EmpployeeAdManagement implements OnDestroy {
  pageTitle = 'จัดการ Employee AD';
  isLoading = false;

  showForm = false;
  formMode: 'view' | 'add' = 'view';
  selectedEmployeeId = '';

  isEditOpen = false;
  isEditSaving = false;
  editEmp: any = null;
  editAdUser = '';
  editEmail = '';
  editTel = '';
  editSelectedEmployee: string | null = null;
  editEmployeeList: { value: string; label: string; adUser: string }[] = [];
  editGroupList: TransferItem[] = [];
  isEditGroupsLoading = false;
  editGroupsLoadFailed = false;
  private editAllGroups: { name: string; distinguishedName: string }[] = [];
  private editRequests = new Subscription();
  private editGroupRequest?: Subscription;

  isResetOpen = false;
  resetEmp: any = null;
  resetNewPassword = '';
  readonly getPasswordError = getPasswordError;
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

  allEmployees: any[] = [];
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
    private loadingService: LoadingService,
    private swalService: SwalService,
    private cdr: ChangeDetectorRef,
    private settingService: SettingService,
  ) {}

  ngOnInit() {
    this.getCompanies();
    this.getDepartments();
    this.loadData();
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
    this.loadData();
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
    this.loadData();
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
    this.loadData();
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
    this.closeEdit();
    this.editRequests = new Subscription();
    this.editRequests.add(
      this.empAdService.getEmployeeDetails(emp.employeeId).subscribe({
        next: (res: any) => {
          this.editEmp = { ...emp, adUser: (res.AD_USER ?? emp.adUser ?? '').trim() };
          this.editAdUser = this.editEmp.adUser;
          this.editEmail = res.EMAIL ?? '';
          this.editTel = res.USR_MOBILE ?? '';
          this.isEditOpen = true;
          this.loadEditGroups(this.editEmp.adUser);
          if (!this.editEmp.adUser) this.loadEditEmployees();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.swalService.error(
            err?.error?.message ?? 'เกิดข้อผิดพลาดขณะโหลดข้อมูลพนักงาน กรุณาลองใหม่',
          );
        },
      }),
    );
  }

  closeEdit() {
    this.editRequests.unsubscribe();
    this.editGroupRequest?.unsubscribe();
    this.isEditOpen = false;
    this.editEmp = null;
    this.editAdUser = '';
    this.editEmail = '';
    this.editTel = '';
    this.editSelectedEmployee = null;
    this.editEmployeeList = [];
    this.editGroupList = [];
    this.editAllGroups = [];
    this.isEditGroupsLoading = false;
    this.editGroupsLoadFailed = false;
  }

  ngOnDestroy() {
    this.editRequests.unsubscribe();
    this.editGroupRequest?.unsubscribe();
  }

  retryEditGroups() {
    if (this.isEditGroupsLoading || !this.editEmp) return;
    const adUser =
      this.editEmp.adUser ||
      this.editEmployeeList.find((employee) => employee.value === this.editSelectedEmployee)
        ?.adUser ||
      '';
    this.loadEditGroups(adUser);
  }

  private loadEditGroups(adUser: string) {
    this.isEditGroupsLoading = true;
    this.editGroupsLoadFailed = false;
    this.editRequests.add(
      merge(
        this.empAdService.getAdUserGroupsByCompany(this.editEmp.companyCode).pipe(
          map((data) => ({ source: 'all' as const, data })),
          catchError(() => {
            this.editGroupsLoadFailed = true;
            this.swalService.error('ไม่สามารถโหลด Groups ของบริษัทได้ กรุณาลองใหม่');
            return of(null);
          }),
        ),
        adUser
          ? this.empAdService.getAdUserGroups(adUser).pipe(
              map((data) => ({ source: 'user' as const, data })),
              catchError(() => {
                this.editGroupsLoadFailed = true;
                this.swalService.error(
                  `ไม่สามารถโหลด Groups ของ AD User: ${adUser} ได้ กรุณาลองใหม่`,
                );
                return of(null);
              }),
            )
          : of(null),
      )
        .pipe(
          finalize(() => {
            this.isEditGroupsLoading = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe((result) => {
          if (!result) return;
          if (result.source === 'all') {
            const items = Array.isArray(result.data) ? result.data : [result.data];
            this.editAllGroups = items.flatMap((item) => item?.groups ?? [item]);
            this.setEditGroupList(
              this.editGroupList
                .filter((group) => group.direction === 'right')
                .map((group) => ({ name: group.title, distinguishedName: group['key'] })),
            );
          } else {
            const user = Array.isArray(result.data) ? result.data[0] : result.data;
            this.setEditGroupList(user?.groups ?? []);
          }
          this.cdr.detectChanges();
        }),
    );
  }

  onEditEmployeeChange(employeeId: string | null) {
    this.editSelectedEmployee = employeeId;
    this.editGroupRequest?.unsubscribe();
    this.isEditGroupsLoading = false;
    this.editGroupsLoadFailed = false;
    this.setEditGroupList([]);
    const adUser = this.editEmployeeList.find((employee) => employee.value === employeeId)?.adUser;
    if (!adUser) return;

    this.isEditGroupsLoading = true;
    this.editGroupRequest = this.empAdService.getAdUserGroups(adUser).subscribe({
      next: (res) => {
        const user = Array.isArray(res) ? res[0] : res;
        this.setEditGroupList(user?.groups ?? []);
        this.isEditGroupsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isEditGroupsLoading = false;
        this.editGroupsLoadFailed = true;
        this.swalService.error('ไม่สามารถโหลด Groups ของพนักงานได้');
        this.cdr.detectChanges();
      },
    });
  }

  private setEditGroupList(selectedGroups: { name: string; distinguishedName: string }[]) {
    const selected = new Set(selectedGroups.map((group) => group.distinguishedName));
    const groups = [...this.editAllGroups, ...selectedGroups].filter(
      (group) =>
        typeof group?.name === 'string' &&
        group.name.trim().length > 0 &&
        typeof group.distinguishedName === 'string' &&
        group.distinguishedName.trim().length > 0,
    );
    this.editGroupList = [
      ...new Map(groups.map((group) => [group.distinguishedName, group])).values(),
    ].map((group) => ({
      key: group.distinguishedName,
      title: group.name,
      direction: selected.has(group.distinguishedName) ? 'right' : 'left',
    }));
  }

  private loadEditEmployees(page = 1) {
    const costCent = this.editEmp.department?.split(' ')[0];
    this.editRequests.add(
      this.settingService
        .getEmployee({
          companyCode: this.editEmp.companyCode,
          costCent,
          page,
          pageSize: 500,
        })
        .subscribe({
          next: (res) => {
            const items = Array.isArray(res) ? res : (res.data ?? []);
            this.editEmployeeList = [
              ...this.editEmployeeList,
              ...items.map((employee: any) => ({
                value: employee.UserID,
                label: `${employee.UserID} - ${employee.FullNameThai ?? ''}`.trim(),
                adUser: employee.ADUsername ?? employee.ADUser ?? '',
              })),
            ];
            if (items.length === 500) this.loadEditEmployees(page + 1);
            this.cdr.detectChanges();
          },
          error: () => this.swalService.error('ไม่สามารถโหลดรายชื่อพนักงานได้'),
        }),
    );
  }

  validateEditTel(event?: Event) {
    if (event) {
      const input = event.target as HTMLInputElement;
      this.editTel = input.value.replace(/\D/g, '');
      input.value = this.editTel;
    }

    return !!this.editTel && this.editTel.length !== 4 && this.editTel.length !== 10;
  }

  private loadAdInfo(employees: any[]): void {
    const adUsers = [...new Set(employees.map((e) => e.adUser?.trim()).filter(Boolean))];

    if (!adUsers.length) {
      this.adInfoMap = {};
      return;
    }

    from(adUsers)
      .pipe(
        mergeMap(
          (adUser) =>
            this.empAdService.getAdUserInfo(adUser).pipe(
              map((data) => ({
                adUser,
                data,
              })),
              catchError(() => of(null)),
            ),
          5,
        ),
        toArray(),
      )
      .subscribe((results) => {
        const newMap: Record<string, any> = {};

        results.forEach((result) => {
          if (result?.data) {
            newMap[result.adUser] = result.data;
          }
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
    if (getPasswordError(this.resetNewPassword) !== '' || !this.resetEmp) return;

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
    if (
      !this.editEmp ||
      this.isEditSaving ||
      this.isEditGroupsLoading ||
      this.editGroupsLoadFailed ||
      this.validateEditTel()
    )
      return;

    const emp = this.editEmp;
    const payload = {
      codeMpId: emp.employeeId,
      adUser: this.editAdUser,
      empTypeId: emp.empTypeId ?? null,
      staEmp: emp.employeeStatus ?? '',
      firstName: emp.nameEng1 ?? emp.firstName ?? '',
      lastName: emp.nameEng2 ?? emp.lastName ?? '',
      displayName: `${emp.nameThai1 ?? ''} ${emp.nameThai2 ?? ''}`.trim(),
      email: this.editEmail,
      USR_MOBILE: this.editTel,
      jobTitle: emp.position ?? '',
      department: emp.department ?? '',
      company: emp.companyCode ?? '',
      description: '',
      adUserOld: emp.adUser ?? '',
      AD_GROUPS: this.editGroupList
        .filter((group) => group.direction === 'right')
        .map((group) => group['key'] as string),
    };

    this.isEditSaving = true;
    this.loadingService.show();
    this.empAdService.updateEmployeeX1(payload).subscribe({
      next: () => {
        this.isEditSaving = false;
        this.loadingService.hide();
        this.closeEdit();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.swalService.success(`อัปเดต AD User สำหรับ ${payload.codeMpId} เรียบร้อยแล้ว`);
          this.loadData();
        }, 300);
      },
      error: (err) => {
        this.isEditSaving = false;
        this.loadingService.hide();
        this.closeEdit();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.swalService.error(err?.error?.message ?? 'ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่');
        }, 300);
      },
    });
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagedEmployees();
  }
  setPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;

    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;

    this.updatePagedEmployees();
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

  private loadData() {
    this.isLoading = true;

    this.empAdService
      .getEmployees({
        pageNumber: 1,
        pageSize: 2000,
        searchText: this.appliedSearch || undefined,
        companyCode: this.appliedCompany || undefined,
        department: this.appliedDepartment || undefined,
      })
      .subscribe({
        next: (res: any) => {
          const items = Array.isArray(res) ? res : (res.data ?? []);

          this.allEmployees = items.map((i: any) => this.mapEmployee(i));

          this.totalItems = this.allEmployees.length;

          this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;

          this.currentPage = 0;

          this.updatePagedEmployees();

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private updatePagedEmployees(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;

    this.employees = this.allEmployees.slice(start, end);

    // โหลด AD เฉพาะคนที่แสดงในหน้านี้
    this.loadAdInfo(this.employees);

    this.cdr.detectChanges();
  }
}
