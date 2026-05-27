import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { EmpAdService } from '../../../../services/emp-ad-service';
import { MasterDataService } from '../../../../services/master-data.service';
import { SwalService } from '../../../../services/swal.service';

@Component({
  selector: 'app-emp-ad-form',
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './emp-ad-form.html',
  styleUrl: './emp-ad-form.scss',
})
export class EmpAdForm implements OnChanges {
  @Input() mode: 'view' | 'add' = 'view';
  @Input() employeeId: string = '';
  @Output() onSaveSuccess = new EventEmitter<any>();
  @Input() isRequestUser = false;

  isLoading = false;
  isSaving = false;
  isReadOnly = true;
  submitted = false;

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
    'adUser',
    'email',
    'mobile',
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
    adUser: '',
  };

  titleOptions = ['นาย', 'นาง', 'นางสาว'];
  titleEngOptions = ['Mr.', 'Mrs.', 'Ms.'];

  floorList: any[] = [];
  jobPositionList: any[] = [];
  employeeStatusList: any[] = [];
  headEmployeeList: any[] = [];
  companyList: any[] = [];
  departmentList: any[] = [];
  filteredDepartmentList: any[] = [];
  selectedCompany: any = null;

  constructor(
    private empAdService: EmpAdService,
    private masterService: MasterDataService,
    private swalService: SwalService,
    private cdr: ChangeDetectorRef,
  ) {}

  onCompanyChange(company: any) {
    this.selectedCompany = company;
    this.addForm.companyCode = company?.COMPANY_CODE ?? '';
    this.addForm.companyName = company?.COMPANY_NAME ?? '';
    this.addForm.department = '';
    this.filteredDepartmentList = company
      ? this.departmentList.filter((d) => d.COMPANY_CODE === company.COMPANY_CODE)
      : [];
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

  loadMasterData() {
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
    this.empAdService.getEmployeeBasicInfo().subscribe({
      next: (res) => {
        this.headEmployeeList = Array.isArray(res) ? res : (res.data ?? []);
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

  saveEmployee() {
    this.submitted = true;
    // const hasError = this.requiredFields.some((f) => !this.addForm[f]);
    const requiredFields = this.isRequestUser
      ? this.requiredFields.filter((f) => f !== 'employeeCode')
      : this.requiredFields;

    const hasError = requiredFields.some((f) => !this.addForm[f]);
    if (hasError) return;

    const selectedJob = this.jobPositionList.find(
      (j) => j.JobPositionID == this.addForm.jobPosition,
    );
    const selectedStatus = this.employeeStatusList.find(
      (s) => s.StatusCode == this.addForm.statusEmployee,
    );
    const selectedFloor = this.floorList.find((f) => f.FloorID == this.addForm.floor);
    const selectedHead = this.headEmployeeList.find(
      (h) => h.CODEMPID == this.addForm.headEmployeeCode,
    );

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
      EMAIL: this.addForm.email,
      USR_MOBILE: this.addForm.mobile,
      DEPARTMENT: this.addForm.department,
      CODEMPIDH: this.addForm.headEmployeeCode,
      HEAD_NAME: selectedHead?.NAMETHAI ?? '',
      AD_USER: this.addForm.adUser,
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
        console.log('Loaded employee details:', item);
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
      adUser: '',
    };
  }
}
