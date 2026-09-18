import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  OnInit,
  OnChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';
import { ItServiceService } from '../../../../services/it-service.service';
import { MasterService } from '../../../../services/master.service';
import { SwalService } from '../../../../services/swal.service';

interface CcEmployee {
  codeempid: string;
  name: string;
  nickname: string;
  email: string;
  department: string;
  company: string;
}

@Component({
  selector: 'app-cc-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cc-modal.html',
  styleUrl: './cc-modal.scss',
})
export class CcModal implements OnInit, OnChanges {
  @Input() ticket: any;
  @Input() isItDashboard = false;

  // คนที่เป็นผู้ดำเนินการ
  @Input() executedBy = '';

  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  employees: CcEmployee[] = [];
  filteredEmployees: CcEmployee[] = [];

  selectedCC: any[] = [];

  searchText = '';
  isLoadingEmployees = signal(false);
  isSaving = false;

  constructor(
    private masterService: MasterService,
    private itServiceService: ItServiceService,
    private swalService: SwalService,
  ) {}

  ngOnInit(): void {
    const employee = JSON.parse(localStorage.getItem('employee') ?? '{}');

    this.executedBy = String(employee?.CODEMPID ?? '').trim();

    // console.log('executedBy:', this.executedBy);
    if (this.isItDashboard) this.loadEmployees();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticket']) {
      const ccList = this.ticket?.ccList ?? [];

      this.selectedCC = ccList.map((cc: any) => ({
        codeempid: String(cc.codeempid ?? cc.CODEMPID ?? cc.ID ?? '').trim(),

        name: cc.name ?? cc.NAME ?? '',
        email: cc.email ?? cc.EMAIL ?? '',
        department: cc.department ?? cc.NAMECOSTCENT ?? cc.department_name ?? '',
        company: cc.company ?? cc.COMPANY_NAME ?? cc.company_name ?? '',
      }));
    }
  }

  getEmployeeImage(empCode: string): string {
    return `${environment.employeeImageUrl}/${empCode}.jpg`;
  }

  private loadEmployees(): void {
    this.isLoadingEmployees.set(true);

    const params = {
      pageNumber: 1,
      pageSize: 2000,
    };

    this.masterService.getEmployees(params).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.employees = items.map((emp: any): CcEmployee => {
          const firstName = String(emp.FirstNameT ?? '').trim();
          const lastName = String(emp.LastNameT ?? '').trim();

          return {
            codeempid: String(emp.EmployeeID ?? '').trim(),
            name: String(emp.FullName ?? '').trim() || `${firstName} ${lastName}`.trim(),
            nickname: String(emp.Nickname ?? '').trim(),
            email: String(emp.Email ?? '').trim(),
            department: String(emp.DepartmentName ?? emp.Department ?? '').trim(),
            company: String(emp.CompanyName ?? '').trim(),
          };
        });
        this.filterEmployees();
        this.isLoadingEmployees.set(false);
      },
      error: (err) => {
        console.error('getEmployees error:', err);

        this.employees = [];
        this.filteredEmployees = [];
        this.isLoadingEmployees.set(false);
      },
    });
  }

  filterEmployees(): void {
    const keyword = this.searchText.trim().toLowerCase();

    if (!keyword) {
      this.filteredEmployees = [];
      return;
    }

    const selectedCodes = new Set(this.selectedCC.map((cc) => String(cc.codeempid ?? '').trim()));

    this.filteredEmployees = this.employees.filter((emp) => {
      const code = this.getEmployeeCode(emp);
      if (!code || selectedCodes.has(code)) {
        return false;
      }

      return (
        code.toLowerCase().includes(keyword) ||
        emp.name.toLowerCase().includes(keyword) ||
        emp.nickname.toLowerCase().includes(keyword)
      );
    });
  }

  getEmployeeCode(emp: CcEmployee): string {
    return emp.codeempid;
  }

  trackEmployee(emp: CcEmployee): string {
    return this.getEmployeeCode(emp);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchText = input.value;
    this.filterEmployees();
  }

  addEmployee(emp: CcEmployee): void {
    if (!this.isItDashboard) return;
    const code = this.getEmployeeCode(emp);

    if (!code) return;

    const exists = this.selectedCC.some((cc) => String(cc.codeempid ?? '').trim() === code);

    if (exists) return;

    this.selectedCC = [
      ...this.selectedCC,
      {
        codeempid: code,
        name: this.getEmployeeName(emp),
        email: emp.email,
        department: emp.department,
        company: emp.company,
      },
    ];

    this.filterEmployees();
  }

  removeCC(cc: any): void {
    if (!this.isItDashboard) return;
    const code = cc.codeempid ?? cc.CODEMPID;

    this.selectedCC = this.selectedCC.filter((item) => (item.codeempid ?? item.CODEMPID) !== code);

    // คนที่ลบจะกลับมาในผลค้นหา
    this.filterEmployees();
  }
  getEmployeeName(emp: CcEmployee): string {
    return emp.nickname ? `${emp.name} (${emp.nickname})` : emp.name;
  }

  async save(): Promise<void> {
    if (!this.isItDashboard) return;
    if (!this.ticket?.ticketId && !this.ticket?.id) {
      return;
    }

    if (!this.executedBy) {
      console.error('executedBy is required');
      return;
    }

    const result = await this.swalService.confirm(
      'ยืนยันการแก้ไข CC',
      'ต้องการบันทึกรายชื่อผู้รับสำเนา (CC) ใช่หรือไม่?',
    );

    if (!result.isConfirmed) {
      return;
    }

    const ticketId = this.ticket.ticketId ?? this.ticket.id;

    const usersCC = this.selectedCC.map((cc) => cc.codeempid ?? cc.CODEMPID).filter(Boolean);

    this.isSaving = true;

    this.itServiceService.syncTicketCC(ticketId, usersCC, this.executedBy).subscribe({
      next: (res) => {
        this.isSaving = false;

        this.swalService.success('บันทึกสำเร็จ', 'อัปเดตรายชื่อผู้รับสำเนา (CC) เรียบร้อยแล้ว');

        this.submitModal.emit({
          ...res,
          ccList: this.selectedCC,
        });
      },
      error: (err) => {
        this.isSaving = false;

        console.error('sync CC error:', err);

        this.swalService.error('บันทึกไม่สำเร็จ', 'ไม่สามารถอัปเดตรายชื่อผู้รับสำเนา (CC) ได้');
      },
    });
  }

  close(): void {
    this.closeModal.emit();
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;

    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }
}
