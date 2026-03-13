import { CommonModule, formatDate } from '@angular/common';
import { Component, computed, Inject, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { SkeletonComponent } from '../../../components/shared/skeleton/skeleton';
import { PageHeaderComponent } from '../../../components/shared/page-header/page-header';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { EmptyStateComponent } from '../../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../../components/shared/pagination/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { LoadingService } from '../../../services/loading';
import { ResignManagementService } from '../../../services/resign-management.service';
import { SwalService } from '../../../services/swal.service';
import { MasterDataService } from '../../../services/master-data.service';
import { createListingComputeds_v2, createListingState } from '../../../utils/listing.util';
import { Employee } from '../employeeData.interface';
import { en_US, NzI18nService } from 'ng-zorro-antd/i18n';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { DateUtilityService } from '../../../services/date-utility.service';
import { InfoModal } from "../modal/info-modal/info-modal";

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
  selector: 'app-resign-detail',
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
    NzSelectModule,
    InfoModal
  ],
  templateUrl: './resign-detail.html',
  styleUrl: './resign-detail.scss',
})
export class ResignDetail {
  pageTitle = signal<string>('รายการพนักงาน');

  private loadingService = inject(LoadingService);
  private resignService = inject(ResignManagementService);
  private swalService = inject(SwalService);
  private masterService = inject(MasterDataService);
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

  MODE_EDIT: boolean = false;

  isViewOpen = false;
  selected?: Employee;
  isFlipped = false;
  lastDate = signal<Date | null>(null);
  effectiveDate = signal<Date | null>(null);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private i18n: NzI18nService,
  ) {
    this.i18n.setLocale(en_US);
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
    this.IS_INFO.set(true)
  }

  closeInfoModal() {
    this.IS_INFO.set(false)
  }

  submitInfo(data: any) {
    console.log(data)
    this.IS_INFO.set(false)
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

      console.log("payload :", payload, id_update)

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
      expireDate: ''
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
