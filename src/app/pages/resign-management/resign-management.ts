import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { Employee } from './employeeData.interface';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2'
import { MOCK_EMPLOYEES } from '../../utils/mock-employee.util';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { en_US, NzI18nService, zh_CN } from 'ng-zorro-antd/i18n';



@Component({
  selector: 'app-resign-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule
  ],
  templateUrl: './resign-management.html',
  styleUrl: './resign-management.scss',
})
export class ResignManagement {
  employee: Employee[] = [];
  isViewOpen = false;
  selected?: Employee;

  lastDate: Date | null = null;
  effectiveDate: Date | null = null;

  page = 1;                 // หน้าเริ่มต้น
  pageSize = 5;             // จำนวนต่อหน้า
  pageSizeOptions = [5, 10, 20, 50];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private i18n: NzI18nService
  ) {
    this.employee = MOCK_EMPLOYEES; // ใช้ข้อมูลจำลองจาก mock-employee.util.ts
  }

  ngOnInit() {
    this.i18n.setLocale(en_US);
  }

  trackByEmpCode(_: number, item: Employee) {
    return item.empCode;
  }

  onView(emp: Employee) {
    this.selected = emp;
    // reset required fields ทุกครั้งที่เปิด
    this.lastDate = null;
    this.effectiveDate = null;
    this.isViewOpen = true;
  }

  closeViewModal() {
    this.isViewOpen = false;
    this.selected = undefined;
  }

  async onConfirmModal(): Promise<void> {
    if (!this.selected) return;

    if (!this.lastDate || !this.effectiveDate) {
      await Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอก Last Date และ Effective Date', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'ยืนยันการทำรายการใช่หรือไม่?',
      text: `พนักงาน: ${this.selected.empCode} ${this.selected.firstName} ${this.selected.lastName}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: 'กำลังบันทึก...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const payload = {
        empCode: this.selected.empCode,
        lastDate: formatDate(this.lastDate!, 'yyyy-MM-dd', 'en-US'),
        effectiveDate: formatDate(this.effectiveDate!, 'yyyy-MM-dd', 'en-US')
      };

      console.log("payload :", payload)


      // TODO: call API
      // await this.service.confirm(...)
      await new Promise(resolve => setTimeout(resolve, 1500));

      Swal.close();
      await Swal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
      this.closeViewModal();
      return;
    } catch (e: any) {
      Swal.close();
      await Swal.fire('ผิดพลาด', e?.message ?? 'เกิดข้อผิดพลาด', 'error');
      return;
    }
  }

  get totalItems(): number {
    return this.employee.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pagedEmployees(): Employee[] {
    const start = (this.page - 1) * this.pageSize;
    return this.employee.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    // ทำเป็นเลขหน้าแบบสั้น ๆ (ไม่ยาวเป็นร้อย)
    const total = this.totalPages;
    const current = this.page;

    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  setPage(p: number) {
    this.page = Math.min(Math.max(1, p), this.totalPages);
  }

  prevPage() {
    if (this.page > 1) this.page--;
  }

  nextPage() {
    if (this.page < this.totalPages) this.page++;
  }

  onPageSizeChange() {
    this.page = 1; // เปลี่ยนจำนวนต่อหน้าแล้วกลับไปหน้า 1
  }

  // ตัวอย่าง: ถ้ามีลบ/เพิ่มข้อมูล อย่าลืม clamp หน้า
  clampPage() {
    if (this.page > this.totalPages) this.page = this.totalPages;
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  onChange(result: Date): void {
    console.log('onChange: ', result);
  }
}
