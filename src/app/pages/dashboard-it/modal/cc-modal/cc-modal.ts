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
import { EmpAdService } from '../../../../services/emp-ad-service';
import { SwalService } from '../../../../services/swal.service';

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

  employees: any[] = [];
  filteredEmployees: any[] = [];

  selectedCC: any[] = [];

  searchText = '';
  isLoadingEmployees = signal(false);
  isSaving = false;

  constructor(
    private empAdService: EmpAdService,
    private itServiceService: ItServiceService,
    private swalService: SwalService,
  ) {}

  ngOnInit(): void {
    const employee = JSON.parse(localStorage.getItem('employee') ?? '{}');

    this.executedBy = String(employee?.CODEMPID ?? '').trim();

    console.log('executedBy:', this.executedBy);
    this.loadEmployees();
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

    console.log('getEmployees params:', params);

    this.empAdService.getEmployees(params).subscribe({
      next: (res: any) => {
        console.log('getEmployees response:', res);
        console.log('getEmployees data:', res?.data);

        this.employees = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

        console.log('employees:', this.employees);
        console.log('first employee:', this.employees[0]);

        this.filteredEmployees = [];
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
      const code = String(emp.EmployeeID ?? '').trim();

      if (!code || selectedCodes.has(code)) {
        return false;
      }

      const firstName = String(emp.FirstNameT ?? '')
        .trim()
        .toLowerCase();
      const lastName = String(emp.LastNameT ?? '')
        .trim()
        .toLowerCase();
      const nickname = String(emp.nickname ?? '')
        .trim()
        .toLowerCase();

      const fullName = `${firstName} ${lastName}`.trim();

      return (
        code.toLowerCase().includes(keyword) ||
        firstName.includes(keyword) ||
        lastName.includes(keyword) ||
        fullName.includes(keyword) ||
        nickname.includes(keyword)
      );
    });
  }

  getEmployeeCode(emp: any): string {
    return String(emp?.ID ?? '').trim();
  }

  trackEmployee(emp: any): string {
    return String(emp.ID ?? emp.CODEMPID ?? emp.codeempid ?? emp.EMAIL ?? '');
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchText = input.value;
    this.filterEmployees();
  }

  addEmployee(emp: any): void {
    const code = String(emp.EmployeeID ?? '').trim();

    if (!code) return;

    const exists = this.selectedCC.some((cc) => String(cc.codeempid ?? '').trim() === code);

    if (exists) return;

    this.selectedCC = [
      ...this.selectedCC,
      {
        codeempid: code,
        name: this.getEmployeeName(emp),
        email: emp.Email ?? emp.email ?? '',
        department: emp.Department ?? '',
        company: emp.Company ?? '',
      },
    ];

    this.filterEmployees();
  }

  removeCC(cc: any): void {
    const code = cc.codeempid ?? cc.CODEMPID;

    this.selectedCC = this.selectedCC.filter((item) => (item.codeempid ?? item.CODEMPID) !== code);

    // คนที่ลบจะกลับมาในผลค้นหา
    this.filterEmployees();
  }
  getEmployeeName(emp: any): string {
    const firstName = String(emp.FirstNameT ?? '').trim();
    const lastName = String(emp.LastNameT ?? '').trim();
    const nickname = String(emp.nickname ?? '').trim();

    const fullName = `${firstName} ${lastName}`.trim();

    return nickname ? `${fullName} (${nickname})` : fullName;
  }

  async save(): Promise<void> {
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
