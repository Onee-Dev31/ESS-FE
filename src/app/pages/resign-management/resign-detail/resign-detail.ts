import { CommonModule, formatDate } from '@angular/common';
import { Component, computed, Inject, inject, PLATFORM_ID, Signal, signal, WritableSignal } from '@angular/core';
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
import dayjs from 'dayjs';
import { AuthService } from '../../../services/auth.service';
import { FreelanceService } from '../../../services/freelance-management.service';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

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
interface FreelanceFormData {
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
    InfoModal,
    NzTabsModule
  ],
  templateUrl: './resign-detail.html',
  styleUrl: './resign-detail.scss',
})
export class ResignDetail {
  pageTitle = signal<string>('รายการพนักงานลาออก');

  private loadingService = inject(LoadingService);
  private resignService = inject(ResignManagementService);
  private freelanceService = inject(FreelanceService);
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

  resignFreelanceData = signal<FreelanceFormData[]>([]);
  resignFreelanceListing = createListingState();
  resignFreelanceComps = createListingComputeds_v2(this.resignFreelanceData, this.resignFreelanceListing);

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
  selectedFreelance = signal<Map<string, FreelanceFormData>>(new Map());

  MODE_EDIT: boolean = false;

  isViewOpen = false;
  selected?: Employee;
  isFlipped = false;
  lastDate = signal<Date | null>(null);
  effectiveDate = signal<Date | null>(null);

  tabs = [
    { name: 'Approved', key: 'approved' },
    { name: 'Waiting', key: 'waiting' }
  ];
  activeTab: string = 'approved';
  activeTabIndex: number = 0;

  selectTab(index: number) {
    this.activeTabIndex = index;
    this.activeTab = this.tabs[index].key;
    this.loadInitialData();
  }

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
    this.selected = emp;
    this.IS_INFO.set(true)
  }

  closeInfoModal() {
    this.IS_INFO.set(false)
  }

  submitInfo(data: any) {
    this.IS_INFO.set(false)
  }

  approve(command: 'Employee' | 'Freelance') {

    let selected;

    if (command === 'Employee') {
      selected = Array.from(this.selectedEmployees().values());

    } else {
      selected = Array.from(this.selectedFreelance().values());
    }


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
      type: command === 'Employee' ? 'fulltime' : 'freelance',
      actionEmp: this.authService.userData().AD_USER.toLowerCase(),
      requests: requests
    }

    console.log(payload)

    this.swalService.confirm('ยืนยันการ Approve อีกครั้ง', "", employeeList)
      .then(result => {

        if (!result.isConfirmed) return;

        this.swalService.loading('กำลังบันทึกข้อมูล...')

        this.resignService.updateADManagementResign(payload).subscribe(
          {
            next: (res) => {
              console.log(res);
              this.swalService.success('สำเร็จ', '')
              this.loadInitialData();
            },
            error: (error) => {
              console.error('Error fetching data:', error);
              this.swalService.warning('แจ้งเตือน', error.error)
            }
          }
        )

        // this.swalService.success("ทำรายการสำเร็จ", "(mock)")
      });

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

  // CHECK BOX : employee-freelance
  toggleSelectItem<T>(
    item: T,
    checked: boolean,
    selectedMap: WritableSignal<Map<string, T>>,
    keyFn: (x: T) => string
  ) {
    const map = new Map(selectedMap());
    const key = keyFn(item);

    if (checked) {
      map.set(key, item);
    } else {
      map.delete(key);
    }

    selectedMap.set(map);
  }

  // Usage for employee
  toggleSelectEmployee(emp: EmployeeFormData, checked: boolean) {
    this.toggleSelectItem(emp, checked, this.selectedEmployees, e => e.empCode);
  }

  // Usage for freelance
  toggleSelectFreelance(free: any, checked: boolean) {
    this.toggleSelectItem(free, checked, this.selectedFreelance, f => f.empCode);
  }

  isCheckedItem<T>(
    key: string,
    selectedMap: Signal<Map<string, T>>
  ) {
    return selectedMap().has(key);
  }

  isCheckedEmployee(empCode: string) {
    return this.isCheckedItem(empCode, this.selectedEmployees);
  }

  isCheckedFreelance(empCode: string) {
    return this.isCheckedItem(empCode, this.selectedFreelance);
  }

  // Toggle all items (page)
  toggleSelectAllItems<T>(
    event: Event,
    pageData: T[],
    selectedMap: WritableSignal<Map<string, T>>,
    keyFn: (x: T) => string
  ) {
    const checked = (event.target as HTMLInputElement).checked;
    const map = new Map(selectedMap());

    if (checked) {
      pageData.forEach(item => map.set(keyFn(item), item));
    } else {
      pageData.forEach(item => map.delete(keyFn(item)));
    }

    selectedMap.set(map);
  }

  // Helper for employee
  toggleSelectAllEmployees(event: Event) {
    const pageData = this.resignComps.paginatedData(); // your page data
    this.toggleSelectAllItems(event, pageData, this.selectedEmployees, e => e.empCode);
  }

  // Helper for freelance
  toggleSelectAllFreelance(event: Event) {
    const pageData = this.resignFreelanceComps.paginatedData();
    this.toggleSelectAllItems(event, pageData, this.selectedFreelance, f => f.empCode);
  }

  // Partial / all selected helpers
  isAllSelected<T>(pageData: T[], selectedMap: Signal<Map<string, T>>, keyFn: (x: T) => string) {
    return pageData.length > 0 && pageData.every(x => selectedMap().has(keyFn(x)));
  }

  isSomeSelected<T>(pageData: T[], selectedMap: Signal<Map<string, T>>, keyFn: (x: T) => string) {
    const count = pageData.filter(x => selectedMap().has(keyFn(x))).length;
    return count > 0 && count < pageData.length;
  }

  isAllSelectedEmployee() {
    const pageData = this.resignComps.paginatedData();
    return this.isAllSelected(pageData, this.selectedEmployees, e => e.empCode);
  }

  isSomeSelectedEmployee() {
    const pageData = this.resignComps.paginatedData();
    return this.isSomeSelected(pageData, this.selectedEmployees, e => e.empCode);
  }

  isAllSelectedFreelance() {
    const pageData = this.resignFreelanceComps.paginatedData();
    return this.isAllSelected(pageData, this.selectedFreelance, e => e.empCode);
  }

  isSomeSelectedFreelance() {
    const pageData = this.resignFreelanceComps.paginatedData();
    return this.isSomeSelected(pageData, this.selectedFreelance, e => e.empCode);
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
    // console.log("items >> ", items)
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

  private mapApiData_Freelance(items: any[]): FreelanceFormData[] {
    // console.log("[mapApiData_Freelance] items >> ", items)
    return items.map((item: any) => ({
      empCode: item.EMP_NO,
      firstNameTh: item.FIRSTNAME_TH,
      lastNameTh: item.LASTNAME_TH,
      firstNameEn: item.FIRSTNAME_EN,
      lastNameEn: item.LASTNAME_EN,
      nickName: item.NICKNAME,
      department: item.COSTCENT + ' ' + item.NAMECOSTCENT,
      company: item.COMPANY_NAME + ' [' + item.COMPANY_CODE + ']',
      type: '',
      adUser: item.AD_USER || '-',
      position: item.POST,
      lastDate: item.LAST_DATE ? item.LAST_DATE : null,
      effectiveDate: item.RESIGN_DATE ? item.RESIGN_DATE : null,
      empStatus: item.EMP_STATUS,
      id: item.ID,
      expireDate: item.AD_EXPIRED_DATE ? item.AD_EXPIRED_DATE : null,
    }));
  }

  goToPage(page: number, command: 'Freelance' | 'Employee') {

    if (command === 'Employee') {
      this.resignListing.currentPage.set(page);

      this.fetchEmployeeByStatus(
        'Resigned',
        page + 1,
        this.resignListing.pageSize()
      ).subscribe(res => this.dataEmployeeResignFromApi(res));
    } else {
      this.resignFreelanceListing.currentPage.set(page);

      this.fetchFreelanceByStatus(
        'Resigned',
        page + 1,
        this.resignFreelanceListing.pageSize()
      ).subscribe(res => this.dataFreelanceResignFromApi(res));
    }
  }

  setPageSize(size: number, command: 'Freelance' | 'Employee') {

    if (command === 'Employee') {
      this.resignListing.pageSize.set(size);
      this.resignListing.currentPage.set(0);
      this.fetchEmployeeByStatus(
        'Resigned',
        1,
        size
      ).subscribe(res => this.dataEmployeeResignFromApi(res));
    } else {
      this.resignFreelanceListing.pageSize.set(size);
      this.resignFreelanceListing.currentPage.set(0);
      this.fetchFreelanceByStatus(
        'Resigned',
        1,
        size
      ).subscribe(res => this.dataFreelanceResignFromApi(res));
    }

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
    this.loadingService.start('employee-list');
    this.loadingService.start('freelance-list');
    const pageR = this.resignListing.currentPage() + 1;
    const sizeR = this.resignListing.pageSize();

    this.fetchEmployeeByStatus('Resigned', pageR, sizeR)
      .subscribe(res => {
        console.log("Resigned [EMP]>>", res)
        this.dataEmployeeResignFromApi(res);
        this.loadingService.stop('employee-list');
      });

    this.fetchFreelanceByStatus('Resigned', pageR, sizeR)
      .subscribe(res => {
        console.log("Resigned [FREE]>>", res)
        this.dataFreelanceResignFromApi(res);
        this.loadingService.stop('freelance-list');
      });
  }

  viewReportResign(command: 'fulltime' | 'freelance') {
    console.log(command)
    window.open(`/resign-management/report?type=${command}`, '_blank');
    //  window.open(`/it-dashboard/report-detail?id=${encodeURIComponent(encryptedId)}`, '_blank');
  }

  //GET
  private dataEmployeeResignFromApi(res: any) {
    // console.log("Resigned >>", res)
    const items = res.data.items ?? []
    this.resignData.set(this.mapApiData(items));

    this.resignListing.totalItems.set(res.data.total ?? 0);
    this.resignListing.currentPage.set((res.data.page ?? 1) - 1);
    this.resignListing.totalPages.set(res.data.totalPages ?? 1);
  }

  private dataFreelanceResignFromApi(res: any) {
    // console.log("Resigned >>", res)
    const items = res.items ?? []
    this.resignFreelanceData.set(this.mapApiData_Freelance(items));

    this.resignFreelanceListing.totalItems.set(res.total ?? 0);
    this.resignFreelanceListing.currentPage.set((res.page ?? 1) - 1);
    this.resignFreelanceListing.totalPages.set(res.totalPages ?? 1);
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
      empStatus: status,
      adExpiredDate: this.activeTab === 'approved' ? 'true' : 'false'
    });
  }

  private fetchFreelanceByStatus(
    status: 'Active' | 'Resigned',
    page: number,
    pageSize: number
  ) {
    const searchText = this.searchText();
    const company = this.filterCompany();
    const department = this.filterDepartment();

    return this.freelanceService.getFreelance({
      page,
      pageSize,
      searchText: searchText || undefined,
      companyCode: company?.COMPANY_CODE,
      costCent: department?.COSTCENT,
      empStatus: status,
      hasAdUser: 'false',
      adExpiredDate: this.activeTab === 'approved' ? 'true' : 'false'
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
