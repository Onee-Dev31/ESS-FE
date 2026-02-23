import { Component, computed, inject, Inject, PLATFORM_ID, signal } from '@angular/core';
import { Employee } from './employeeData.interface';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2'
import { MOCK_EMPLOYEES } from '../../utils/mock-employee.util';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { en_US, NzI18nService, zh_CN } from 'ng-zorro-antd/i18n';
import { LoadingService } from '../../services/loading';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ResignManagementService } from '../../services/resign-management.service';
import { SwalService } from '../../services/swal.service';
import { createListingComputeds_v2, createListingState } from '../../utils/listing.util';
import { EmptyStateComponent } from "../../components/shared/empty-state/empty-state";
import { PaginationComponent } from "../../components/shared/pagination/pagination";
import { MasterDataService } from '../../services/master-data.service';
import { NzSelectModule } from "ng-zorro-antd/select";

interface EmployeeFormData {
  empCode: string; //CODEMPID
  firstNameTh: string; //NAMFIRSTT
  lastNameTh: string; //NAMLASTT
  firstNameEn: string; //NAMFIRSTE
  lastNameEn: string; //NAMLASTE
  nickName: string; //NICKNAME
  department: string; //DEPARTMENT
  company: string; //COMPANY_NAME [COMPANY_CODE]
  type: string; // ? 
  adUser: string; //AD_USER
  position: string; //POST
}


@Component({
  selector: 'app-resign-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    SkeletonComponent,
    PageHeaderComponent,
    NzModalModule,
    EmptyStateComponent,
    PaginationComponent,
    NzSelectModule
  ],
  templateUrl: './resign-management.html',
  styleUrl: './resign-management.scss',
})
export class ResignManagement {
  pageTitle = signal<string>('รายการพนักงาน');

  private loadingService = inject(LoadingService);
  private resignService = inject(ResignManagementService);
  private swalService = inject(SwalService);
  private masterService = inject(MasterDataService);

  isLoading = this.loadingService.loading('resign-table');

  // MASTER
  companyList: any[] = []
  departmentList: any[] = []

  activeData = signal<EmployeeFormData[]>([]);
  activeListing = createListingState();
  activeComps = createListingComputeds_v2(this.activeData, this.activeListing);

  // New Filters
  filterCompany = signal<any>('');
  filterDepartment = signal<any>('');
  filterMonth = signal<string>('');

  appliedCompany = signal<any>(null);
  appliedDepartment = signal<any>(null);
  appliedSearch = signal<string>(''); // ค่าที่กดค้นหาแล้ว
  searchText = signal('');

  employee: Employee[] = [];
  isViewOpen = false;
  selected?: Employee;
  isFlipped = false;
  lastDate: any = '';
  effectiveDate: any = '';

  page = 1;                 // หน้าเริ่มต้น
  pageSize = 5;             // จำนวนต่อหน้า
  pageSizeOptions = [5, 10, 20, 50];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private i18n: NzI18nService,
  ) {
    this.employee = MOCK_EMPLOYEES; // ใช้ข้อมูลจำลองจาก mock-employee.util.ts
    this.i18n.setLocale(en_US);
  }

  ngOnInit() {
    this.getEmployee();
    this.getCompanies();
    this.getDepartments();
    this.loadingService.start('resign-table');
    setTimeout(() => {
      this.loadingService.stop('resign-table');
    }, 1500);
  }


  filteredDepartmentList = computed(() => {
    const company = this.filterCompany();

    if (!company) return [];

    return this.departmentList.filter(dep =>
      dep.COMPANY_CODE === company.COMPANY_CODE
    );
  });


  trackByEmpCode(_: number, item: Employee) {
    return item.empCode;
  }

  onView(emp: any) {
    this.selected = emp;
    // reset required fields ทุกครั้งที่เปิด
    this.lastDate = emp.lastDate;
    this.effectiveDate = emp.effectiveDate;
    this.isViewOpen = true;
  }

  closeViewModal() {
    this.isViewOpen = false;
    this.selected = undefined;
    this.isFlipped = false;
  }

  cancel() {
    this.isFlipped = false
    if (!this.selected) {
      this.lastDate = null
      this.effectiveDate = null
    }
  }

  async onConfirmModal(): Promise<void> {
    if (!this.selected) return;

    if (!this.lastDate || !this.effectiveDate) {
      await Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอก Last Date และ Effective Date', 'warning');
      return;
    }

    this.isViewOpen = false

    const result = await Swal.fire({
      title: 'ยืนยันการทำรายการใช่หรือไม่?',
      text: `พนักงาน: ${this.selected.empCode} ${this.selected.firstName} ${this.selected.lastName}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });


    if (!result.isConfirmed) {
      this.isViewOpen = true
      return;
    }

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

  convertToFullDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const [day, month, year] = dateStr.split('/');

    // ใส่เวลาปัจจุบัน
    const now = new Date();

    return new Date(
      +year,
      +month - 1,
      +day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
  }

  // Function
  private mapApiData(items: any[]): EmployeeFormData[] {
    console.log("items >> ", items)

    return items.map((item: any) => ({
      empCode: item.CODEMPID,
      firstNameTh: item.NAMFIRSTT,
      lastNameTh: item.NAMLASTT,
      firstNameEn: item.NAMFIRSTE,
      lastNameEn: item.NAMLASTE,
      nickName: item.NICKNAME,
      department: item.DEPARTMENT,
      company: item.COMPANY_NAME + ' [' + item.COMPANY_CODE + ']',
      type: '',
      adUser: item.AD_USER,
      position: item.POST
    }));
  }

  goToPage(page: number) {
    this.activeListing.pageSize()
    this.getEmployee(
      page + 1, // ถ้า backend เริ่มที่ 1
      this.activeListing.pageSize()
    );
  }

  setPageSize(size: number) {
    this.activeListing.pageSize.set(size);
    this.activeListing.currentPage.set(0);

    this.getEmployee(1, size);
  }

  onCompanyChange(company: any) {
    this.filterCompany.set(company);
    this.filterDepartment.set(null);
  }

  applyFilter() {
    const searchText = this.searchText();
    const company = this.filterCompany();
    const department = this.filterDepartment();
    console.log(searchText, company, department)
    this.activeListing.currentPage.set(0);
    // this.resignListing.currentPage.set(0);

    // this.loadInitialData();
  }


  //GET

  getEmployee(
    page: number = 1,
    pageSize: number = 10
  ) {

    this.loadingService.start('resign-table');
    this.resignService.getEmployee({
      page,
      pageSize,
    }).subscribe({
      next: (res) => {
        console.log(res);
        const items = res.data ?? []
        this.activeData.set(this.mapApiData(items));
        this.activeListing.totalItems.set(res.totalRows ?? 0);
        this.activeListing.totalPages.set(res.totalPages ?? 1);
        this.activeListing.currentPage.set((res.page ?? 1) - 1);
        this.loadingService.stop('resign-table');
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        this.loadingService.stop('resign-table');
      }
    });
  }

  // GET MASTER
  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
        // console.log(data);
        this.companyList = data
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  getDepartments() {
    this.masterService.getDepartmentMaster().subscribe({
      next: (data) => {
        // console.log(data);
        this.departmentList = data
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

}
