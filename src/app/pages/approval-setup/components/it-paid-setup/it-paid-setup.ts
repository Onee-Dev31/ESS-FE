import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { AvatarPreviewModal } from '../../../../components/modals/avatar-preview-modal/avatar-preview-modal';
import { SkeletonComponent } from '../../../../components/shared/skeleton/skeleton';
import { ApprovalSetupService } from '../../../../services/approval-setup.service';
import { AuthService } from '../../../../services/auth.service';
import { SwalService } from '../../../../services/swal.service';
import { onImgError } from '../../../../utils/image.util';
import { environment } from '../../../../../environments/environment';

interface ItPaidApproverRow {
  ITReqApproverPaidID: number;
  COSTCENT: string;
  NAMECOSTCENT: string;
  COMPANY_CODE: string;
  COMPANY_NAME: string;
  ApproverCode: string | null;
  ApproverName: string | null;
  Department: string | null;
  POST: string | null;
  CreatedDate: string;
  ModifiedBy: string | null;
  ModifiedDate: string | null;
}

interface EmployeeSearchResult {
  code: string;
  name: string;
  department: string;
}

@Component({
  selector: 'app-it-paid-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, SkeletonComponent, AvatarPreviewModal],
  templateUrl: './it-paid-setup.html',
  styleUrl: './it-paid-setup.scss',
})
export class ItPaidSetup implements OnInit {
  private approvalService = inject(ApprovalSetupService);
  private authService = inject(AuthService);
  private swalService = inject(SwalService);
  private employeeSearch$ = new Subject<string>();

  rows = signal<ItPaidApproverRow[]>([]);
  isLoading = signal(false);
  companyFilter = signal('');
  departmentFilter = signal('');
  searchText = signal('');
  appliedCompany = signal('');
  appliedDepartment = signal('');
  appliedSearchText = signal('');
  editingRow = signal<ItPaidApproverRow | null>(null);
  employeeResults = signal<EmployeeSearchResult[]>([]);
  selectedApprover = signal<EmployeeSearchResult | null>(null);
  employeeSearchText = signal('');
  isSearchingEmployee = signal(false);
  isSaving = signal(false);
  onImgError = onImgError;

  companyList = computed(() => {
    const companies = new Map<string, string>();
    this.rows().forEach((row) => companies.set(row.COMPANY_CODE, row.COMPANY_NAME));
    return Array.from(companies, ([code, name]) => ({ code, name }));
  });

  departmentList = computed(() =>
    this.rows()
      .filter((row) => !this.companyFilter() || row.COMPANY_CODE === this.companyFilter())
      .map((row) => ({ code: row.COSTCENT, name: row.NAMECOSTCENT })),
  );

  displayRows = computed(() => {
    const keyword = this.appliedSearchText().trim().toLowerCase();
    return this.rows().filter((row) => {
      const matchesCompany = !this.appliedCompany() || row.COMPANY_CODE === this.appliedCompany();
      const matchesDepartment =
        !this.appliedDepartment() || row.COSTCENT === this.appliedDepartment();
      const matchesKeyword =
        !keyword ||
        row.COSTCENT?.toLowerCase().includes(keyword) ||
        row.NAMECOSTCENT?.toLowerCase().includes(keyword) ||
        row.ApproverCode?.toLowerCase().includes(keyword) ||
        row.ApproverName?.toLowerCase().includes(keyword) ||
        row.Department?.toLowerCase().includes(keyword) ||
        row.POST?.toLowerCase().includes(keyword);
      return matchesCompany && matchesDepartment && matchesKeyword;
    });
  });

  groupedDisplayRows = computed(() => {
    const groups = new Map<
      string,
      { companyCode: string; companyName: string; departments: ItPaidApproverRow[] }
    >();

    this.displayRows().forEach((row) => {
      if (!groups.has(row.COMPANY_CODE)) {
        groups.set(row.COMPANY_CODE, {
          companyCode: row.COMPANY_CODE,
          companyName: row.COMPANY_NAME,
          departments: [],
        });
      }
      groups.get(row.COMPANY_CODE)!.departments.push(row);
    });

    return Array.from(groups.values());
  });

  ngOnInit() {
    this.loadData();
    this.setupEmployeeSearch();
  }

  refresh() {
    this.loadData();
  }

  getEmployeeImage(employeeCode: string): string {
    return `${environment.employeeImageUrl}/${employeeCode}.jpg`;
  }

  onCompanyChange(companyCode: string | null) {
    this.companyFilter.set(companyCode ?? '');
    this.departmentFilter.set('');
  }

  applyFilter() {
    this.appliedCompany.set(this.companyFilter());
    this.appliedDepartment.set(this.departmentFilter());
    this.appliedSearchText.set(this.searchText());
  }

  clearFilter() {
    this.companyFilter.set('');
    this.departmentFilter.set('');
    this.searchText.set('');
    this.appliedCompany.set('');
    this.appliedDepartment.set('');
    this.appliedSearchText.set('');
  }

  openEdit(row: ItPaidApproverRow) {
    this.editingRow.set(row);
    this.employeeResults.set([]);
    this.employeeSearchText.set(row.ApproverName ?? '');
    this.selectedApprover.set(
      row.ApproverCode && row.ApproverName
        ? { code: row.ApproverCode, name: row.ApproverName, department: row.NAMECOSTCENT }
        : null,
    );
  }

  closeEdit() {
    if (this.isSaving()) return;
    this.editingRow.set(null);
    this.employeeResults.set([]);
    this.selectedApprover.set(null);
    this.employeeSearchText.set('');
  }

  onEmployeeSearch(keyword: string) {
    this.employeeSearchText.set(keyword);
    this.selectedApprover.set(null);
    this.employeeSearch$.next(keyword);
  }

  selectApprover(employee: EmployeeSearchResult) {
    this.selectedApprover.set(employee);
    this.employeeSearchText.set(employee.name);
    this.employeeResults.set([]);
  }

  async saveApprover() {
    const row = this.editingRow();
    const approver = this.selectedApprover();
    if (!row || !approver) return;

    const confirmed = await this.swalService.confirm(
      `ยืนยันเปลี่ยนผู้อนุมัติเป็น ${approver.name} (${approver.code})`,
    );
    if (!confirmed.isConfirmed) return;

    const user = this.authService.userData();
    this.isSaving.set(true);

    console.log('Saving approver:', {
      itReqApproverPaidID: row.ITReqApproverPaidID,
      costcent: row.COSTCENT,
      approverCode: approver.code,
      approverName: approver.name,
      modifiedBy: user?.AD_USER ?? user?.CODEMPID ?? '',
    });
    this.approvalService
      .updateApproverItWithPaid({
        itReqApproverPaidID: row.ITReqApproverPaidID,
        costcent: row.COSTCENT,
        approverCode: approver.code,
        approverName: approver.name,
        modifiedBy: user?.AD_USER ?? user?.CODEMPID ?? '',
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeEdit();
          this.swalService.success('บันทึกสำเร็จ');
          this.loadData();
        },
        error: (error) => {
          this.isSaving.set(false);
          this.swalService.error('เกิดข้อผิดพลาด', error?.error?.message ?? 'ไม่สามารถบันทึกได้');
        },
      });
  }

  private setupEmployeeSearch() {
    this.employeeSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((keyword) => {
          if (!keyword.trim()) {
            this.employeeResults.set([]);
            return [];
          }
          this.isSearchingEmployee.set(true);
          return this.approvalService.searchEmployees(keyword);
        }),
      )
      .subscribe({
        next: (response: any) => {
          this.employeeResults.set(
            (response?.data ?? []).map((employee: any) => ({
              code: employee.EmpNo,
              name: employee.FullName,
              department: employee.Department,
            })),
          );
          this.isSearchingEmployee.set(false);
        },
        error: () => this.isSearchingEmployee.set(false),
      });
  }

  private loadData() {
    this.isLoading.set(true);
    this.approvalService.getApproverItWithPaid().subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : (response?.data ?? []);
        console.log('IT Paid Approver Data:', data);
        this.rows.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
