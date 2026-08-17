import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AvatarPreviewModal } from '../../../../components/modals/avatar-preview-modal/avatar-preview-modal';
import { SkeletonComponent } from '../../../../components/shared/skeleton/skeleton';
import {
  ApprovalSetupGroup,
  ApprovalSetupRow,
  HrApproverEmp,
} from '../../../../interfaces/approval-setup.interface';
import { ApprovalSetupService } from '../../../../services/approval-setup.service';
import { AuthService } from '../../../../services/auth.service';
import { SwalService } from '../../../../services/swal.service';
import { onImgError } from '../../../../utils/image.util';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-department-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, SkeletonComponent, AvatarPreviewModal],
  templateUrl: './department-setup.html',
  styleUrl: './department-setup.scss',
})
export class DepartmentSetup implements OnInit {
  private approvalService = inject(ApprovalSetupService);
  private swalService = inject(SwalService);
  private authService = inject(AuthService);

  onImgError = onImgError;

  getEmployeeImage(empCode: string): string {
    return `${environment.employeeImageUrl}/${empCode}.jpg`;
  }

  originalGroupedList = signal<any[]>([]); // เก็บตัวเต็ม
  groupedList = signal<{ companyCode: string; companyName: string; departments: any[] }[]>([]);
  isLoading = signal(false);
  isDrawerOpen = signal(false);
  isSaving = signal(false);

  departmentCompanyFilter = signal('');
  departmentDeptFilter = signal('');
  searchKeyword = signal('');
  filterSkip = signal<boolean | null>(null);

  // ===== Drawer / Edit =====
  editingRow = signal<any | null>(null);
  selectedSecretary = signal<any | null>(null);
  skipSecretary = signal(false);

  // ===== Employee Search =====
  employeeResults = signal<any[]>([]);
  isSearching = signal(false);
  empSearchKeyword = '';
  private empSearch$ = new Subject<string>();

  departmentCompanyList = computed(() =>
    this.originalGroupedList().map((group) => ({
      code: group.companyCode,
      name: group.companyName,
    })),
  );

  departmentDeptList = computed(() => {
    const companyCode = this.departmentCompanyFilter();
    if (!companyCode) return [];

    return (
      this.originalGroupedList()
        .find((group) => group.companyCode === companyCode)
        ?.departments.map((department: any) => ({
          costCent: department.costCent,
          name: department.costCenterName,
        })) ?? []
    );
  });

  ngOnInit() {
    this.loadSetupList();
    this.setupEmpSearch();
  }

  refresh() {
    this.loadSetupList();
  }

  getTotalCount(): number {
    return this.groupedList().reduce((total, group) => {
      return total + group.departments.length;
    }, 0);
  }

  onDepartmentCompanyChange(companyCode: string | null) {
    this.departmentCompanyFilter.set(companyCode ?? '');
    this.departmentDeptFilter.set('');
  }

  clearDepartmentFilter() {
    this.departmentCompanyFilter.set('');
    this.departmentDeptFilter.set('');
    this.searchKeyword.set('');
    this.applyFilter();
  }

  applyFilter() {
    const keyword = this.searchKeyword()?.toLowerCase() || '';
    const companyFilter = this.departmentCompanyFilter();
    const departmentFilter = this.departmentDeptFilter();
    const skipFilter = this.filterSkip();

    const filtered = this.originalGroupedList()
      .filter((group) => !companyFilter || group.companyCode === companyFilter)
      .map((group) => {
        const departments = group.departments.filter((dep: any) => {
          const matchDepartment = !departmentFilter || dep.costCent === departmentFilter;
          // 🔎 search
          const matchKeyword =
            !keyword ||
            dep.costCent?.toLowerCase().includes(keyword) ||
            dep.costCenterName?.toLowerCase().includes(keyword) ||
            dep.secretaryEmpName?.toLowerCase().includes(keyword) ||
            dep.secretaryEmpNo?.toLowerCase().includes(keyword) ||
            dep.approve1EmpName?.toLowerCase().includes(keyword) ||
            dep.approve1EmpNo?.toLowerCase().includes(keyword) ||
            dep.approve2EmpName?.toLowerCase().includes(keyword) ||
            dep.approve2EmpNo?.toLowerCase().includes(keyword) ||
            dep.approve3EmpName?.toLowerCase().includes(keyword) ||
            dep.approve3EmpNo?.toLowerCase().includes(keyword) ||
            dep.hrApprovers?.some(
              (emp: HrApproverEmp) =>
                emp.empNo?.toLowerCase().includes(keyword) ||
                emp.empName?.toLowerCase().includes(keyword),
            ) ||
            dep.itDirectorEmpName?.toLowerCase().includes(keyword) ||
            dep.itDirectorEmpNo?.toLowerCase().includes(keyword);

          // 🔘 skip filter
          let matchSkip = true;
          if (skipFilter === true) {
            matchSkip = !dep.secretaryEmpNo;
          } else if (skipFilter === false) {
            matchSkip = !!dep.secretaryEmpNo;
          }

          return matchDepartment && matchKeyword && matchSkip;
        });

        return {
          ...group,
          departments,
        };
      })
      .filter((group) => group.departments.length > 0);

    this.groupedList.set(filtered);
  }

  // ===== Load =====
  loadSetupList() {
    this.isLoading.set(true);
    this.approvalService.getApprovalSetupList().subscribe({
      next: (res) => {
        const mapped = (res?.data ?? []).map((emp: any) => this.mapSetupRow(emp));
        const grouped = this.groupByCompany(mapped);

        this.originalGroupedList.set(grouped);
        this.groupedList.set(grouped);

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      },
    });
  }

  // ===== Open Drawer =====
  openEdit(row: any) {
    console.log(row);
    this.editingRow.set({ ...row });
    this.skipSecretary.set(row.isSkipSecretary);
    this.selectedSecretary.set(
      row.secretaryEmpNo ? { empNo: row.secretaryEmpNo, empName: row.secretaryEmpName } : null,
    );
    this.employeeResults.set([]);
    this.empSearchKeyword = '';
    this.isDrawerOpen.set(true);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.editingRow.set(null);
  }

  // ===== Employee Search =====
  setupEmpSearch() {
    this.empSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((kw) => {
          if (!kw.trim()) {
            this.employeeResults.set([]);
            return [];
          }
          this.isSearching.set(true);
          return this.approvalService.searchEmployees(kw);
        }),
      )
      .subscribe({
        next: (res: any) => {
          const mapped = (res?.data ?? []).map((emp: any) => ({
            empNo: emp.EmpNo,
            empName: emp.FullName,
            companyCode: emp.CompanyCode,
            costCent: emp.CostCent,
            departmentName: emp.Department,
            positionName: emp.Position,
            email: emp.EMAIL,
          }));
          this.employeeResults.set(mapped);
          this.isSearching.set(false);
        },
        error: () => this.isSearching.set(false),
      });
  }

  onEmpSearch(keyword: string) {
    this.empSearch$.next(keyword);
  }

  selectEmployee(emp: any) {
    this.selectedSecretary.set(emp);
    this.empSearchKeyword = emp.empName ?? emp.empNo;
    this.employeeResults.set([]);
  }

  clearSecretary() {
    this.selectedSecretary.set(null);
    this.empSearchKeyword = '';
  }

  onSkipToggle(skip: boolean) {
    this.skipSecretary.set(skip);
    // if (skip) this.clearSecretary();
  }

  // ===== Save =====
  async save() {
    const row = this.editingRow();
    if (!row) return;

    const confirmed = await this.swalService.confirm('ยืนยันการบันทึก');
    if (!confirmed.isConfirmed) return;

    this.isSaving.set(true);
    this.swalService.loading('กำลังบันทึก...');

    const secretaryEmpNo = this.skipSecretary() ? null : (this.selectedSecretary()?.empNo ?? null);

    this.approvalService
      .saveApprovalSetup({
        costCent: row.costCent,
        approve1EmpNo: secretaryEmpNo,
        modifiedBy: this.authService.userData().AD_USER,
        companyCode: row.companyCode ?? '',
      })
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.swalService.success('บันทึกสำเร็จ');
          this.closeDrawer();
          this.loadSetupList();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.swalService.error('เกิดข้อผิดพลาด', err?.error?.message ?? '');
        },
      });
  }

  // MAP
  private mapHrApprovers(empNos: string | null, empNames: string | null): HrApproverEmp[] {
    const nos = empNos
      ? empNos
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const names = empNames
      ? empNames
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    return nos.map((empNo, i) => ({
      empNo,
      empName: names[i] ?? '',
    }));
  }

  private mapSetupRow(emp: any): ApprovalSetupRow {
    return {
      costCent: emp.COSTCENT,
      costCenterName: emp.DepartmentName,
      companyCode: emp.COMPANY_CODE,
      companyName: emp.COMPANY_NAME,
      secretaryEmpNo: emp.SecretaryEmpNo,
      secretaryEmpName: emp.SecretaryName,
      approve1EmpNo: emp.Approver1EmpNo || emp.Approve1EmpNo,
      approve1EmpName: emp.Approver1Name || emp.Approve1Name,
      approve2EmpNo: emp.HeadOfApprover1EmpNo || emp.Approve2EmpNo,
      approve2EmpName: emp.HeadOfApprover1Name || emp.Approve2Name,
      hrApprovers: this.mapHrApprovers(emp.HREmpNo, emp.HRUsers),
      itDirectorEmpNo: emp.ITDirectorEmpNo,
      itDirectorEmpName: emp.ITDirectorName,
      isSkipSecretary: emp.ConfigMode === 'AutoSkip',
      modifiedDate: emp.ModifiedDate,
      modifiedBy: emp.ModifiedBy,
    };
  }

  private groupByCompany(rows: any[]): ApprovalSetupGroup[] {
    const groupMap = new Map<
      string,
      { companyCode: string; companyName: string; departments: any[] }
    >();

    rows.forEach((row) => {
      const key = row.companyCode ?? 'UNKNOWN';
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          companyCode: row.companyCode,
          companyName: row.companyName,
          departments: [],
        });
      }
      groupMap.get(key)!.departments.push(row);
    });

    return Array.from(groupMap.values());
  }
}
