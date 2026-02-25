import { CommonModule, formatDate } from '@angular/common';
import { Component, computed, Inject, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { EmptyStateComponent } from '../../components/shared/empty-state/empty-state';
import { PaginationComponent } from '../../components/shared/pagination/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzI18nService, en_US } from 'ng-zorro-antd/i18n';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { LoadingService } from '../../services/loading';
import { MasterDataService } from '../../services/master-data.service';
import { ResignManagementService } from '../../services/resign-management.service';
import { SwalService } from '../../services/swal.service';
import { createListingState, createListingComputeds_v2 } from '../../utils/listing.util';
import { Employee } from '../resign-management/employeeData.interface';
import { SkeletonComponent } from '../../components/shared/skeleton/skeleton';
import { SettingEmployeePermissionRoleForm } from "../../components/features/setting-employee-permission-role-form/setting-employee-permission-role-form";
import { SettingService } from '../../services/setting.service';
@Component({
  selector: 'app-setting-employee',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    SkeletonComponent,
    PageHeaderComponent,
    NzModalModule,
    EmptyStateComponent,
    PaginationComponent,
    NzSelectModule,
    SettingEmployeePermissionRoleForm
  ],
  templateUrl: './setting-employee.html',
  styleUrl: './setting-employee.scss',
})

export class SettingEmployee {
  pageTitle = signal<string>('กำหนดสิทธิ์พนักงาน');

  private loadingService = inject(LoadingService);
  private resignService = inject(ResignManagementService);
  private swalService = inject(SwalService);
  private masterService = inject(MasterDataService);
  private settingService = inject(SettingService);

  isLoading = this.loadingService.loading('employee-table');

  // MASTER
  companyList = signal<any[]>([]);
  departmentList = signal<any[]>([]);
  roleList = signal<any[]>([]);

  // TABLE
  activeData = signal<any[]>([]);
  activeListing = createListingState();
  activeComps = createListingComputeds_v2(this.activeData, this.activeListing);

  // New Filters
  filterCompany = signal<any>(null);
  filterDepartment = signal<any>(null);
  filterRole = signal<any>(null);
  filterMonth = signal<string>('');

  // appliedCompany = signal<any>(null);
  // appliedDepartment = signal<any>(null);
  appliedSearch = signal<string>(''); // ค่าที่กดค้นหาแล้ว
  searchText = signal<string>('');

  isFormOpen = signal<boolean>(false);
  selected?: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private i18n: NzI18nService,
  ) {
    this.i18n.setLocale(en_US);
  }

  ngOnInit() {
    this.getCompanies();
    this.getDepartments();
    this.getRoleMaster();
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

  openRoleModal(emp: any) {
    console.log(emp)

    if (!emp.adUser) {
      this.swalService.warning('ไม่มี Aduser')
      return;
    }

    this.settingPermissionRolesByAdUser(emp).subscribe(res => {
      this.selected = {
        emp: emp,
        roles: res.data
      }
      this.isFormOpen.set(true);
    });


  }

  closeForm() {
    this.isFormOpen.set(false);
  }

  async onConfirmModal(data: any): Promise<void> {
    console.log(data)

    if (!this.selected) return;

    const result = await Swal.fire({
      title: 'ยืนยันการทำรายการใช่หรือไม่?',
      text: `พนักงาน: ${this.selected.emp.empCode} ${this.selected.emp.fullNameTh}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) {
      return;
    }

    this.settingPermissionRolesByAdUser(this.selected.emp, data).subscribe(res => {
      console.log(res)
      if (res.success) {
        this.swalService.success(res.message)
      }
      this.closeForm();
    });

  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  // Function
  onCompanyChange(company: any) {
    this.filterCompany.set(company);
    this.filterDepartment.set(null);
  }

  private mapApiData(items: any[]): any[] {
    // console.log("items >> ", items)
    return items.map((item: any) => ({
      empCode: item.UserID,
      fullNameTh: item.FullNameThai,
      fullNameEn: item.FullNameEng,
      department: item.DEPARTMENT,
      company: item.COMPANY_NAME + ' [' + item.COMPANY_CODE + ']',
      adUser: item.ADUsername,
      // firstNameTh: item.NAMFIRSTT,
      // lastNameTh: item.NAMLASTT,
      // firstNameEn: item.NAMFIRSTE,
      // lastNameEn: item.NAMLASTE,
      // nickName: item.NICKNAME,
      // position: item.POST,
      // lastDate: item.LAST_DATE ? new Date(item.LAST_DATE) : null,
      // effectiveDate: item.RESIGNED_DATE ? new Date(item.RESIGNED_DATE) : null,
      // empStatus: item.EMP_STATUS,
      // id: item.ID
    }));
  }

  goToPage(page: number) {

    this.activeListing.currentPage.set(page);

    this.fetchEmployee(
      page + 1,
      this.activeListing.pageSize()
    ).subscribe(res => this.setEmployeeFromApi(res));
  }

  setPageSize(size: number) {

    this.activeListing.pageSize.set(size);
    this.activeListing.currentPage.set(0);

    this.fetchEmployee(1, size)
      .subscribe(res => this.setEmployeeFromApi(res));
  }

  applyFilter() {

    this.activeListing.currentPage.set(0);

    this.fetchEmployee(
      1,
      this.activeListing.pageSize()
    ).subscribe(res => {
      console.log(res)
      this.setEmployeeFromApi(res)
    }
    );
  }

  private loadInitialData() {

    this.loadingService.start('employee-table');

    const page = this.activeListing.currentPage() + 1;
    const size = this.activeListing.pageSize();

    this.fetchEmployee(page, size)
      .subscribe({
        next: (res) => {
          console.log(res)
          this.setEmployeeFromApi(res);
          this.loadingService.stop('employee-table');
        },
        error: () => {
          this.loadingService.stop('employee-table');
        }
      });
  }

  private fetchEmployee(
    page: number = 1,
    pageSize: number = 10
  ) {
    const searchText = this.searchText();
    const company = this.filterCompany();
    const department = this.filterDepartment();
    const role = this.filterRole();

    return this.settingService.getEmployee({
      page,
      pageSize,
      searchText: searchText || undefined,
      companyCode: company?.COMPANY_CODE,
      costCent: department?.COSTCENT,
      roleName: role?.RoleName
    });
  }

  private setEmployeeFromApi(res: any) {
    const items = res.data ?? [];

    this.activeData.set(this.mapApiData(items));
    this.activeListing.totalItems.set(res.pagination.total ?? 0);
    this.activeListing.totalPages.set(res.pagination.totalPages ?? 1);
    this.activeListing.currentPage.set((res.pagination.page ?? 1) - 1);
  }

  settingPermissionRolesByAdUser(emp: any, roles?: any[]) {
    const payload: any = {
      userID: emp.adUser,
      ...(roles !== undefined ? { batchRoles: roles } : {})
    };


    return this.settingService.settingUserRole(payload)
  }

  // GET MASTER
  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
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
        this.departmentList.set(data);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  getRoleMaster() {
    this.masterService.getRoleMaster().subscribe({
      next: (res) => {
        console.log(res);
        this.roleList.set(res.data);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }
}
