// approval-setup.ts — TypeScript
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApprovalSetupService } from '../../services/approval-setup.service';
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
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import {
  ApprovalSetupGroup,
  ApprovalSetupRow,
  HrApproverEmp,
} from '../../interfaces/approval-setup.interface';
import { onImgError } from '../../utils/image.util';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { ApprovalSetupChainModal } from '../../components/modals/approval-setup-chain-modal/approval-setup-chain-modal';
import { environment } from '../../../environments/environment';

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

  // ===== Filter =====
  filterCompany = '';
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

  ngOnInit() {
    this.loadSetupList();
    this.setupEmpSearch();
  }

  getTotalCount(): number {
    return this.groupedList().reduce((total, group) => {
      return total + group.departments.length;
    }, 0);
  }

  applyFilter() {
    const keyword = this.searchKeyword()?.toLowerCase() || '';
    const skipFilter = this.filterSkip();

    const filtered = this.originalGroupedList()
      .map((group) => {
        const departments = group.departments.filter((dep: any) => {
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

          return matchKeyword && matchSkip;
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
        console.log(res); // --- IGNORE ---
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
      secretaryEmpNo: emp.SecretaryEmpNo,
      secretaryEmpName: emp.SecretaryName,
      approve1EmpNo: emp.Approver1EmpNo,
      approve1EmpName: emp.Approver1Name,
      approve2EmpNo: emp.HeadOfApprover1EmpNo,
      approve2EmpName: emp.HeadOfApprover1Name,
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
