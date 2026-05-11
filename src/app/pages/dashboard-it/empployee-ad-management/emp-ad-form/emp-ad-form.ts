import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { EmpAdService } from '../../../../services/emp-ad-service';

@Component({
  selector: 'app-emp-ad-form',
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './emp-ad-form.html',
  styleUrl: './emp-ad-form.scss',
})
export class EmpAdForm implements OnChanges {
  @Input() mode: 'view' | 'add' = 'view';
  @Input() employeeId: string = '';

  isLoading = false;
  isReadOnly = true;
  submitted = false;

  requiredFields: (keyof typeof this.addForm)[] = [
    'employeeCode', 'titleThai', 'firstNameThai', 'surNameThai',
    'titleEng', 'firstNameEng', 'surNameEng', 'nickname',
    'jobPosition', 'statusEmployee', 'floor', 'headEmployeeCode', 'adUser',
  ];

  // View form
  form = {
    employeeCode: '', nameThai: '', nameEng: '', Nickname: '',
    jobPosition: '', statusEmployee: '', floor: '', taxId: '',
    nameBank: '', numberBank: '', officeTel: '', extension: '',
    mobile: '', email: '', companyName: '', department: '',
    addressThai: '', addressEng: '', province: '', district: '',
    subDistrict: '', postalCode: '', headEmployeeCode: '',
    headEmployeeName: '', adUser: '',
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
    headEmployeeCode: '',
    adUser: '',
  };

  titleOptions = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];
  titleEngOptions = ['Mr.', 'Mrs.', 'Ms.', 'Master', 'Miss'];

  floorList: any[] = [];
  jobPositionList: any[] = [];
  employeeStatusList: any[] = [];
  headEmployeeList: any[] = [];

  constructor(
    private empAdService: EmpAdService,
    private cdr: ChangeDetectorRef,
  ) {}

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
      next: (res) => { this.floorList = Array.isArray(res) ? res : (res.data ?? []); this.cdr.detectChanges(); },
      error: () => {},
    });
    this.empAdService.getJobPositions().subscribe({
      next: (res) => { this.jobPositionList = Array.isArray(res) ? res : (res.data ?? []); this.cdr.detectChanges(); },
      error: () => {},
    });
    this.empAdService.getEmployeeStatuses().subscribe({
      next: (res) => { this.employeeStatusList = Array.isArray(res) ? res : (res.data ?? []); this.cdr.detectChanges(); },
      error: () => {},
    });
    this.empAdService.getEmployeeBasicInfo().subscribe({
      next: (res) => { this.headEmployeeList = Array.isArray(res) ? res : (res.data ?? []); this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  isInvalid(field: keyof typeof this.addForm): boolean {
    return this.submitted && this.requiredFields.includes(field) && !this.addForm[field];
  }

  saveEmployee() {
    this.submitted = true;
    const hasError = this.requiredFields.some(f => !this.addForm[f]);
    if (hasError) return;

    const selectedJob    = this.jobPositionList.find(j => j.JobPositionID == this.addForm.jobPosition);
    const selectedStatus = this.employeeStatusList.find(s => s.StatusCode == this.addForm.statusEmployee);
    const selectedFloor  = this.floorList.find(f => f.FloorID == this.addForm.floor);
    const selectedHead   = this.headEmployeeList.find(h => h.CODEMPID == this.addForm.headEmployeeCode);

    const payload = {
      CODEMPID:      this.addForm.employeeCode,
      TITLETHAI:     this.addForm.titleThai,
      NAMFIRSTT:     this.addForm.firstNameThai,
      NAMLASTT:      this.addForm.surNameThai,
      TITLEENG:      this.addForm.titleEng,
      NAMFIRSTE:     this.addForm.firstNameEng,
      NAMLASTE:      this.addForm.surNameEng,
      NICKNAME:      this.addForm.nickname,
      POST:          selectedJob?.JobPositionName ?? selectedJob?.Name ?? selectedJob?.Description ?? this.addForm.jobPosition,
      STAEMP:        selectedStatus?.StatusCode ?? this.addForm.statusEmployee,
      StatusDescription: selectedStatus?.StatusDescription ?? '',
      FLOOR:         selectedFloor?.FloorNumber ?? this.addForm.floor,
      NAMEBANK:      this.addForm.nameBank,
      NUMBANK:       this.addForm.numberBank,
      CODEMPIDH:     this.addForm.headEmployeeCode,
      HEAD_NAME:     selectedHead?.NAMETHAI ?? '',
      AD_USER:       this.addForm.adUser,
    };

    console.log(JSON.stringify(payload, null, 2));
  }

  private loadEmployee() {
    this.isLoading = true;
    this.empAdService.getEmployeeDetails(this.employeeId).subscribe({
      next: (res: any) => {
        const item = Array.isArray(res) ? res[0] : (res.data ?? res);
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
      employeeCode:     item.CODEMPID ?? '',
      nameThai:         item.NAMETHAI ?? '',
      nameEng:          item.NAMEENG ?? '',
      Nickname:         item.NICKNAME ?? '',
      jobPosition:      item.POST ?? '',
      statusEmployee:   item.StatusDescription ?? '',
      floor:            item.FLOOR ?? '',
      taxId:            item.NUMOFFID ?? '',
      nameBank:         item.NAMEBANK ?? '',
      numberBank:       item.NUMBANK ?? '',
      officeTel:        item.TELOFF ?? '',
      extension:        item.NUMTEL ?? '',
      mobile:           item.MOBILE ?? '',
      email:            item.EMAIL ?? '',
      companyName:      item.COMPANY_NAME ?? '',
      department:       item.DEPARTMENT ?? '',
      addressThai:      item.ADRREGT ?? '',
      addressEng:       item.ADRREGE ?? '',
      province:         item.NAMEPROVRT ?? '',
      district:         item.NAMEDISTRT ?? '',
      subDistrict:      item.NAMESUBDISTRT ?? '',
      postalCode:       String(item.CODPOSTR ?? ''),
      headEmployeeCode: item.CODEMPIDH ?? '',
      headEmployeeName: item.HEAD_NAME ?? '',
      adUser:           item.AD_USER ?? '',
    };
  }

  private resetAddForm() {
    this.addForm = {
      employeeCode: '', titleThai: '', firstNameThai: '', surNameThai: '',
      titleEng: '', firstNameEng: '', surNameEng: '', nickname: '',
      jobPosition: '', statusEmployee: '', floor: '', taxId: '',
      nameBank: '', numberBank: '', headEmployeeCode: '', adUser: '',
    };
  }
}
