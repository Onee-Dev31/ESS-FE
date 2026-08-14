// approval-setup.ts — TypeScript
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprovalSetupService } from '../../services/approval-setup.service';
import { SettingService } from '../../services/setting.service';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { SwalService } from '../../services/swal.service';
import { AuthService } from '../../services/auth.service';
import { debounceTime, distinctUntilChanged, forkJoin, Subject, switchMap } from 'rxjs';
import {
  ApprovalSetupGroup,
  ApprovalSetupRow,
  HrApproverEmp,
} from '../../interfaces/approval-setup.interface';
import { onImgError } from '../../utils/image.util';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { ApprovalSetupChainModal } from '../../components/modals/approval-setup-chain-modal/approval-setup-chain-modal';
import { environment } from '../../../environments/environment';

interface ApprovalSetupEmployee {
  emp_code: string;
  emp_name: string;
  nickname: string | null;
  numlvl: number;
}

interface ApprovalSetupDepartment {
  cost_cent: string;
  name_cost_cent: string;
  company_code: string;
  company_name: string;
  employees: ApprovalSetupEmployee[];
}

interface EmployeeApprovalOverride {
  employee_codeempid: string;
  level: number;
  head_codeempid: string;
  head_name: string;
  reason?: string;
}

interface DisplayApprover {
  empNo: string;
  empName: string;
  isOverride: boolean;
}

interface BulkEmployeeOverrideRow {
  level: 1 | 2;
  headCode: string;
}

@Component({
  selector: 'app-approval-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzTagModule,
    NzIconModule,
    NzDrawerModule,
    NzSwitchModule,
    SkeletonComponent,
    ApprovalSetupChainModal,
  ],
  templateUrl: './approval-setup.html',
  styleUrl: './approval-setup.scss',
})
export class ApprovalSetup implements OnInit {
  getEmployeeImage(empCode: string): string {
    return `${environment.employeeImageUrl}/${empCode}.jpg`;
  }

  private approvalService = inject(ApprovalSetupService);
  private settingService = inject(SettingService);
  private swalService = inject(SwalService);
  private authService = inject(AuthService);

  onImgError = onImgError;

  // ===== State =====
  setupList = signal<any[]>([]);
  originalGroupedList = signal<any[]>([]); // เก็บตัวเต็ม
  groupedList = signal<{ companyCode: string; companyName: string; departments: any[] }[]>([]);
  isLoading = signal(false);
  isDrawerOpen = signal(false);
  isSaving = signal(false);
  isSetupModalOpen = signal<boolean>(false);
  activeTab = signal<'department' | 'employee'>('department');

  // ===== Individual setup (same source as /dept-heads) =====
  departmentItems = signal<ApprovalSetupDepartment[]>([]);
  isEmployeeListLoading = signal(false);
  employeeCompanyFilter = signal('');
  employeeDeptFilter = signal('');
  employeeSearchText = signal('');
  appliedEmployeeDept = signal('');
  appliedEmployeeSearchText = signal('');
  employeeOverrides = signal<EmployeeApprovalOverride[]>([]);
  employeeDepartmentDefault = signal<ApprovalSetupRow | null>(null);
  selectedEmployeeCodes = signal<Set<string>>(new Set());
  employeeBulkModalOpen = signal(false);
  employeeBulkRows = signal<BulkEmployeeOverrideRow[]>([]);
  employeeBulkReason = signal('');
  isSavingEmployeeBulk = signal(false);

  // ===== Filter =====
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

  // ===== Computed =====
  filteredList = computed(() => {
    const kw = this.searchKeyword().toLowerCase();
    return this.setupList().filter((row) => {
      const matchKw =
        !kw ||
        row.costCent.toLowerCase().includes(kw) ||
        (row.costCenterName ?? '').toLowerCase().includes(kw) ||
        (row.secretaryEmpName ?? '').toLowerCase().includes(kw) ||
        (row.approve1EmpName ?? '').toLowerCase().includes(kw);
      const matchSkip = this.filterSkip === null ? true : row.isSkipSecretary === this.filterSkip;
      return matchKw && matchSkip;
    });
  });

  employeeCompanyList = computed(() => {
    const companies = new Map<string, string>();
    this.departmentItems().forEach((item) => companies.set(item.company_code, item.company_name));
    return Array.from(companies.entries()).map(([code, name]) => ({ code, name }));
  });

  employeeDeptList = computed(() => {
    const company = this.employeeCompanyFilter();
    return this.departmentItems()
      .filter((item) => !company || item.company_code === company)
      .map((item) => ({ costCent: item.cost_cent, name: item.name_cost_cent }));
  });

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

  empDisplayEmployees = computed(() => {
    const costCent = this.appliedEmployeeDept();
    if (!costCent) return [];

    const department = this.departmentItems().find((item) => item.cost_cent === costCent);
    if (!department) return [];

    const keyword = this.appliedEmployeeSearchText().toLowerCase().trim();
    if (!keyword) return department.employees ?? [];

    return (department.employees ?? []).filter(
      (employee) =>
        employee.emp_name.toLowerCase().includes(keyword) ||
        employee.emp_code.toLowerCase().includes(keyword) ||
        (employee.nickname ?? '').toLowerCase().includes(keyword),
    );
  });

  employeeApproverOptions = computed(() => {
    const employees = new Map<string, ApprovalSetupEmployee>();
    this.departmentItems().forEach((department) =>
      (department.employees ?? []).forEach((employee) => {
        if (!employees.has(employee.emp_code)) employees.set(employee.emp_code, employee);
      }),
    );
    return Array.from(employees.values()).sort((a, b) =>
      a.emp_name.localeCompare(b.emp_name, 'th'),
    );
  });
  employeeBulkApproverOptions = computed(() =>
    this.employeeApproverOptions().filter(
      (employee) => !this.selectedEmployeeCodes().has(employee.emp_code),
    ),
  );

  selectedEmployeeCount = computed(() => this.selectedEmployeeCodes().size);
  selectedEmployees = computed(() =>
    this.empDisplayEmployees().filter((employee) =>
      this.selectedEmployeeCodes().has(employee.emp_code),
    ),
  );
  areAllEmployeesSelected = computed(() => {
    const employees = this.empDisplayEmployees();
    return (
      employees.length > 0 &&
      employees.every((employee) => this.selectedEmployeeCodes().has(employee.emp_code))
    );
  });
  areSomeEmployeesSelected = computed(() => {
    const selectedCount = this.selectedEmployees().length;
    return selectedCount > 0 && selectedCount < this.empDisplayEmployees().length;
  });

  ngOnInit() {
    this.loadSetupList();
    this.loadEmployeeList();
    this.setupEmpSearch();
  }

  setTab(tab: 'department' | 'employee') {
    this.activeTab.set(tab);
  }

  refreshCurrentTab() {
    if (this.activeTab() === 'employee') {
      this.loadEmployeeList();
      return;
    }
    this.loadSetupList();
  }

  loadEmployeeList() {
    this.isEmployeeListLoading.set(true);
    this.settingService.getDeptHeads().subscribe({
      next: (res) => {
        this.departmentItems.set(res?.data ?? []);
        this.isEmployeeListLoading.set(false);
      },
      error: () => this.isEmployeeListLoading.set(false),
    });
  }

  onEmployeeCompanyChange(companyCode: string) {
    this.employeeCompanyFilter.set(companyCode ?? '');
    this.employeeDeptFilter.set('');
    this.appliedEmployeeDept.set('');
    this.employeeOverrides.set([]);
    this.employeeDepartmentDefault.set(null);
    this.clearEmployeeSelection();
  }

  applyEmployeeFilter() {
    const costCent = this.employeeDeptFilter();
    this.appliedEmployeeDept.set(costCent);
    this.appliedEmployeeSearchText.set(this.employeeSearchText());
    this.employeeOverrides.set([]);
    this.employeeDepartmentDefault.set(null);
    this.clearEmployeeSelection();

    if (!costCent) return;

    this.isEmployeeListLoading.set(true);
    forkJoin({
      overrides: this.settingService.getEmpHeadOverrides(costCent),
      departmentDefault: this.approvalService.getApprovalSetupByCostCenter(costCent),
    }).subscribe({
      next: ({ overrides, departmentDefault }) => {
        // console.log('overrides >>> ', overrides, departmentDefault);
        this.employeeOverrides.set(overrides?.data ?? []);

        const rawDefault = Array.isArray(departmentDefault?.data)
          ? departmentDefault.data[0]
          : departmentDefault?.data;

        this.employeeDepartmentDefault.set(rawDefault ? this.mapSetupRow(rawDefault) : null);
        this.isEmployeeListLoading.set(false);
      },
      error: (error) => {
        console.error(error);
        this.isEmployeeListLoading.set(false);
      },
    });
  }

  clearEmployeeFilter() {
    this.employeeCompanyFilter.set('');
    this.employeeDeptFilter.set('');
    this.employeeSearchText.set('');
    this.appliedEmployeeDept.set('');
    this.appliedEmployeeSearchText.set('');
    this.employeeOverrides.set([]);
    this.employeeDepartmentDefault.set(null);
    this.clearEmployeeSelection();
  }

  isEmployeeSelected(employeeCode: string): boolean {
    return this.selectedEmployeeCodes().has(employeeCode);
  }

  toggleEmployeeSelection(employeeCode: string) {
    const selected = new Set(this.selectedEmployeeCodes());
    selected.has(employeeCode) ? selected.delete(employeeCode) : selected.add(employeeCode);
    this.selectedEmployeeCodes.set(selected);
  }

  toggleAllEmployees() {
    this.selectedEmployeeCodes.set(
      this.areAllEmployeesSelected()
        ? new Set<string>()
        : new Set(this.empDisplayEmployees().map((employee) => employee.emp_code)),
    );
  }

  clearEmployeeSelection() {
    this.selectedEmployeeCodes.set(new Set());
  }

  openEmployeeBulkEdit() {
    const employeeCodes = Array.from(this.selectedEmployeeCodes());
    if (!employeeCodes.length) return;

    this.employeeBulkRows.set(
      ([1, 2] as const).map((level) => {
        const overrides = this.employeeOverrides().filter(
          (item) => employeeCodes.includes(item.employee_codeempid) && Number(item.level) === level,
        );
        const uniqueHeads = new Set(overrides.map((item) => item.head_codeempid));
        const allHaveSameValue =
          overrides.length === employeeCodes.length && uniqueHeads.size === 1;
        return {
          level,
          headCode: allHaveSameValue ? overrides[0].head_codeempid : '',
        };
      }),
    );
    this.employeeBulkReason.set('');
    this.employeeBulkModalOpen.set(true);
  }

  closeEmployeeBulkEdit() {
    if (this.isSavingEmployeeBulk()) return;
    this.employeeBulkModalOpen.set(false);
    this.employeeBulkRows.set([]);
    this.employeeBulkReason.set('');
  }

  updateEmployeeBulkRow(index: number, headCode: string | null) {
    this.employeeBulkRows.update((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, headCode: headCode ?? '' } : row,
      ),
    );
  }

  saveEmployeeBulkOverride() {
    const employeeCodes = Array.from(this.selectedEmployeeCodes());
    if (!employeeCodes.length) return;

    const executedBy =
      this.authService.userData()?.CODEMPID ?? this.authService.userData()?.AD_USER;
    const requests = employeeCodes.flatMap((employeeCode) =>
      this.employeeBulkRows().flatMap((row) => {
        const existing = this.employeeOverrides().some(
          (item) => item.employee_codeempid === employeeCode && Number(item.level) === row.level,
        );
        if (!row.headCode) {
          return existing
            ? [this.settingService.deleteEmpHeadOverride(employeeCode, row.level)]
            : [];
        }
        return [
          this.settingService.saveEmpHeadOverride({
            employee_codeempid: employeeCode,
            level: row.level,
            head_codeempid: row.headCode,
            reason: this.employeeBulkReason() || undefined,
            ...(existing ? { updated_by: executedBy } : { created_by: executedBy }),
          }),
        ];
      }),
    );

    if (!requests.length) {
      this.closeEmployeeBulkEdit();
      return;
    }

    this.isSavingEmployeeBulk.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.isSavingEmployeeBulk.set(false);
        this.employeeBulkModalOpen.set(false);
        this.employeeBulkRows.set([]);
        this.swalService.success(
          'บันทึกสำเร็จ',
          `ตั้งค่าผู้อนุมัติให้พนักงาน ${employeeCodes.length} คนเรียบร้อยแล้ว`,
        );
        this.clearEmployeeSelection();
        this.applyEmployeeFilter();
      },
      error: (error) => {
        this.isSavingEmployeeBulk.set(false);
        this.swalService.error('เกิดข้อผิดพลาด', error?.error?.message ?? 'ไม่สามารถบันทึกได้');
      },
    });
  }

  getEmployeeApprover(employeeCode: string, level: 1 | 2): DisplayApprover | null {
    const override = this.employeeOverrides().find(
      (item) => item.employee_codeempid === employeeCode && Number(item.level) === Number(level),
    );

    if (override?.head_codeempid) {
      return {
        empNo: override.head_codeempid,
        empName: override.head_name,
        isOverride: true,
      };
    }

    const departmentDefault = this.employeeDepartmentDefault();
    const empNo = level === 1 ? departmentDefault?.approve1EmpNo : departmentDefault?.approve2EmpNo;
    const empName =
      level === 1 ? departmentDefault?.approve1EmpName : departmentDefault?.approve2EmpName;

    return empNo
      ? {
          empNo,
          empName: empName ?? '',
          isOverride: false,
        }
      : null;
  }

  getEmployeeDefaultApprover(level: 1 | 2): DisplayApprover | null {
    const setup = this.employeeDepartmentDefault();
    const empNo = level === 1 ? setup?.approve1EmpNo : setup?.approve2EmpNo;
    const empName = level === 1 ? setup?.approve1EmpName : setup?.approve2EmpName;

    return empNo
      ? {
          empNo,
          empName: empName ?? '',
          isOverride: false,
        }
      : null;
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

        this.setupList.set(mapped);
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

  openSetupModal() {
    this.isSetupModalOpen.set(true);
  }

  closeSetupModal() {
    this.isSetupModalOpen.set(false);
  }
}
