import {
  Component,
  signal,
  inject,
  OnInit,
  computed,
  ChangeDetectorRef,
  Input,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';
import { UserService, UserProfile } from '../../services/user.service';
import { PhoneUtil } from '../../utils/phone.util';
import { ItServiceMockService } from '../../services/it-service-mock.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { decryptValue } from '../../utils/crypto.js ';
import { SignalrService } from '../../services/signalr.service';
import { MasterDataService } from '../../services/master-data.service';
import { formatText } from '../../utils/formatText';
import { SettingService } from '../../services/setting.service';

type SpecificSystemKey = 'bms' | 'oracle' | 'onee' | 'onePortal';

interface OracleCompany {
  company: any;

  modules: OracleModulePermission[];
}

interface OracleModulePermission {
  module: string;
  permission: string;
}

interface SpecificPersonRequest {
  id: number;
  openFor: any;
  phone: string;
  phoneError?: string;
  note: string;

  freelance: {
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string;
    lastNameEn: string;
    employeeCode: string;
    company: string;
    department: string;
    position: string;
    email: string;
    filteredDepartments: any[];
  };

  systems: SpecificSystemKey[];

  bms: {
    companies: any[];
    detail: string;
  };

  oracle: {
    companies: OracleCompany[];
  };

  onee: {
    companies: any[];
    permission: string;
    supervisor: string;
  };

  onePortal: {
    companies: any[];
    role: string;
    responseType: string;
    supervisor: string;
  };

  errors?: {
    [key: string]: string;
  };
}

@Component({
  selector: 'app-it-service-request',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, NzSelectModule],
  templateUrl: './it-service-request-specific.html',
  styleUrl: './it-service-request-specific.scss',
})
export class ITServiceRequestSpecificComponent implements OnInit {
  // Inject Services
  private swalService = inject(SwalService);
  private masterService = inject(MasterDataService);
  private settingService = inject(SettingService);
  private userService = inject(UserService);
  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private signalrService = inject(SignalrService);

  formatText = formatText;

  @ViewChild('detailTextarea') detailTextarea!: ElementRef;

  authData = JSON.parse(localStorage.getItem('allData') || '{}');

  phoneModel = '';
  phoneError = '';
  phoneNumber = signal('');
  requestDetails = signal('');

  // CONDITION
  @Input() openBy!: string;

  // MASTER
  serviceOptions = signal<any[]>([]);
  userSubOptions = signal<any[]>([]);
  systemSubOptions = signal<any[]>([]);
  openForOptions = signal<any[]>([]);
  deptHeads: any[] = [];

  openforOneejob: string = '';
  isAnnounceChooseFreelance = signal<boolean>(false);
  // isFreelanceSelected = computed(() => this.selectedOpenFor().value === '__FREELANCE__');
  IS_EXAMPLE = signal<boolean>(false);

  isSystemCategorySelected = signal(false);
  IsOneeJob: boolean = false;
  applicantId: string = '';
  detailJobs: any = null;
  isFormValid = computed(() => {
    return this.specificPeople().every((person) => this.isSpecificPersonValid(person));
  });

  private nextSpecificPersonId = 1;
  specificPeople = signal<SpecificPersonRequest[]>([]);
  specificSystemChoices: { key: SpecificSystemKey; label: string; icon: string }[] = [
    { key: 'oracle', label: 'Oracle', icon: 'fa-database' },
    { key: 'bms', label: 'BMS', icon: 'fa-briefcase' },
    { key: 'onee', label: 'OneE Apps', icon: 'fa-layer-group' },
    { key: 'onePortal', label: 'OneE Portal', icon: 'fa-globe' },
  ];

  oracleModules: any;
  oraclePermissions: any;
  oneePermissions: any;
  onePortalResponseTypes: any;
  onePortalRole: any;
  openForOptions_noFreelance = signal<any[]>([]);

  ngOnInit() {
    this.getOpenFor();
    this.getCompanies();
    this.getDepartments();
    this.getMasterPermission();
    this.getDeptHeads();

    const userData = this.authService.userData();
    if (userData?.TELOFF) {
      const formatted = PhoneUtil.formatPhoneNumber(userData.TELOFF);
      this.phoneModel = formatted;
      this.phoneNumber.set(formatted);
    }

    const hasQueryParams = Object.keys(this.route.snapshot.queryParams).length > 0;

    if (!hasQueryParams) {
      return; // ❌ ไม่มี param → ไม่ต้องทำอะไรต่อ
    }
    const reloaded = sessionStorage.getItem('itServiceRequest-page-reloaded');

    if (!reloaded) {
      sessionStorage.setItem('itServiceRequest-page-reloaded', '1');
      window.location.reload();
      return;
    }

    sessionStorage.removeItem('itServiceRequest-page-reloaded');

    this.IsOneeJob = (localStorage.getItem('systemCode') || '') === 'ONEEJOB';

    this.route.queryParams.subscribe((params) => {
      this.applicantId = decryptValue(params['applicantId']) || '';
      this.getDetailFromJobsByApplicantId(this.applicantId);
      if (!this.applicantId) return;
    });
  }

  // onOpenForChange(value: string) {
  //   const option = this.openForOptions().find((opt) => opt.value === value);
  //   this.selectedOpenFor.set({ value, label: option?.label ?? '' });
  //   if (value === '__FREELANCE__') {
  //     this.isAnnounceChooseFreelance.set(true);
  //     setTimeout(() => {
  //       this.detailTextarea.nativeElement.focus();
  //       this.detailTextarea.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //     }, 100);
  //   } else {
  //     this.isAnnounceChooseFreelance.set(false);
  //   }
  // }

  onSpecificOpenForChange(person: any, value: any) {
    person.openFor = value;

    const isFreelance = value?.value === '__FREELANCE__';

    // ถ้าเปลี่ยนออกจาก freelance
    if (!isFreelance) {
      this.clearFreelanceErrors(person);
    }

    const hasAdUser = value?.AD_USER && value.AD_USER.toString().trim() !== '';

    // ไม่มี AD_USER => เอา BMS onee และ One Portal  ออก
    if (!hasAdUser && !isFreelance) {
      person.systems = person.systems.filter(
        (system: string) => !['bms', 'onee', 'onePortal'].includes(system),
      );

      // reset ค่า BMS
      person.bms = {
        companies: [],
        detail: null,
      };

      // reset ค่า One Portal
      person.onePortal = {
        companies: [],
        role: null,
        responseType: null,
      };

      person.onee = {
        companies: [],
        permission: '',
        supervisor: '',
      };

      delete person.errors?.['bms_companies'];
      delete person.errors?.['bms_detail'];
      delete person.errors?.['oneportal_companies'];
      delete person.errors?.['oneportal_role'];
      delete person.errors?.['oneportal_response_type'];
      delete person.errors?.['onee_companies'];
      delete person.errors?.['onee_permission'];
      delete person.errors?.['onee_supervisor'];

      if (person.openFor !== null) {
        this.swalService.warning(
          'พนักงานยังไม่มี User สำหรับเข้าใช้งานระบบ BMS, ONEE Apps, ONEE Portal!!',
          undefined,
          `
            <div style="text-align:center;">
      <img
        src="/ex/ex_request-user1.png"
        alt="Request User"
        style="max-width:100%; width:400px; margin-bottom:16px;"
      />
      <p>กรุณาปฏิบัติตามขั้นตอนด้านล่างนี้</p>
       <ol style="text-align:left; line-height:1.8; padding-left:20px;">
      <li>เข้าเมนู <b>IT Service</b></li>
      <li>เลือก <b>ขอใช้บริการ (พื้นฐาน)</b></li>
      <li>เลือกบริการ <b>"ขอ User"</b></li>
      <li>ส่งคำขอและแจ้งหัวหน้างานเพื่ออนุมัติผ่านระบบ</li>
    </ol>
    </div>
  `,
        );
      }
    }

    this.touchSpecificPeople();
  }

  // onSpecificOpenForChange(person: any, value: any) {
  //   person.openFor = value;

  //   const isFreelance = value?.value === '__FREELANCE__';

  //   // ถ้าเปลี่ยนออกจาก freelance
  //   if (!isFreelance) {
  //     this.clearFreelanceErrors(person);
  //   }

  //   this.touchSpecificPeople();
  // }

  touchSpecificPeople() {
    this.specificPeople.set([...this.specificPeople()]);
  }

  addSpecificPerson() {
    this.specificPeople.update((people) => [...people, this.createSpecificPerson()]);
  }

  removeSpecificPerson(personId: number) {
    this.specificPeople.update((people) => people.filter((person) => person.id !== personId));
  }

  togglePersonSystem(person: SpecificPersonRequest, system: SpecificSystemKey) {
    const exists = person.systems.includes(system);

    console.log(person.systems);

    if (exists) {
      person.systems = person.systems.filter((item) => item !== system);
      this.resetSystemData(person, system);
      this.clearSystemErrors(person, system);
    } else {
      person.systems = [...person.systems, system];

      // auto create first oracle company
      if (system === 'oracle' && person.oracle.companies.length === 0) {
        this.addOracleCompany(person);
      }
      if (system === 'onee') {
        this.autoSelectOneeSupervisor(person);
        this.validateOneeCompanies(person);
        this.validateOneePermission('', person);
        this.validateOneeSupervisor('', person);
      }
      if (system === 'bms') {
        this.validateBmsCompanies(person);
        this.validateBmsDetail('', person);
      }
      if (system === 'onePortal') {
        this.validateOnePortalCompanies(person);
        this.validateOnePortalRole('', person);
        this.validateOnePortalResponseType('', person);
      }
    }

    this.touchSpecificPeople();
  }

  autoSelectOneeSupervisor(person: any) {
    if (person.openFor?.value === '__FREELANCE__') {
      return;
    }

    const costCent =
      person.openFor?.COSTCENT || person.openFor?.costCent || person.openFor?.costcent;

    if (!costCent) {
      return;
    }

    const dept = this.deptHeads.find((item: any) => item.cost_cent === costCent);

    if (!dept) {
      return;
    }

    const level1 = dept.heads?.find((head: any) => head.level === 1);

    if (!level1) {
      return;
    }

    const supervisor = this.openForOptions_noFreelance().find(
      (emp: any) => emp.value === level1.code,
    );

    if (supervisor) {
      person.onee.supervisor = supervisor;

      delete person.errors?.['onee_supervisor'];

      this.touchSpecificPeople();
    }
  }

  getOpenForLabel(value: string): string {
    return this.openForOptions().find((opt) => opt.value === value)?.label ?? value;
  }

  getPersonSystemLabels(person: SpecificPersonRequest): string {
    return person.systems.map((system) => this.getSpecificSystemLabel(system)).join(', ');
  }

  openExample() {
    this.IS_EXAMPLE.set(true);
  }

  closeExample() {
    this.IS_EXAMPLE.set(false);
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let digitsOnly = input.value.replace(/\D/g, '');
    digitsOnly = digitsOnly.slice(0, 10);
    const formatted = PhoneUtil.formatPhoneNumber(digitsOnly);
    input.value = formatted;
    this.phoneModel = formatted;
    this.phoneNumber.set(formatted);

    const len = digitsOnly.length;
    if (len === 0) {
      this.phoneError = '';
    } else if (len !== 4 && len !== 10) {
      this.phoneError = 'เบอร์โทรศัพท์ต้องมี 4 หรือ 10 หลักเท่านั้น';
    } else {
      this.phoneError = '';
    }
  }

  onPhoneNumberChange(value: string) {
    const formatted = PhoneUtil.formatPhoneNumber(value);
    this.phoneNumber.set(formatted);
  }

  showRepairModal = signal(false);

  repairFormData = signal({
    device: '',
    brand: '',
    model: '',
    symptom: '',
  });

  problemFormData = signal({
    topic: '',
    detail: '',
  });

  activeModalMode = signal<'repair' | 'problem' | null>(null);

  selectedSystemTypes = signal<string[]>([]);

  toggleSystemType(type: string) {
    this.selectedSystemTypes.update((types) => {
      // console.log('types', types);

      if (type === 'user') {
        const allUserValues = this.userSubOptions().map((opt) => opt.value);
        const allSelected = allUserValues.every((v) => types.includes(v));

        if (allSelected) {
          // เอาออกทั้งหมด
          this.userSubOptions.update((opts) => opts.map((opt) => ({ ...opt, checked: false })));
          return types.filter((t) => !allUserValues.includes(t) && t !== 'user');
        } else {
          // เลือกทั้งหมด
          this.userSubOptions.update((opts) => opts.map((opt) => ({ ...opt, checked: true })));
          const merged = [
            ...types.filter((t) => !allUserValues.includes(t)),
            ...allUserValues,
            'user',
          ];
          return merged;
        }
      }

      if (types.includes(type)) {
        return types.filter((t) => t !== type);
      } else {
        return [...types, type];
      }
    });
  }

  toggleService(index: number) {
    this.serviceOptions.update((items) => {
      const newItems = [...items];

      if (!newItems[index].disabled) {
        newItems[index].checked = !newItems[index].checked;
      }

      return newItems;
    });

    const selectedValues = this.serviceOptions()
      .filter((s) => s.checked)
      .map((s) => s.value);
    this.isSystemCategorySelected.set(selectedValues.includes('request_system'));

    if (!selectedValues.includes('request_system')) {
      this.selectedSystemTypes.set([]);
      this.userSubOptions.update((items) => items.map((i) => ({ ...i, checked: false })));
      this.systemSubOptions.update((items) => items.map((i) => ({ ...i, checked: false })));
    }
  }

  toggleUserSubOption(index: number) {
    this.userSubOptions.update((items) => {
      const newItems = [...items];
      newItems[index].checked = !newItems[index].checked;
      return newItems;
    });
  }

  isShowExample = computed(() => {
    const targetIds = [10, 11, 12];
    return this.systemSubOptions().some((opt) => targetIds.includes(opt.id) && opt.checked);
  });

  toggleSystemSubOption(index: number) {
    this.systemSubOptions.update((items) => {
      const newItems = [...items];
      newItems[index].checked = !newItems[index].checked;
      return newItems;
    });
  }

  showSummaryModal = signal(false);
  summaryText = signal('');

  submit() {
    const payload = this.specificPeople().map((person) => ({
      openFor: person.openFor,
      phone: person.phone,
      note: person.note,
      freelance: person.freelance,
      systems: person.systems,
      bms: person.systems.includes('bms') ? person.bms : null,
      oracle: person.systems.includes('oracle') ? person.oracle : null,
      onee: person.systems.includes('onee') ? person.onee : null,
      onePortal: person.systems.includes('onePortal') ? person.onePortal : null,
    }));
    console.log(payload);
    const summary = this.buildRequestSummary(payload);

    this.summaryText.set(summary);

    this.showSummaryModal.set(true);
  }

  closeSummaryModal() {
    this.showSummaryModal.set(false);
  }

  clearForm() {
    this.specificPeople.set([this.createSpecificPerson()]);
    this.setDefaultSpecificService();
    this.requestDetails.set('');

    const original = this.authData.employee.TELOFF;
    this.phoneModel = '';
    this.cdr.detectChanges();
    this.phoneModel = original;
    this.phoneNumber.set(original);
  }

  confirmSubmission() {
    const selectedServices = this.serviceOptions().filter((s) => s.checked);

    const userOptions = this.userSubOptions().filter((o) => o.checked);
    const systemOptions = this.systemSubOptions().filter((o) => o.checked);

    const formData = new FormData();
    formData.append('ticketTypeId', '3');

    if (this.specificPeople().length === 1) {
      const isSelf =
        this.specificPeople()[0].openFor.value === this.authService.userData().CODEMPID;

      formData.append('openForType', isSelf ? 'self' : 'other');
      formData.append('openForCodeempid', this.specificPeople()[0].openFor.value);
    } else if (this.specificPeople().length > 1) {
      formData.append('openForType', 'freelance');
    }

    formData.append('subject', 'ขอใช้ระบบเฉพาะ');
    formData.append('description', this.summaryText());
    formData.append('requesterAduser', this.authService.currentUser() || '-');
    formData.append('contactPhone', this.phoneNumber());
    formData.append(
      'IsSelfRequestByIT',
      this.openBy
        ? 'false'
        : this.authService.userData().DEPARTMENT === '10806 IT Department'
          ? 'true'
          : 'false',
    ); //it เปิดให้ตัวเอง ?

    selectedServices.forEach((service) => {
      formData.append('serviceTypeIds', service.id.toString());
    });

    userOptions.forEach((service) => {
      formData.append('serviceTypeIds', service.id.toString());
    });

    systemOptions.forEach((service) => {
      formData.append('serviceTypeIds', service.id.toString());
    });

    // console.log('formData', [...formData.entries()]);

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.itServiceService
      .createTicket(formData)
      .pipe(
        finalize(() => {
          this.closeSummaryModal();
        }),
      )
      .subscribe({
        next: (res) => {
          // console.log('[createTicket res]', res);
          if (res.success) {
            const codeEmpId = this.authService.userData().CODEMPID;
            if (codeEmpId) {
              this.signalrService.recentlySubmittedTickets.add(res.ticketNumber);
              setTimeout(
                () => this.signalrService.recentlySubmittedTickets.delete(res.ticketNumber),
                10000,
              );
              this.signalrService.ticketApprovalNotify(codeEmpId, res.ticketNumber);
            }
            this.swalService.success('ส่งคำขอเรียบร้อยแล้ว', res.ticketNumber).then(() => {
              this.router.navigate(['/it-service-list']);
              // this.clearForm();
            });
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error.error.message);
          // const message = error?.error?.message || '';
        },
      });
  }

  closeRepairModal() {
    // If canceling, uncheck the service
    if (this.activeModalMode()) {
      this.serviceOptions.update((items) => {
        const newItems = items.map((item) => {
          if (item.value === this.activeModalMode()) {
            return { ...item, checked: false };
          }
          return item;
        });
        return this.applyServiceExclusion(newItems);
      });
    }
    this.showRepairModal.set(false);
    this.activeModalMode.set(null);
  }

  confirmModalData() {
    if (this.activeModalMode() === 'repair') {
      const { device, brand, model, symptom } = this.repairFormData();
      if (!device || !brand || !model || !symptom) {
        this.swalService.warning('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return;
      }
    } else if (this.activeModalMode() === 'problem') {
      const { topic, detail } = this.problemFormData();
      if (!topic || !detail) {
        this.swalService.warning('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return;
      }
    }

    this.serviceOptions.update((items) => {
      const newItems = items.map((item) => {
        if (item.value === this.activeModalMode()) {
          return { ...item, checked: true };
        }
        return item;
      });
      return this.applyServiceExclusion(newItems);
    });

    this.showRepairModal.set(false);
    this.activeModalMode.set(null);
  }

  private applyServiceExclusion(items: any[]) {
    const repairSet = ['repair', 'problem'];
    const hasRepairActive = items.some((i) => repairSet.includes(i.value) && i.checked);
    const hasServiceActive = items.some((i) => !repairSet.includes(i.value) && i.checked);

    return items.map((item) => {
      const isRepairType = repairSet.includes(item.value);
      if (hasRepairActive) {
        item.disabled = !isRepairType;
      } else if (hasServiceActive) {
        item.disabled = isRepairType;
      } else {
        item.disabled = false;
      }
      return item;
    });
  }
  showHistoryDetailModal = signal(false);
  selectedRequest = signal<any>(null);

  viewRequestDetails(request: any) {
    this.selectedRequest.set(request);
    this.showHistoryDetailModal.set(true);
  }

  closeHistoryDetailModal() {
    this.showHistoryDetailModal.set(false);
    this.selectedRequest.set(null);
  }

  getDetailFromJobsByApplicantId(id: string) {
    this.itServiceService.getDetailFromJobsByApplicant(id).subscribe({
      next: (res) => {
        // console.log('getDetailFromJobsByApplicantId', res);
        this.detailJobs = res;
        const data = res[0];
        // console.log('data : ', data);
        this.openforOneejob = data ? `${data.FirstNameThai} ${data.LastNameThai}` : '';
        this.requestDetails.set(
          `- พนักงานใหม่ -\n` +
            `ชื่อ-นามสกุล: ${data.FirstNameThai} ${data.LastNameThai}\n` +
            `Email: ${data.Email}\n` +
            `ตำแหน่ง: ${data.JobTitle}\n` +
            `บริษัท: ${data.Location}`,
        );
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  private createSpecificPerson(): SpecificPersonRequest {
    const currentUserCode = this.authService.userData().CODEMPID;

    const alreadyUsed = this.specificPeople().some((p) => p.openFor?.value === currentUserCode);

    const defaultOption = alreadyUsed
      ? null
      : this.openForOptions().find((opt) => opt.value === currentUserCode);

    return {
      id: this.nextSpecificPersonId++,
      openFor: defaultOption,
      phone: PhoneUtil.formatPhoneNumber(this.authService.userData()?.TELOFF ?? ''),
      note: '',
      freelance: {
        firstNameTh: '',
        lastNameTh: '',

        firstNameEn: '',
        lastNameEn: '',

        employeeCode: '',

        company: '',
        department: '',

        position: '',

        email: '',
        filteredDepartments: [],
      },

      systems: [],

      bms: {
        companies: [],
        detail: '',
      },

      oracle: {
        companies: [],
      },

      onee: {
        companies: [],
        permission: '',
        supervisor: '',
      },

      onePortal: {
        companies: [],
        role: '',
        responseType: '',
        supervisor: '',
      },
    };
  }

  addOracleCompany(person: any) {
    const firstCompany = person.oracle.companies?.[0];

    person.oracle.companies.push({
      company: null,
      modules: this.oracleModules.map((item: any) => ({
        module: item.ModuleCode,
        permission:
          firstCompany?.modules?.find((m: any) => m.module === item.ModuleCode)?.permission ?? '-',
      })),
    });

    const index = person.oracle.companies.length - 1;

    this.validateOracleCompany(person.oracle.companies[index], person, index);
    this.validateAllOraclePermissions(person);
    this.touchSpecificPeople();
  }

  removeOracleCompany(person: any, index: number) {
    person.oracle.companies.splice(index, 1);
    this.validateAllOraclePermissions(person);
  }

  private isSpecificPersonValid(person: SpecificPersonRequest): boolean {
    // console.log(person);
    const isFreelance = person?.openFor?.value === '__FREELANCE__';

    // =========================
    // BASIC
    // =========================

    if (!person.openFor || person.systems.length === 0) {
      return false;
    }

    // =========================
    // FREELANCE
    // =========================

    if (isFreelance) {
      const freelance = person.freelance;

      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(freelance.email ?? '');

      if (
        !freelance.firstNameTh?.trim() ||
        !freelance.lastNameTh?.trim() ||
        !freelance.firstNameEn?.trim() ||
        !freelance.lastNameEn?.trim() ||
        !freelance.company ||
        !freelance.department ||
        !freelance.position?.trim() ||
        !freelance.email?.trim() ||
        !emailValid
      ) {
        return false;
      }
    }

    // =========================
    // PHONE
    // =========================

    const phoneDigits = (person.phone ?? '').replace(/\D/g, '');

    const phoneValid = phoneDigits.length === 4 || phoneDigits.length === 10;

    if (!phoneValid) {
      return false;
    }

    // =========================
    // ONE PORTAL
    // =========================

    if (person.systems.includes('onePortal')) {
      if (!person.onePortal.companies?.length || !person.onePortal.responseType?.trim()) {
        return false;
      }
    }

    // =========================
    // ONEE
    // =========================

    if (person.systems.includes('onee')) {
      if (
        !person.onee.companies?.length ||
        !person.onee.permission?.trim() ||
        !person.onee.supervisor
      ) {
        return false;
      }
    }

    // =========================
    // BMS
    // =========================

    if (person.systems.includes('bms')) {
      if (!person.bms.companies?.length || !person.bms.detail) {
        return false;
      }
    }

    // =========================
    // ORACLE
    // =========================

    if (person.systems.includes('oracle')) {
      if (person.oracle.companies.some((item: any) => !item.company?.COMPANY_CODE)) {
        return false;
      }
      // ต้องมี company จริง
      const validCompanies = person.oracle.companies.filter((item: any) => item.company);

      if (!validCompanies.length) {
        return false;
      }

      // ทุก company ต้องมี permission อย่างน้อย 1 ตัว
      const allCompaniesValid = validCompanies.every((item: any) =>
        item.modules?.some((m: any) => m.permission && m.permission.trim() !== '-'),
      );

      if (!allCompaniesValid) {
        return false;
      }
    }

    return true;
  }

  private setDefaultSpecificService() {
    this.serviceOptions.update((items) =>
      items.map((item) => ({
        ...item,
        checked: item.value === 'request_system',
        disabled: item.value !== 'request_system',
      })),
    );
    this.isSystemCategorySelected.set(true);
    this.selectedSystemTypes.set(['system']);
    this.userSubOptions.update((items) => items.map((item) => ({ ...item, checked: false })));
  }

  getSpecificSystemLabel(system: SpecificSystemKey): string {
    return this.specificSystemChoices.find((item) => item.key === system)?.label ?? system;
  }

  // NEW!
  companyList: any[] = [];
  companyList_bms: any[] = [];
  departmentList: any[] = [];
  filteredDepartmentList: any[] = [];

  // function
  private resetSystemData(person: SpecificPersonRequest, system: SpecificSystemKey) {
    switch (system) {
      case 'bms':
        person.bms = {
          companies: [],
          detail: '',
        };
        break;

      case 'oracle':
        person.oracle = {
          companies: [],
        };
        break;

      case 'onee':
        person.onee = {
          companies: [],
          permission: '',
          supervisor: '',
        };
        break;

      case 'onePortal':
        person.onePortal = {
          companies: [],
          role: '',
          responseType: '',
          supervisor: '',
        };
        break;
    }
  }
  canAddOracleCompany(person: SpecificPersonRequest): boolean {
    return this.getAvailableOracleCompanies(person, null).length !== person.oracle.companies.length;
  }

  getAvailableOracleCompanies(person: any, currentItem: any) {
    const selectedCodes = person.oracle.companies
      .filter((x: any) => x !== currentItem && x.company)
      .map((x: any) => x.company.COMPANY_CODE);

    return this.companyList.filter(
      (company: any) =>
        company.COMPANY_CODE !== 'GTH' && !selectedCodes.includes(company.COMPANY_CODE),
    );
  }

  getAvailableOpenForOptions(currentPerson: any) {
    const selectedValues = this.specificPeople()
      .filter((p: any) => p !== currentPerson && p.openFor && p.openFor.value !== '__FREELANCE__')
      .map((p: any) => p.openFor.value);

    return this.openForOptions().filter(
      (opt: any) => opt.value === '__FREELANCE__' || !selectedValues.includes(opt.value),
    );
  }

  onCompanyChange(person: SpecificPersonRequest, company: any) {
    person.freelance.department = '';

    if (!company) {
      person.freelance.filteredDepartments = [];
      return;
    }

    person.freelance.filteredDepartments = this.departmentList.filter(
      (dept) => this.remapCompanyCode(dept.COMPANY_CODE) === company.COMPANY_CODE,
    );
  }

  private remapCompanyCode(code: string): string {
    if (code === 'OTD') return 'ONE';
    if (code === 'OTV') return 'O31';
    if (code === 'ATM') return 'GMD';
    return code;
  }

  onSpecificPhoneInput(event: Event, person: any) {
    const input = event.target as HTMLInputElement;

    let digitsOnly = input.value.replace(/\D/g, '');

    digitsOnly = digitsOnly.slice(0, 10);

    const formatted = PhoneUtil.formatPhoneNumber(digitsOnly);

    input.value = formatted;

    person.phone = formatted;

    const len = digitsOnly.length;

    if (len === 0) {
      person.phoneError = '';
    } else if (len !== 4 && len !== 10) {
      person.phoneError = 'เบอร์โทรศัพท์ต้องมี 4 หรือ 10 หลักเท่านั้น';
    } else {
      person.phoneError = '';
    }

    this.touchSpecificPeople();
  }

  // buildRequestSummary(data: any[]): string {
  //   return data
  //     .map((person, index) => {
  //       const sections: string[] = [];

  //       // =========================
  //       // HEADER
  //       // =========================

  //       if (person.openFor?.isFreelance) {
  //         sections.push(
  //           `${index + 1}. Freelance`,
  //           `ชื่อ-นามสกุลภาษาไทย: ${person.freelance.firstNameTh} ${person.freelance.lastNameTh}`,
  //           `ชื่อ-นามสกุลภาษาอังกฤษ: ${person.freelance.firstNameEn} ${person.freelance.lastNameEn}`,
  //           `บริษัท: ${person.freelance.company?.COMPANY_NAME} (${person.freelance.company?.COMPANY_CODE})`,
  //           `แผนก: ${person.freelance.department?.COSTCENT}-${person.freelance.department?.NAMECOSTCENT}`,
  //           `ตำแหน่ง: ${person.freelance.position}`,
  //           `อีเมล: ${person.freelance.email}`,
  //           `เบอร์: ${person.phone}`,
  //         );
  //       } else {
  //         sections.push(
  //           `${index + 1}. ชื่อ-นามสกุลภาษาไทย: ${person.openFor?.label.split('-')[1]}`,
  //           `ชื่อ-นามสกุลภาษาอังกฤษ: ${person.openFor?.labelEN.split('-')[1]}`,
  //           `รหัสผนักงาน: ${person.openFor?.value}`,
  //           `AD USER: ${person.openFor?.AD_USER}`,
  //           `บริษัท: ${person.openFor?.COMPANY_NAME}`,
  //           `แผนก: ${person.openFor?.DEPARTMENT}`,
  //           `ตำแหน่ง: ${person.openFor?.POST}`,
  //           `อีเมล: ${person.openFor?.EMAIL}`,
  //           `เบอร์: ${person.openFor?.USR_MOBILE} / ${person.phone}`,
  //         );
  //       }

  //       sections.push('');

  //       // =========================
  //       // ORACLE
  //       // =========================

  //       if (person.systems.includes('oracle') && person.oracle) {
  //         sections.push('[ ระบบ : Oracle ]');

  //         person.oracle.companies.forEach((companyItem: any) => {
  //           if (companyItem.company) {
  //             sections.push(
  //               `บริษัท : ${companyItem.company.COMPANY_NAME} (${companyItem.company.COMPANY_CODE})`,
  //             );
  //           }

  //           const selectedModules = companyItem.modules.filter(
  //             (m: any) => m.permission && m.permission.trim() !== '-',
  //           );

  //           selectedModules.forEach((m: any) => {
  //             sections.push(
  //               `${companyItem.company.COMPANY_CODE} - ${m.module.trim()} ${m.permission.trim()}`,
  //             );
  //           });

  //           sections.push('');
  //         });
  //       }

  //       // =========================
  //       // BMS
  //       // =========================

  //       if (person.systems.includes('bms') && person.bms) {
  //         sections.push('[ ระบบ : BMS ]');

  //         person.bms.companies.forEach((company: any) => {
  //           sections.push(`${company.COMPANY_NAME} (${company.COMPANY_CODE})`);
  //         });

  //         if (person.bms.detail) {
  //           sections.push(`สิทธิ์เหมือน : ${person.bms.detail.label}`);
  //         }

  //         sections.push('');
  //       }

  //       // =========================
  //       // ONE PORTAL
  //       // =========================

  //       if (person.systems.includes('onePortal') && person.onePortal) {
  //         sections.push('[ ระบบ : One Portal ]');

  //         person.onePortal.companies.forEach((company: any) => {
  //           sections.push(`${company.COMPANY_NAME} (${company.COMPANY_CODE})`);
  //         });

  //         if (person.onePortal.role) {
  //           sections.push(`ประเภทสิทธิ์ : ${person.onePortal.role}`);
  //         }

  //         if (person.onePortal.responseType) {
  //           sections.push(`ประเภทรายการ : ${person.onePortal.responseType}`);
  //         }

  //         sections.push('');
  //       }

  //       // =========================
  //       // ONEE
  //       // =========================

  //       if (person.systems.includes('onee') && person.onee) {
  //         sections.push('[ ระบบ : OneE ]');

  //         person.onee.companies.forEach((company: any) => {
  //           sections.push(`${company.COMPANY_NAME} (${company.COMPANY_CODE})`);
  //         });

  //         if (person.onee.permission) {
  //           sections.push(`สิทธิ์ : ${person.onee.permission.trim()}`);
  //         }

  //         if (person.onee.supervisor) {
  //           sections.push(`หัวหน้างาน : ${person.onee.supervisor.label}`);
  //         }

  //         sections.push('');
  //       }

  //       // =========================
  //       // NOTE
  //       // =========================

  //       if (person.note) {
  //         sections.push(`หมายเหตุ : ${person.note}`);
  //       }

  //       return sections.join('\n');
  //     })
  //     .join('\n\n=================================\n');
  // }
  buildRequestSummary(data: any[]): string {
    return data
      .map((person, index) => {
        let html = '';

        // =========================
        // HEADER
        // =========================

        html += `<div class="request-person">`;
        html += `<h3>${index + 1}. ${person.openFor?.isFreelance ? 'Freelance' : 'พนักงาน'}</h3>`;

        if (person.openFor?.isFreelance) {
          html += `
          <table>
            <tr><th>ชื่อ-นามสกุลภาษาไทย</th><td>${person.freelance.firstNameTh} ${person.freelance.lastNameTh}</td></tr>
            <tr><th>ชื่อ-นามสกุลภาษาอังกฤษ</th><td>${person.freelance.firstNameEn} ${person.freelance.lastNameEn}</td></tr>
            <tr><th>บริษัท</th><td>${person.freelance.company?.COMPANY_NAME} (${person.freelance.company?.COMPANY_CODE})</td></tr>
            <tr><th>แผนก</th><td>${person.freelance.department?.COSTCENT}-${person.freelance.department?.NAMECOSTCENT}</td></tr>
            <tr><th>ตำแหน่ง</th><td>${person.freelance.position}</td></tr>
            <tr><th>อีเมล</th><td>${person.freelance.email}</td></tr>
            <tr><th>เบอร์</th><td>${person.phone}</td></tr>
          </table><br>
        `;
        } else {
          html += `
          <table>
            <tr><th>ชื่อ-นามสกุลภาษาไทย</th><td>${person.openFor?.label.split('-')[1]}</td></tr>
            <tr><th>ชื่อ-นามสกุลภาษาอังกฤษ</th><td>${person.openFor?.labelEN.split('-')[1]}</td></tr>
            <tr><th>รหัสพนักงาน</th><td>${person.openFor?.value}</td></tr>
            <tr><th>AD USER</th><td>${person.openFor?.AD_USER}</td></tr>
            <tr><th>บริษัท</th><td>${person.openFor?.COMPANY_NAME}</td></tr>
            <tr><th>แผนก</th><td>${person.openFor?.DEPARTMENT}</td></tr>
            <tr><th>ตำแหน่ง</th><td>${person.openFor?.POST}</td></tr>
            <tr><th>อีเมล</th><td>${person.openFor?.EMAIL}</td></tr>
            <tr><th>เบอร์</th><td>${person.openFor?.USR_MOBILE ?? person.phone}</td></tr>
          </table><br>
        `;
        }

        // =========================
        // ORACLE
        // =========================

        if (person.systems.includes('oracle') && person.oracle) {
          html += `<h4>Oracle</h4><ul>`;

          person.oracle.companies.forEach((companyItem: any) => {
            html += `<b>${companyItem.company.COMPANY_NAME} (${companyItem.company.COMPANY_CODE})</b>`;

            companyItem.modules
              .filter((m: any) => m.permission && m.permission.trim() !== '-')
              .forEach((m: any) => {
                html += `<li style="margin-left:20px">${m.module.trim()} - ${m.permission.trim()}</li>`;
              });
          });

          html += `</ul>`;
        }

        // =========================
        // BMS
        // =========================

        if (person.systems.includes('bms') && person.bms) {
          html += `<h4>BMS</h4><ul>`;

          person.bms.companies.forEach((company: any) => {
            html += `<li>${company.COMPANY_NAME} (${company.COMPANY_CODE})</li>`;
          });

          if (person.bms.detail) {
            html += `สิทธิ์เหมือน : ${person.bms.detail.label}`;
          }

          html += `</ul>`;
        }

        // =========================
        // ONE PORTAL
        // =========================

        if (person.systems.includes('onePortal') && person.onePortal) {
          html += `<h4>One Portal</h4><ul>`;

          person.onePortal.companies.forEach((company: any) => {
            html += `<li>${company.COMPANY_NAME} (${company.COMPANY_CODE})</li>`;
          });

          if (person.onePortal.role) {
            html += `ประเภทสิทธิ์ : ${person.onePortal.role}<br>`;
          }

          if (person.onePortal.responseType) {
            html += `ประเภทรายการ : ${person.onePortal.responseType}`;
          }

          html += `</ul>`;
        }

        // =========================
        // ONEE
        // =========================

        if (person.systems.includes('onee') && person.onee) {
          html += `<h4>OneE</h4><ul>`;

          person.onee.companies.forEach((company: any) => {
            html += `<li>${company.COMPANY_NAME} (${company.COMPANY_CODE})</li>`;
          });

          if (person.onee.permission) {
            html += `สิทธิ์ : ${person.onee.permission.trim()}<br>`;
          }

          if (person.onee.supervisor) {
            html += `หัวหน้างาน : ${person.onee.supervisor.label}`;
          }

          html += `</ul>`;
        }

        // =========================
        // NOTE
        // =========================

        if (person.note) {
          html += `<p><b>หมายเหตุ :</b> ${person.note}</p>`;
        }

        html += `</div>`;

        return html;
      })
      .join('<hr>');
  }

  // Validate
  validateRequiredField(event: Event, person: any, field: string, label: string) {
    const input = event.target as HTMLInputElement;

    const value = input.value.trim();

    person.freelance[field] = value;

    person.errors ??= {};

    if (!value) {
      person.errors[field] = `กรุณากรอก${label}`;
    } else {
      delete person.errors[field];
    }

    this.touchSpecificPeople();
  }
  validateSelectField(value: any, person: any, field: string, label: string) {
    person.errors ??= {};

    if (!value) {
      person.errors[field] = `กรุณาเลือก${label}`;
    } else {
      delete person.errors[field];
    }

    this.touchSpecificPeople();
  }
  validateThaiField(event: Event, person: any, field: string, label: string) {
    const input = event.target as HTMLInputElement;

    const thaiOnly = input.value.replace(/[^ก-๙\s]/g, '');

    input.value = thaiOnly;

    person.freelance[field] = thaiOnly;

    person.errors ??= {};

    if (!thaiOnly.trim()) {
      person.errors[field] = `กรุณากรอก${label}`;
    } else {
      delete person.errors[field];
    }

    this.touchSpecificPeople();
  }
  validateEnglishField(event: Event, person: any, field: string, label: string) {
    const input = event.target as HTMLInputElement;

    const englishOnly = input.value.replace(/[^a-zA-Z\s]/g, '');

    input.value = englishOnly;

    person.freelance[field] = englishOnly;

    person.errors ??= {};

    if (!englishOnly.trim()) {
      person.errors[field] = `กรุณากรอก${label}`;
    } else {
      delete person.errors[field];
    }

    this.touchSpecificPeople();
  }
  validateEmail(event: Event, person: any) {
    const input = event.target as HTMLInputElement;

    const value = input.value.trim();

    person.freelance.email = value;

    person.errors ??= {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      person.errors['email'] = 'กรุณากรอกอีเมล';
    } else if (!emailRegex.test(value)) {
      person.errors['email'] = 'รูปแบบอีเมลไม่ถูกต้อง';
    } else {
      delete person.errors['email'];
    }

    this.touchSpecificPeople();
  }
  clearFreelanceErrors(person: any) {
    if (!person.errors) {
      return;
    }

    const freelanceFields = [
      'firstNameTh',
      'lastNameTh',
      'firstNameEn',
      'lastNameEn',
      'company',
      'department',
      'position',
      'email',
    ];

    freelanceFields.forEach((field) => {
      delete person.errors[field];
    });
  }

  // ระบบเฉพาะ
  validateOracleCompany(companyItem: any, person: any, index: number) {
    person.errors ??= {};

    const key = 'oracle_company_' + index;

    if (!companyItem.company) {
      person.errors[key] = 'กรุณาเลือกบริษัท';
    } else {
      delete person.errors[key];
    }

    this.touchSpecificPeople();
  }
  validateAllOraclePermissions(person: any) {
    person.errors ??= {};

    person.oracle.companies.forEach((companyItem: any, index: number) => {
      const key = 'oracle_permission_' + index;

      const hasPermission = companyItem.modules?.some((m: any) => {
        const permission = (m.permission ?? '').trim();

        return permission !== '' && permission !== '-';
      });

      if (!hasPermission) {
        person.errors[key] = 'กรุณาเลือกสิทธิ์อย่างน้อย 1 รายการ';
      } else {
        delete person.errors[key];
      }
    });

    this.touchSpecificPeople();
  }
  validateBmsCompanies(person: any) {
    person.errors ??= {};

    if (!person.bms.companies?.length) {
      person.errors['bms_companies'] = 'กรุณาเลือกบริษัท';
    } else {
      delete person.errors['bms_companies'];
    }

    this.touchSpecificPeople();
  }
  // validateBmsDetail(event: Event, person: any) {
  //   const input = event.target as HTMLInputElement;

  //   const value = input.value.trim();

  //   person.bms.detail = value;

  //   person.errors ??= {};

  //   if (!value) {
  //     person.errors['bms_detail'] = 'กรุณากรอกสิทธิ์';
  //   } else {
  //     delete person.errors['bms_detail'];
  //   }

  //   this.touchSpecificPeople();
  // }
  validateBmsDetail(value: any, person: any) {
    person.bms.detail = value;

    person.errors ??= {};

    if (!value) {
      person.errors['bms_detail'] = 'กรุณาเลือกพนักงาน';
    } else {
      delete person.errors['bms_detail'];
    }

    this.touchSpecificPeople();
  }
  validateOneeCompanies(person: any) {
    person.errors ??= {};

    if (!person.onee.companies?.length) {
      person.errors['onee_companies'] = 'กรุณาเลือกบริษัท';
    } else {
      delete person.errors['onee_companies'];
    }

    this.touchSpecificPeople();
  }
  validateOneePermission(value: any, person: any) {
    person.errors ??= {};

    if (!value) {
      person.errors['onee_permission'] = 'กรุณาเลือกสิทธิ์';
    } else {
      delete person.errors['onee_permission'];
    }

    this.touchSpecificPeople();
  }
  // validateOneeSupervisor(event: Event, person: any) {
  //   const input = event.target as HTMLInputElement;

  //   const value = input.value.trim();

  //   person.onee.supervisor = value;

  //   person.errors ??= {};

  //   if (!value) {
  //     person.errors['onee_supervisor'] = 'กรุณากรอกหัวหน้างาน';
  //   } else {
  //     delete person.errors['onee_supervisor'];
  //   }

  //   this.touchSpecificPeople();
  // }
  validateOneeSupervisor(value: any, person: any) {
    person.onee.supervisor = value;

    person.errors ??= {};

    if (!value) {
      person.errors['onee_supervisor'] = 'กรุณาเลือกหัวหน้างาน';
    } else {
      delete person.errors['onee_supervisor'];
    }

    this.touchSpecificPeople();
  }
  validateOnePortalCompanies(person: any) {
    person.errors ??= {};

    if (!person.onePortal.companies?.length) {
      person.errors['oneportal_companies'] = 'กรุณาเลือกบริษัท';
    } else {
      delete person.errors['oneportal_companies'];
    }

    this.touchSpecificPeople();
  }
  validateOnePortalRole(value: any, person: any) {
    person.errors ??= {};

    if (!value) {
      person.errors['oneportal_role'] = 'กรุณาเลือกประเภทสิทธิ์';
    } else {
      delete person.errors['oneportal_role'];
    }

    this.touchSpecificPeople();
  }
  validateOnePortalResponseType(value: any, person: any) {
    person.errors ??= {};

    if (!value) {
      person.errors['oneportal_response_type'] = 'กรุณาเลือกประเภทสิทธิ์';
    } else {
      delete person.errors['oneportal_response_type'];
    }

    this.touchSpecificPeople();
  }
  clearSystemErrors(person: any, system: string) {
    if (!person.errors) {
      return;
    }

    Object.keys(person.errors).forEach((key) => {
      if (key.startsWith(system)) {
        delete person.errors[key];
      }
    });
  }

  // MASTER
  getMasterPermission() {
    this.masterService.MasterPermission().subscribe({
      next: (data) => {
        this.oracleModules = data.Modules;
        this.oraclePermissions = [{ ID: 0, RoleName: '-' }, ...data.Roles];
        this.oneePermissions = data.Permissions;
        this.onePortalResponseTypes = data.ResponseTypes;
        this.onePortalRole = data.Roles_bms;
        this.specificPeople.set([this.createSpecificPerson()]);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
        console.log(data);
        this.companyList = data.map((item: any) => ({
          ...item,
          COMPANY_CODE: this.remapCompanyCode(item.COMPANY_CODE),
        }));

        this.companyList_bms = [
          ...data
            .filter((item: any) =>
              ['OTV', 'GCH', 'GTV', 'CHA', 'ATM', 'NMP'].includes(item.COMPANY_CODE),
            )
            .map((item: any) => ({
              ...item,
              COMPANY_CODE: this.remapCompanyCode(item.COMPANY_CODE),
            })),
          {
            COMPANY_CODE: 'GCH',
            COMPANY_NAME: 'บริษัท จีเอ็มเอ็ม แชนแนล โฮลดิ้ง จำกัด',
          },
          {
            COMPANY_CODE: 'NMP',
            COMPANY_NAME: 'บริษัท นางแมวป่า จำกัด',
          },
        ];
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  getDepartments() {
    this.masterService.getDepartmentMaster().subscribe({
      next: (data) => {
        this.departmentList = data;
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  getOpenFor() {
    this.itServiceService
      .getOpenFor({ currentEmpId: this.authService.userData().CODEMPID })
      .subscribe({
        next: (res) => {
          console.log(res);
          this.openForOptions.set(res.data);

          this.openForOptions_noFreelance.set(
            res.data.filter((item: any) => item.value !== '__FREELANCE__'),
          );

          const defaultOption = this.openForOptions().find(
            (opt) => opt.value === this.authService.userData().CODEMPID,
          );

          if (defaultOption) {
            // this.selectedOpenFor.set(defaultOption);

            this.specificPeople.update((people) =>
              people.map((person, index) =>
                index === 0
                  ? {
                      ...person,
                      openFor: defaultOption,
                    }
                  : person,
              ),
            );
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        },
      });
  }
  getDeptHeads() {
    this.settingService.getDeptHeads().subscribe({
      next: (res) => {
        this.deptHeads = res.data;
      },
      error: (err) => {
        console.error(err);
      },
    });
  }
}
