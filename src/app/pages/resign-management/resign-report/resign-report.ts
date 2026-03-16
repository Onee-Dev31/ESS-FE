import { CommonModule, formatDate } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { SkeletonComponent } from '../../../components/shared/skeleton/skeleton';
import { PageHeaderComponent } from '../../../components/shared/page-header/page-header';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { EmptyStateComponent } from '../../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../../components/shared/pagination/pagination';
import dayjs from 'dayjs';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { DateUtilityService } from '../../../services/date-utility.service';
import { LoadingService } from '../../../services/loading';
import { MasterDataService } from '../../../services/master-data.service';
import { ResignManagementService } from '../../../services/resign-management.service';
import { SwalService } from '../../../services/swal.service';
import { createListingState, createListingComputeds_v2 } from '../../../utils/listing.util';
import { Employee } from '../employeeData.interface';
// import * as XLSX from 'xlsx';
import * as XLSX from 'xlsx-js-style';

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
  lastDate: string;
  effectiveDate: string;
  expireDate: string;
}

@Component({
  selector: 'app-resign-report',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    SkeletonComponent,
    NzModalModule,
    EmptyStateComponent,
    PaginationComponent,
    NzSelectModule,
  ],
  templateUrl: './resign-report.html',
  styleUrl: './resign-report.scss',
})
export class ResignReport {
  pageTitle = signal<string>('รายการพนักงานลาออก');

  private loadingService = inject(LoadingService);
  private resignService = inject(ResignManagementService);
  private swalService = inject(SwalService);
  private masterService = inject(MasterDataService);
  private authService = inject(AuthService);
  dataUtil = inject(DateUtilityService);

  isLoading = this.loadingService.loading('resign-table');

  // MASTER
  companyList = signal<any[]>([]);
  departmentList = signal<any[]>([]);

  // TABLE
  resignData = signal<EmployeeFormData[]>([]);
  resignListing = createListingState();
  resignComps = createListingComputeds_v2(this.resignData, this.resignListing);

  // New Filters
  filterCompany = signal<any>(null);
  filterDepartment = signal<any>(null);
  filterMonth = signal<string>('');

  appliedCompany = signal<any>(null);
  appliedDepartment = signal<any>(null);
  appliedSearch = signal<string>(''); // ค่าที่กดค้นหาแล้ว
  searchText = signal<string>('');

  IS_INFO = signal<boolean>(false)
  selectedEmployees = signal<Map<string, EmployeeFormData>>(new Map());

  MODE_EDIT: boolean = false;

  isViewOpen = false;
  selected?: Employee;
  isFlipped = false;
  lastDate = signal<Date | null>(null);
  effectiveDate = signal<Date | null>(null);

  constructor(
  ) {
  }

  ngOnInit() {
    this.getCompanies();
    this.getDepartments();
    this.loadInitialData();
  }

  filteredDepartmentList = computed(() => {
    const company = this.filterCompany();
    const departments = this.departmentList();
    if (!company) return [];

    return departments.filter(dep =>
      dep.COMPANY_CODE === company.COMPANY_CODE
    );
  });

  trackByEmpCode(_: number, item: Employee) {
    return item.empCode;
  }

  onView(emp: any) {
    this.selected = emp;
    this.IS_INFO.set(true)
  }

  closeInfoModal() {
    this.IS_INFO.set(false)
  }

  submitInfo(data: any) {
    this.IS_INFO.set(false)
  }

  approve() {
    const selected = Array.from(this.selectedEmployees().values());

    if (selected.length === 0) {
      this.swalService.warning('แจ้งเตือน', 'กรุณาเลือกพนักงานก่อนทำรายการ');
      return;
    }

    const employeeList = `
      <div style="max-height:200px;overflow:auto;text-align:center">
      ${selected
        .map(emp => `${emp.empCode} - ${emp.firstNameTh} ${emp.lastNameTh}`)
        .join('<br>')}
      </div>
      `;

    const requests = selected.map(emp => ({
      samAccountName: emp.adUser,
      expireDate: dayjs(emp.lastDate).format('YYYY-MM-DD')
    }))

    const payload = {
      actionEmp: this.authService.userData().AD_USER.toLowerCase(),
      requests: requests
    }

    console.log(payload)

    // this.swalService.confirm('ยืนยันการ Approve อีกครั้ง', "", employeeList)
    //   .then(result => {
    //     if (!result.isConfirmed) return;

    //     this.resignService.updateADManagementResign(payload).subscribe(
    //       {
    //         next: (res) => {
    //           console.log(res);
    //           this.swalService.success('สำเร็จ', '')
    //           this.loadInitialData();
    //         },
    //         error: (error) => {
    //           console.error('Error fetching data:', error);
    //           this.swalService.warning('แจ้งเตือน', error.error)
    //         }
    //       }
    //     )

    //     this.swalService.success("ทำรายการสำเร็จ", "(mock)")
    //   });
  }

  async deleteEmployeeInResign(emp: any) {
    this.swalService.confirm('ยืนยันการลบ', emp.empCode + ' ' + emp.firstNameTh + ' ' + emp.lastNameTh)
      .then(result => {
        if (!result.isConfirmed) return;
        this.swalService.loading('กำลังบันทึก...')
        this.resignService.deleteEmployeeResign(emp.id)
          .pipe(
            finalize(() => {
              this.loadInitialData();
            })
          )
          .subscribe(
            {
              next: (res) => {
                // console.log(res);
                this.swalService.close();
                this.swalService.success('สำเร็จ', 'ลบพนักงานออกจากresign')
                this.loadInitialData();
              },
              error: (error) => {
                console.error('Error fetching data:', error);
                this.swalService.close();
                this.swalService.warning('แจ้งเตือน', error.error)
              }
            }
          )
      });
  }

  exportData() {

    const data = this.resignData();

    const header = [
      [
        'ลำดับ', 'รหัส', 'ชื่อ-นามสกุล', 'ชื่อ-นามสกุล (ภาษาอังกฤษ)', 'ชื่อเล่น',
        'ตำแหน่ง', 'แผนก', 'บริษัท', 'Last Date', 'Effective Date',
        'System AD Info', '', '',
        'Actual AD Info', '', '',
        'Compare'
      ],
      [
        '', '', '', '', '', '', '', '', '', '',
        'AD User', 'Status', 'Expiry Date',
        'AD User', 'Status', 'Expiry Date',
        ''
      ]
    ];

    const rows = data.map((item: any, index: number) => [
      index + 1,
      item.empCode,
      item.firstNameTh + " " + item.lastNameTh,
      item.firstNameEn + " " + item.lastNameEn,
      item.nickName,
      item.position,
      item.department,
      item.company,
      dayjs(item.lastDate).format('DD/MM/YYYY'),
      dayjs(item.effectiveDate).format('DD/MM/YYYY'),
      item.systemAdUser,
      item.systemStatus,
      item.systemExpireDate,
      item.actualAdUser,
      item.actualStatus,
      item.actualExpireDate,
      item.compare
    ]);

    const worksheet: XLSX.WorkSheet =
      XLSX.utils.aoa_to_sheet([...header, ...rows]);

    // merge header
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
      { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } },
      { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } },
      { s: { r: 0, c: 6 }, e: { r: 1, c: 6 } },
      { s: { r: 0, c: 7 }, e: { r: 1, c: 7 } },
      { s: { r: 0, c: 8 }, e: { r: 1, c: 8 } },
      { s: { r: 0, c: 9 }, e: { r: 1, c: 9 } },

      { s: { r: 0, c: 10 }, e: { r: 0, c: 12 } },
      { s: { r: 0, c: 13 }, e: { r: 0, c: 15 } },

      { s: { r: 0, c: 16 }, e: { r: 1, c: 16 } }
    ];

    // column width
    worksheet['!cols'] = [
      { wch: 6 }, //A
      { wch: 10 }, //B
      { wch: 25 }, //C
      { wch: 25 }, //D
      { wch: 12 }, //E
      { wch: 35 }, //F
      { wch: 25 }, //G
      { wch: 45 }, //H
      { wch: 12 }, //I
      { wch: 12 }, //J
      { wch: 18 }, //K
      { wch: 10 }, //L
      { wch: 14 }, //M
      { wch: 18 }, //N
      { wch: 10 }, //O
      { wch: 14 }, //P
      { wch: 10 } //Q
    ];

    // header (center + bold)
    const range = XLSX.utils.decode_range(worksheet['!ref']!);

    for (let C = range.s.c; C <= range.e.c; C++) {

      const header1 = XLSX.utils.encode_cell({ r: 0, c: C });
      const header2 = XLSX.utils.encode_cell({ r: 1, c: C });

      if (worksheet[header1]) {
        worksheet[header1].s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { bold: true }
        };
      }

      if (worksheet[header2]) {
        worksheet[header2].s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { bold: true }
        };
      }

    }

    // body [lastDate, effectiveDate] อยู่ตรงกลาง
    for (let R = 2; R <= range.e.r; R++) {

      const lastDateCell = XLSX.utils.encode_cell({ r: R, c: 8 });  // column I
      const effectiveDateCell = XLSX.utils.encode_cell({ r: R, c: 9 }); // column J

      if (worksheet[lastDateCell]) {
        worksheet[lastDateCell].s = {
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      if (worksheet[effectiveDateCell]) {
        worksheet[effectiveDateCell].s = {
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

    }
    // เปลี่ยน Font
    for (let R = 2; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {

        const cell = XLSX.utils.encode_cell({ r: R, c: C });

        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { name: "Tahoma", sz: 10 }
          };
        }

      }
    }

    const workbook: XLSX.WorkBook = {
      Sheets: { 'ResignReport': worksheet },
      SheetNames: ['ResignReport']
    };

    XLSX.writeFile(workbook, 'ResignReport.xlsx');
  }

  closeViewModal() {
    this.isViewOpen = false;
    this.selected = undefined;
    this.isFlipped = false;
  }

  cancel() {
    this.isFlipped = false

    setTimeout(() => {
      if (!this.selected) {
        this.lastDate.set(null);
        this.effectiveDate.set(null);
      } else {
        this.lastDate.set(
          this.selected.lastDate
            ? new Date(this.selected.lastDate)
            : null
        );

        this.effectiveDate.set(
          this.selected.effectiveDate
            ? new Date(this.selected.effectiveDate)
            : null
        );
      }
    }, 100)

  }

  async onConfirmModal(): Promise<void> {
    // console.log(this.selected)
    if (!this.selected) return;

    this.isViewOpen = false

    const result = await Swal.fire({
      title: 'ยืนยันการทำรายการใช่หรือไม่?',
      text: `พนักงาน: ${this.selected.empCode} ${this.selected.firstNameTh} ${this.selected.lastNameTh}`,
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
      this.swalService.loading('กำลังบันทึก...');

      const payload = {
        employeeNo: this.selected.empCode,
        adUser: this.selected.adUser,
        lastDate: formatDate(this.lastDate()!, 'yyyy-MM-dd', 'en-US'),
        resignedDate: formatDate(this.effectiveDate()!, 'yyyy-MM-dd', 'en-US')
      };

      const id_update = this.selected.id

      // console.log("payload :", payload, id_update)

      if (this.MODE_EDIT && id_update) {
        this.resignService.updateEmployeeResign(id_update, payload).pipe(
          finalize(() => {
            this.loadInitialData();
          })
        ).subscribe({
          next: (res) => {
            // console.log(res);
            this.swalService.close();
            this.swalService.success('สำเร็จ', 'อัพเดทข้อมูลเรียบร้อยแล้ว')

          },
          error: (error) => {
            console.error('Error fetching data:', error);
            this.swalService.close();
            this.swalService.warning('แจ้งเตือน', error.error)
          }
        });
      } else {
        this.resignService.resignEmployee(payload).pipe(
          finalize(() => {
            this.loadInitialData();
          })
        ).subscribe({
          next: (res) => {
            // console.log(res);
            this.swalService.close();
            this.swalService.success('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว')

          },
          error: (error) => {
            console.error('Error fetching data:', error);
            this.swalService.close();
            this.swalService.warning('แจ้งเตือน', error.error)
          }
        });
      }
      this.closeViewModal();
      this.MODE_EDIT = false;
      return;
    } catch (e: any) {
      this.swalService.close();
      await Swal.fire('ผิดพลาด', e?.message ?? 'เกิดข้อผิดพลาด', 'error');
      return;
    }
  }

  toggleSelect(emp: EmployeeFormData, checked: boolean) {
    const map = new Map(this.selectedEmployees());

    if (checked) {
      map.set(emp.empCode, emp);
    } else {
      map.delete(emp.empCode);
    }

    this.selectedEmployees.set(map);
  }

  isChecked(empCode: string): boolean {
    return this.selectedEmployees().has(empCode);
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const map = new Map(this.selectedEmployees());
    const pageData = this.resignComps.paginatedData();

    if (checked) {
      pageData.forEach(emp => map.set(emp.empCode, emp));
    } else {
      pageData.forEach(emp => map.delete(emp.empCode));
    }

    this.selectedEmployees.set(map);
  }

  isAllSelected() {
    const pageData = this.resignComps.paginatedData();
    const selected = this.selectedEmployees();

    return pageData.length > 0 &&
      pageData.every(emp => selected.has(emp.empCode));
  }

  isSomeSelected() {
    const pageData = this.resignComps.paginatedData();
    const selected = this.selectedEmployees();

    const count = pageData.filter(emp =>
      selected.has(emp.empCode)
    ).length;

    return count > 0 && count < pageData.length;
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  dateInvalid = computed(() => {
    const last = this.lastDate();
    const effective = this.effectiveDate();

    if (!last || !effective) return false;

    const lastOnly = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const effectiveOnly = new Date(
      effective.getFullYear(),
      effective.getMonth(),
      effective.getDate()
    );

    return lastOnly > effectiveOnly;
  });

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
      position: item.POST,
      lastDate: item.LAST_DATE ? item.LAST_DATE : null,
      effectiveDate: item.RESIGNED_DATE ? item.RESIGNED_DATE : null,
      empStatus: item.EMP_STATUS,
      id: item.ID,
      expireDate: item.AD_EXPIRED_DATE ? item.AD_EXPIRED_DATE : null,
    }));
  }

  goToPage(page: number) {
    this.resignListing.currentPage.set(page);

    this.fetchEmployeeByStatus(
      'Resigned',
      page + 1,
      this.resignListing.pageSize()
    ).subscribe(res => this.dataResignFromApi(res));

  }

  setPageSize(size: number) {
    this.resignListing.pageSize.set(size);
    this.resignListing.currentPage.set(0);

    this.fetchEmployeeByStatus(
      'Resigned',
      1,
      size
    ).subscribe(res => this.dataResignFromApi(res));

  }

  onCompanyChange(company: any) {
    this.filterCompany.set(company);
    this.filterDepartment.set(null);
  }

  applyFilter() {
    this.resignListing.currentPage.set(0);

    this.loadInitialData();
  }

  loadInitialData() {
    this.loadingService.start('freelance-list');
    const pageR = this.resignListing.currentPage() + 1;
    const sizeR = this.resignListing.pageSize();

    this.fetchEmployeeByStatus('Resigned', pageR, sizeR)
      .subscribe(res => {
        console.log("Resigned >>", res)
        this.dataResignFromApi(res);
        this.loadingService.stop('freelance-list');
      });
  }

  //GET
  private dataResignFromApi(res: any) {
    // console.log("Resigned >>", res)
    const items = res.data.items ?? []
    this.resignData.set(this.mapApiData(items));

    this.resignListing.totalItems.set(res.data.total ?? 0);
    this.resignListing.currentPage.set((res.data.page ?? 1) - 1);
    this.resignListing.totalPages.set(res.data.totalPages ?? 1);
  }

  private fetchEmployeeByStatus(
    status: 'Active' | 'Resigned',
    page: number = 1,
    pageSize: number = 10
  ) {
    const searchText = this.searchText();
    const company = this.filterCompany();
    const department = this.filterDepartment();

    return this.resignService.getEmployee({
      page,
      pageSize,
      searchText: searchText || undefined,
      companyCode: company?.COMPANY_CODE,
      costCent: department?.COSTCENT,
      empStatus: status
    });
  }

  // GET MASTER
  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
        // console.log(data);
        // this.companyList = data
        this.companyList.set(data);
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
        // this.departmentList = data
        this.departmentList.set(data);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }
}
