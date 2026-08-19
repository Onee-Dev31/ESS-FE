import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AvatarPreviewModal } from '../../../../components/modals/avatar-preview-modal/avatar-preview-modal';
import { SkeletonComponent } from '../../../../components/shared/skeleton/skeleton';
import { ApprovalSetupRow, HrApproverEmp } from '../../../../interfaces/approval-setup.interface';
import { ApprovalSetupService } from '../../../../services/approval-setup.service';
import { AuthService } from '../../../../services/auth.service';
import { SettingService } from '../../../../services/setting.service';
import { SwalService } from '../../../../services/swal.service';
import { onImgError } from '../../../../utils/image.util';
import { environment } from '../../../../../environments/environment';

interface ApprovalSetupEmployee {
  emp_code: string;
  emp_name: string;
  nickname: string | null;
  numlvl: number;
  Dept: string | null;
  Post: string | null;
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
  head_department?: string | null;
  head_post?: string | null;
  reason?: string;
}

interface DisplayApprover {
  empNo: string;
  empName: string;
  department: string;
  post: string;
  isOverride: boolean;
}

interface BulkEmployeeOverrideRow {
  level: 1 | 2;
  headCode: string;
}

@Component({
  selector: 'app-employee-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, SkeletonComponent, AvatarPreviewModal],
  templateUrl: './employee-setup.html',
  styleUrl: './employee-setup.scss',
})
export class EmployeeSetup implements OnInit {
  private approvalService = inject(ApprovalSetupService);
  private settingService = inject(SettingService);
  private swalService = inject(SwalService);
  private authService = inject(AuthService);

  onImgError = onImgError;

  getEmployeeImage(empCode: string): string {
    return `${environment.employeeImageUrl}/${empCode}.jpg`;
  }

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

  empDisplayEmployees = computed(() => {
    const costCent = this.appliedEmployeeDept();
    if (!costCent) return [];

    const department = this.departmentItems().find((item) => item.cost_cent === costCent);
    if (!department) return [];

    const keyword = this.appliedEmployeeSearchText().toLowerCase().trim();
    const employees = department.employees ?? [];

    // console.log(employees);

    if (!keyword) return employees;

    return employees.filter(
      (employee) =>
        employee.emp_name.toLowerCase().includes(keyword) ||
        employee.emp_code.toLowerCase().includes(keyword) ||
        (employee.nickname ?? '').toLowerCase().includes(keyword) ||
        (employee.Dept ?? '').toLowerCase().includes(keyword) ||
        (employee.Post ?? '').toLowerCase().includes(keyword),
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
    this.loadEmployeeList();
  }

  refresh() {
    this.loadEmployeeList();
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
        // console.log('[EmployeeSetup] Search API responses', { overrides, departmentDefault });
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
        department: override.head_department ?? '',
        post: override.head_post ?? '',
        isOverride: true,
      };
    }

    const departmentDefault = this.employeeDepartmentDefault();
    const empNo = level === 1 ? departmentDefault?.approve1EmpNo : departmentDefault?.approve2EmpNo;
    const empName =
      level === 1 ? departmentDefault?.approve1EmpName : departmentDefault?.approve2EmpName;
    const department =
      level === 1 ? departmentDefault?.approve1Dept : departmentDefault?.approve2Dept;
    const post = level === 1 ? departmentDefault?.approve1Post : departmentDefault?.approve2Post;

    return empNo
      ? {
          empNo,
          empName: empName ?? '',
          department: department ?? '',
          post: post ?? '',
          isOverride: false,
        }
      : null;
  }

  getEmployeeDefaultApprover(level: 1 | 2): DisplayApprover | null {
    const setup = this.employeeDepartmentDefault();
    const empNo = level === 1 ? setup?.approve1EmpNo : setup?.approve2EmpNo;
    const empName = level === 1 ? setup?.approve1EmpName : setup?.approve2EmpName;
    const department = level === 1 ? setup?.approve1Dept : setup?.approve2Dept;
    const post = level === 1 ? setup?.approve1Post : setup?.approve2Post;

    return empNo
      ? {
          empNo,
          empName: empName ?? '',
          department: department ?? '',
          post: post ?? '',
          isOverride: false,
        }
      : null;
  }

  private mapHrApprovers(
    empNos: string | null,
    empNames: string | null,
    empPosts: string | null,
    empDept: string | null,
  ): HrApproverEmp[] {
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
    const posts = empPosts ? empPosts.split(',').map((s) => s.trim()) : [];
    const depts = empDept ? empDept.split(',').map((s) => s.trim()) : [];

    return nos.map((empNo, i) => ({
      empNo,
      empName: names[i] ?? '',
      empPost: posts[i] ?? '',
      empDept: depts[i] ?? '',
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
      secretaryPost: emp.SecretaryPost,
      secretaryDept: emp.SecretaryDepartment,
      approve1EmpNo: emp.Approver1EmpNo || emp.Approve1EmpNo,
      approve1EmpName: emp.Approver1Name || emp.Approve1Name,
      approve1Post: emp.Approver1Post,
      approve1Dept: emp.Approver1Department,
      approve2EmpNo: emp.HeadOfApprover1EmpNo || emp.Approve2EmpNo,
      approve2EmpName: emp.HeadOfApprover1Name || emp.Approve2Name,
      approve2Post: emp.HeadOfApprover1Post,
      approve2Dept: emp.HeadOfApprover1Department,
      hrApprovers: this.mapHrApprovers(emp.HREmpNo, emp.HRUsers, emp.HRPosts, emp.HRDepartments),
      itDirectorEmpNo: emp.ITDirectorEmpNo,
      itDirectorEmpName: emp.ITDirectorName,
      itDirectorPost: emp.ITDirectorPost,
      itDirectorDept: emp.ITDirectorDepartment,
      isSkipSecretary: emp.ConfigMode === 'AutoSkip',
      modifiedDate: emp.ModifiedDate,
      modifiedBy: emp.ModifiedBy,
    };
  }
}
