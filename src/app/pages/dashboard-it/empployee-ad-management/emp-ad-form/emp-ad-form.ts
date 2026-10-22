import { CommonModule, formatDate } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTransferModule, TransferItem } from 'ng-zorro-antd/transfer';
import { firstValueFrom, Subscription } from 'rxjs';
import { EmpAdService } from '../../../../services/emp-ad-service';
import { MasterDataService } from '../../../../services/master-data.service';
import { SwalService } from '../../../../services/swal.service';
import { SettingService } from '../../../../services/setting.service';
import { ApprovalSetupService } from '../../../../services/approval-setup.service';
import { getPasswordError } from '../../../../utils/form-validation.util';

@Component({
  selector: 'app-emp-ad-form',
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzTransferModule,
    NzDatePickerModule,
    NzIconModule,
  ],
  templateUrl: './emp-ad-form.html',
  styleUrl: './emp-ad-form.scss',
})
export class EmpAdForm implements OnChanges, OnDestroy {
  @Input() mode: 'view' | 'add' = 'view';
  @Input() employeeId: string = '';
  @Output() onSaveSuccess = new EventEmitter<any>();
  @Input() isRequestUser = false;

  isLoading = false;
  isSaving = false;
  isReadOnly = true;
  submitted = false;
  adUserChecking = false;
  adUserDuplicate = false;

  requiredFields: (keyof typeof this.addForm)[] = [
    'employeeCode',
    'titleThai',
    'firstNameThai',
    'surNameThai',
    'titleEng',
    'firstNameEng',
    'surNameEng',
    'nickname',
    'jobPosition',
    'statusEmployee',
    'floor',
    'companyCode',
    'department',
    'headEmployeeCode',
    'email',
    'adUser',
    'adPassword',
    'adConfirmPassword',
    'adExpireDate',
  ];

  // View form
  form = {
    employeeCode: '',
    nameThai: '',
    nameEng: '',
    Nickname: '',
    jobPosition: '',
    statusEmployee: '',
    floor: '',
    taxId: '',
    nameBank: '',
    numberBank: '',
    officeTel: '',
    extension: '',
    mobile: '',
    email: '',
    companyName: '',
    department: '',
    addressThai: '',
    addressEng: '',
    province: '',
    district: '',
    subDistrict: '',
    postalCode: '',
    headEmployeeCode: '',
    headEmployeeName: '',
    adUser: '',
  };

  // Add form
  addShowPassword = false;
  addShowConfirmPassword = false;
  readonly getPasswordError = getPasswordError;
  addForm = {
    employeeCode: '',
    titleThai: '',
    firstNameThai: '',
    surNameThai: '',
    titleEng: '',
    firstNameEng: '',
    surNameEng: '',
    nickname: '',
    jobPosition: '',
    statusEmployee: '',
    floor: '',
    taxId: '',
    nameBank: '',
    numberBank: '',
    companyCode: '',
    companyName: '',
    department: '',
    email: '',
    mobile: '',
    headEmployeeCode: '',
    headEmployeeName: '',
    adUser: '',
    adPassword: '',
    adConfirmPassword: '',
    adExpireDate: null as Date | null,
  };

  titleOptions = ['นาย', 'นาง', 'นางสาว'];
  titleEngOptions = ['Mr.', 'Mrs.', 'Ms.'];

  floorList: any[] = [];
  jobPositionList: any[] = [];
  employeeStatusList: any[] = [];
  companyList: any[] = [];
  departmentList: any[] = [];
  filteredDepartmentList: any[] = [];
  selectedCompany: any = null;
  selectedEmployee: string | null = null;
  employeeList: any[] = [];
  groupList: TransferItem[] = [];
  allGroups: any[] = [];

  filterGroup = (query: string, item: TransferItem): boolean =>
    (item.title ?? '').toLowerCase().includes(query.trim().toLowerCase());

  get selectedGroups(): string[] {
    return this.groupList
      .filter((group) => group.direction === 'right')
      .map((group) => group['key']);
  }

  private employeeRequest?: Subscription;
  private groupRequest?: Subscription;
  private allGroupsRequest?: Subscription;
  private headEmployeeRequest?: Subscription;
  private adUserCheckTimer?: ReturnType<typeof setTimeout>;
  private existingEmployees: any[] = [];
  private existingEmployeesRequest?: Promise<void>;

  constructor(
    private empAdService: EmpAdService,
    private masterService: MasterDataService,
    private swalService: SwalService,
    private cdr: ChangeDetectorRef,
    private settingService: SettingService,
    private approvalSetupService: ApprovalSetupService,
    private elementRef: ElementRef<HTMLElement>,
  ) {}

  onTitleChange(title: string | null, language: 'th' | 'en') {
    const options = language === 'th' ? this.titleOptions : this.titleEngOptions;
    const index = options.indexOf(title ?? '');
    this.addForm.titleThai = this.titleOptions[index] ?? '';
    this.addForm.titleEng = this.titleEngOptions[index] ?? '';
  }

  onCompanyChange(company: any) {
    this.selectedCompany = company;
    this.addForm.companyCode = company?.COMPANY_CODE ?? '';
    this.addForm.companyName = company?.COMPANY_NAME ?? '';
    this.addForm.employeeCode = '';
    this.addForm.department = '';
    this.resetHeadEmployee();
    this.allGroupsRequest?.unsubscribe();
    this.allGroups = [];
    this.resetEmployeeList();
    this.filteredDepartmentList = company
      ? this.departmentList.filter((d) => d.COMPANY_CODE === company.COMPANY_CODE)
      : [];

    if (!this.addForm.companyCode) return;

    const companyCode = this.addForm.companyCode;
    if (!this.isRequestUser) this.loadCompanyGroups(companyCode);
    this.empAdService.getfreelanceCode(companyCode).subscribe({
      next: (res) => {
        if (this.addForm.companyCode !== companyCode) return;
        this.addForm.employeeCode = res?.data?.CODEMPID ?? '';
        this.cdr.detectChanges();
      },
      error: () => {
        if (this.addForm.companyCode !== companyCode) return;
        this.addForm.employeeCode = '';
        this.cdr.detectChanges();
      },
    });
  }

  onDepartmentChange() {
    this.resetEmployeeList();
    this.resetHeadEmployee();
    const department = this.filteredDepartmentList.find(
      (d) => `${d.COSTCENT} ${d.NAMECOSTCENT}` === this.addForm.department,
    );
    if (department) {
      if (!this.isRequestUser) this.loadEmployees(department.COSTCENT);
      this.loadHeadEmployee(department.COSTCENT);
    }
  }

  private resetHeadEmployee() {
    this.headEmployeeRequest?.unsubscribe();
    this.addForm.headEmployeeCode = '';
    this.addForm.headEmployeeName = '';
  }

  private loadHeadEmployee(costCent: string) {
    this.headEmployeeRequest = this.approvalSetupService
      .getApprovalSetupByCostCenter(costCent)
      .subscribe({
        next: (res) => {
          this.addForm.headEmployeeCode = String(res?.data?.Approver1EmpNo ?? '').trim();
          this.addForm.headEmployeeName = res?.data?.Approver1Name ?? '';
          if (!this.addForm.headEmployeeCode) {
            this.swalService.error('ไม่พบผู้อนุมัติลำดับที่ 1 ของแผนกนี้');
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.swalService.error('ไม่สามารถโหลดหัวหน้าของแผนกได้ กรุณาเลือกแผนกอีกครั้ง');
          this.cdr.detectChanges();
        },
      });
  }

  onEmployeeChange(employeeId: string | null) {
    this.selectedEmployee = employeeId;
    this.groupRequest?.unsubscribe();
    this.setGroupList([]);
    if (this.isRequestUser) return;
    const adUser = this.employeeList.find(
      (employee) => employee.value === this.selectedEmployee,
    )?.adUser;
    if (!adUser) return;

    this.groupRequest = this.empAdService.getAdUserGroups(adUser).subscribe({
      next: (res) => {
        const user = Array.isArray(res) ? res[0] : res;
        this.setGroupList(user?.groups ?? []);
        this.cdr.detectChanges();
      },
      error: () => {
        this.swalService.error('ไม่สามารถโหลด Groups ของพนักงานได้');
      },
    });
  }

  removeGroup(item: TransferItem) {
    this.groupList = this.groupList.map((group) =>
      group === item ? { ...group, direction: 'left', checked: false } : group,
    );
  }

  private setGroupList(selectedGroups: { name: string; distinguishedName: string }[]) {
    const selected = new Set(selectedGroups.map((group) => group.distinguishedName));
    const groups = [...this.allGroups, ...selectedGroups].filter(
      (group) =>
        typeof group?.name === 'string' &&
        group.name.trim().length > 0 &&
        typeof group.distinguishedName === 'string' &&
        group.distinguishedName.trim().length > 0,
    );
    this.groupList = [
      ...new Map(groups.map((group) => [group.distinguishedName, group])).values(),
    ].map((group) => ({
      key: group.distinguishedName,
      title: group.name,
      direction: selected.has(group.distinguishedName) ? 'right' : 'left',
    }));
  }

  private loadEmployees(costCent: string, page = 1) {
    this.employeeRequest = this.settingService
      .getEmployee({
        costCent,
        page,
        pageSize: 500,
      })
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res) ? res : (res.data ?? []);
          this.employeeList = [
            ...this.employeeList,
            ...items.map((employee: any) => ({
              value: employee.UserID,
              label: `${employee.UserID} - ${employee.FullNameThai ?? ''}`.trim(),
              adUser: employee.ADUsername ?? employee.ADUser ?? '',
            })),
          ];
          this.cdr.detectChanges();
          if (items.length === 500) this.loadEmployees(costCent, page + 1);
        },
        error: () => {},
      });
  }

  private resetEmployeeList() {
    this.employeeRequest?.unsubscribe();
    this.onEmployeeChange(null);
    this.employeeList = [];
  }

  ngOnDestroy() {
    if (this.adUserCheckTimer) clearTimeout(this.adUserCheckTimer);
    this.headEmployeeRequest?.unsubscribe();
    this.employeeRequest?.unsubscribe();
    this.groupRequest?.unsubscribe();
    this.allGroupsRequest?.unsubscribe();
  }

  ngOnChanges() {
    this.isReadOnly = this.mode === 'view';

    if (this.mode === 'view' && this.employeeId) {
      this.loadEmployee();
    }
    if (this.mode === 'add') {
      this.resetAddForm();
      this.loadMasterData();
    }
  }

  private loadCompanyGroups(companyCode: string) {
    this.allGroupsRequest?.unsubscribe();
    this.allGroupsRequest = this.empAdService.getAdUserGroupsByCompany(companyCode).subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : [res];
        const groups = items.flatMap((item) => item?.groups ?? [item]);
        this.allGroups = groups.filter((group) => group?.scope !== 'DomainLocal');
        this.setGroupList(
          this.groupList
            .filter((group) => group.direction === 'right')
            .map((group) => ({
              name: group.title,
              distinguishedName: group['key'],
            })),
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.swalService.error('ไม่สามารถโหลด Groups ของบริษัทได้');
      },
    });
  }

  loadMasterData() {
    if (!this.isRequestUser) void this.loadExistingEmployees().catch(() => undefined);
    this.empAdService.getEmployeeFloors().subscribe({
      next: (res) => {
        this.floorList = Array.isArray(res) ? res : (res.data ?? []);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.empAdService.getJobPositions().subscribe({
      next: (res) => {
        this.jobPositionList = Array.isArray(res) ? res : (res.data ?? []);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.empAdService.getEmployeeStatuses().subscribe({
      next: (res) => {
        this.employeeStatusList = Array.isArray(res) ? res : (res.data ?? []);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.masterService.getCompanyMaster().subscribe({
      next: (res) => {
        this.companyList = Array.isArray(res) ? res : (res.data ?? []);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
    this.masterService.getDepartmentMaster().subscribe({
      next: (res) => {
        this.departmentList = Array.isArray(res) ? res : (res.data ?? []);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  isInvalid(field: keyof typeof this.addForm): boolean {
    return this.submitted && this.requiredFields.includes(field) && !this.addForm[field];
  }

  get passwordsMismatch(): boolean {
    return !this.isRequestUser && this.addForm.adPassword !== this.addForm.adConfirmPassword;
  }

  onAdUserChange(value: string): void {
    this.addForm.adUser = String(value ?? '').toLowerCase();
    this.adUserDuplicate = false;
    this.adUserChecking = false;
    if (this.adUserCheckTimer) clearTimeout(this.adUserCheckTimer);

    const adUser = this.addForm.adUser.trim();
    if (!adUser) return;

    this.adUserChecking = true;
    this.adUserCheckTimer = setTimeout(async () => {
      try {
        const isDuplicate = await this.checkAdUserDuplicate(adUser);
        if (this.addForm.adUser.trim() === adUser) this.adUserDuplicate = isDuplicate;
      } catch {
        // Save will perform the required final duplicate check and report API errors.
      } finally {
        if (this.addForm.adUser.trim() === adUser) this.adUserChecking = false;
        this.cdr.detectChanges();
      }
    }, 500);
  }

  private async checkAdUserDuplicate(adUser: string): Promise<boolean> {
    const normalizedAdUser = adUser.trim().toLowerCase();
    await this.loadExistingEmployees();
    return this.existingEmployees.some(
      (employee: any) =>
        String(employee?.ADUser ?? '')
          .trim()
          .toLowerCase() === normalizedAdUser,
    );
  }

  private loadExistingEmployees(): Promise<void> {
    if (this.existingEmployeesRequest) return this.existingEmployeesRequest;

    this.existingEmployeesRequest = firstValueFrom(
      this.empAdService.getEmployees({
        pageNumber: 1,
        pageSize: 2000,
        filterAD_USER: 'ALL',
      }),
    )
      .then((res: any) => {
        this.existingEmployees = Array.isArray(res) ? res : (res?.data ?? []);
      })
      .catch((error) => {
        this.existingEmployeesRequest = undefined;
        throw error;
      });

    return this.existingEmployeesRequest;
  }

  private scrollToFirstInvalidField(): void {
    this.cdr.detectChanges();
    requestAnimationFrame(() => {
      const invalidElement = this.elementRef.nativeElement.querySelector<HTMLElement>(
        'input.invalid, textarea.invalid, .invalid-select, .field-nz-datepicker.invalid',
      );
      if (!invalidElement) return;

      invalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusTarget = invalidElement.matches('input, textarea, button')
        ? invalidElement
        : invalidElement.querySelector<HTMLElement>('input, textarea, button');
      focusTarget?.focus({ preventScroll: true });
    });
  }

  async saveEmployee(): Promise<void> {
    this.submitted = true;
    const excludedFields = this.isRequestUser
      ? [
          'employeeCode',
          'jobPosition',
          'statusEmployee',
          'floor',
          'email',
          'adUser',
          'adPassword',
          'adConfirmPassword',
          'adExpireDate',
        ]
      : [];

    const requiredFields = this.requiredFields.filter((f) => !excludedFields.includes(f));

    const hasError = requiredFields.some((f) => !this.addForm[f]);

    const hasInvalidPassword =
      !this.isRequestUser && getPasswordError(this.addForm.adPassword) !== '';

    if (hasError || hasInvalidPassword || this.passwordsMismatch || this.adUserDuplicate) {
      this.scrollToFirstInvalidField();
      return;
    }

    this.addForm.adUser = this.addForm.adUser.trim().toLowerCase();

    if (!this.isRequestUser) {
      this.isSaving = true;
      try {
        const isDuplicate = await this.checkAdUserDuplicate(this.addForm.adUser);

        if (isDuplicate) {
          this.isSaving = false;
          this.adUserDuplicate = true;
          this.swalService.warning(`AD User “${this.addForm.adUser}” มีอยู่ในระบบแล้ว`);
          this.scrollToFirstInvalidField();
          return;
        }
      } catch {
        this.isSaving = false;
        this.swalService.error('ไม่สามารถตรวจสอบ AD User ซ้ำได้ กรุณาลองใหม่อีกครั้ง');
        return;
      }
    }

    const selectedJob = this.jobPositionList.find(
      (j) => j.JobPositionID == this.addForm.jobPosition,
    );
    const selectedStatus = this.employeeStatusList.find(
      (s) => s.StatusCode == this.addForm.statusEmployee,
    );
    const selectedFloor = this.floorList.find((f) => f.FloorID == this.addForm.floor);

    const payload = {
      CODEMPID: this.addForm.employeeCode,
      TITLETHAI: this.addForm.titleThai,
      NAMFIRSTT: this.addForm.firstNameThai,
      NAMLASTT: this.addForm.surNameThai,
      NAMETHAI:
        `${this.addForm.titleThai}${this.addForm.firstNameThai} ${this.addForm.surNameThai}`.trim(),
      TITLEENG: this.addForm.titleEng,
      NAMFIRSTE: this.addForm.firstNameEng,
      NAMLASTE: this.addForm.surNameEng,
      NAMEENG: `${this.addForm.firstNameEng} ${this.addForm.surNameEng}`.trim(),
      NICKNAME: this.addForm.nickname,
      POST:
        selectedJob?.JobPositionName ??
        selectedJob?.Name ??
        selectedJob?.Description ??
        this.addForm.jobPosition,
      STAEMP: selectedStatus?.StatusCode ?? this.addForm.statusEmployee,
      StatusDescription: selectedStatus?.StatusDescription ?? '',
      FLOOR: selectedFloor?.FloorNumber ?? this.addForm.floor,
      NAMEBANK: this.addForm.nameBank,
      NUMBANK: this.addForm.numberBank,
      COMPANY_CODE: this.addForm.companyCode,
      COMPANY_NAME: this.addForm.companyName,
      DEPARTMENT: this.addForm.department,
      CODEMPIDH: this.addForm.headEmployeeCode,
      HEAD_NAME: this.addForm.headEmployeeName,
      USR_MOBILE: this.addForm.mobile,
      EMAIL: this.addForm.email,
      AD_USER: this.addForm.adUser,
      ...(!this.isRequestUser
        ? {
            AD_GROUPS: this.selectedGroups,
            AD_PASSWORD: this.addForm.adPassword,
            AD_EXPIRE_DATE: this.addForm.adExpireDate
              ? formatDate(this.addForm.adExpireDate, 'yyyy-MM-dd', 'en-US')
              : null,
          }
        : {}),
    };

    if (this.isRequestUser) {
      this.onSaveSuccess.emit(payload);
      return;
    }

    this.isSaving = true;
    this.onSaveSuccess.emit(); // ปิด modal ก่อน

    setTimeout(() => {
      this.swalService.loading('กำลังบันทึกข้อมูล...');

      this.empAdService.insertEmployee(payload).subscribe({
        next: (_) => {
          this.isSaving = false;
          this.submitted = false;
          this.existingEmployees.push({ ADUser: payload.AD_USER });
          this.swalService.success(`เพิ่มพนักงาน ${payload.CODEMPID} เรียบร้อยแล้ว`);
        },
        error: (err) => {
          this.isSaving = false;
          this.swalService.error(
            err?.error?.message ?? 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          );
        },
      });
    }, 300);
  }

  private loadEmployee() {
    this.isLoading = true;
    this.empAdService.getEmployeeDetails(this.employeeId).subscribe({
      next: (res: any) => {
        const item = Array.isArray(res) ? res[0] : (res.data ?? res);
        // console.log('Loaded employee details:', item);
        if (item) this.mapToForm(item);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapToForm(item: any) {
    this.form = {
      employeeCode: item.CODEMPID ?? '',
      nameThai: item.NAMETHAI ?? '',
      nameEng: item.NAMEENG ?? '',
      Nickname: item.NICKNAME ?? '',
      jobPosition: item.POST ?? '',
      statusEmployee: item.StatusDescription ?? '',
      floor: item.FLOOR ?? '',
      taxId: item.NUMOFFID ?? '',
      nameBank: item.NAMEBANK ?? '',
      numberBank: item.NUMBANK ?? '',
      officeTel: item.TELOFF ?? '',
      extension: item.NUMTEL ?? '',
      mobile: item.USR_MOBILE ?? '',
      email: item.EMAIL ?? '',
      companyName: item.COMPANY_NAME ?? '',
      department: item.DEPARTMENT ?? '',
      addressThai: item.ADRREGT ?? '',
      addressEng: item.ADRREGE ?? '',
      province: item.NAMEPROVRT ?? '',
      district: item.NAMEDISTRT ?? '',
      subDistrict: item.NAMESUBDISTRT ?? '',
      postalCode: String(item.CODPOSTR ?? ''),
      headEmployeeCode: item.CODEMPIDH ?? '',
      headEmployeeName: item.HEAD_NAME ?? '',
      adUser: item.AD_USER ?? '',
    };
  }

  private resetAddForm() {
    if (this.adUserCheckTimer) clearTimeout(this.adUserCheckTimer);
    this.adUserChecking = false;
    this.adUserDuplicate = false;
    this.resetHeadEmployee();
    this.addShowPassword = false;
    this.addShowConfirmPassword = false;
    this.allGroupsRequest?.unsubscribe();
    this.allGroups = [];
    this.resetEmployeeList();
    this.selectedCompany = null;
    this.filteredDepartmentList = [];
    this.addForm = {
      employeeCode: '',
      titleThai: '',
      firstNameThai: '',
      surNameThai: '',
      titleEng: '',
      firstNameEng: '',
      surNameEng: '',
      nickname: '',
      jobPosition: '',
      statusEmployee: '',
      floor: '',
      taxId: '',
      nameBank: '',
      numberBank: '',
      companyCode: '',
      companyName: '',
      department: '',
      email: '',
      mobile: '',
      headEmployeeCode: '',
      headEmployeeName: '',
      adUser: '',
      adPassword: '',
      adConfirmPassword: '',
      adExpireDate: null,
    };
  }
}
