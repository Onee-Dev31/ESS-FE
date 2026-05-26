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

type SpecificSystemKey = 'bms' | 'oracle' | 'onee' | 'onePortal';

interface SpecificPersonRequest {
  id: number;
  openFor: string;
  phone: string;
  note: string;

  systems: SpecificSystemKey[];

  bms: {
    companies: any[];
    detail: string;
  };

  oracle: {
    companies: any[];
    modules: {
      module: string;
      permission: string;
    }[];
  };

  onee: {
    companies: any[];
    permission: string;
    supervisor: string;
  };

  onePortal: {
    companies: any[];
    responseType: string;
    supervisor: string;
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
  private userService = inject(UserService);
  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private signalrService = inject(SignalrService);

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
  selectedOpenFor = signal<{ value: string; label: string }>({
    value: this.authService.userData().CODEMPID,
    label: '',
  });
  openforOneejob: string = '';
  isAnnounceChooseFreelance = signal<boolean>(false);
  isFreelanceSelected = computed(() => this.selectedOpenFor().value === '__FREELANCE__');
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
    { key: 'onee', label: 'OneE', icon: 'fa-layer-group' },
    { key: 'onePortal', label: 'One Portal', icon: 'fa-globe' },
  ];
  oracleModules = ['AP', 'AR', 'CM', 'FA', 'IE', 'INV', 'PJC', 'GL', 'GL Secondary'];
  oraclePermissions = ['-', 'Super User', 'User', 'Viewer'];
  bmsTeams = ['Team เดียวกัน', 'สิทธิ์เหมือนคุณ xxx', 'อื่นๆ'];
  bmsPermissions = ['-', 'ดูข้อมูล', 'เพิ่ม/แก้ไข', 'อนุมัติ', 'Admin'];
  oneePermissions = ['Accounting', 'Admin', 'Co-Producer', 'Producer', 'Sale'];
  onePortalResponseTypes = ['Customer', 'Supplier', 'All'];

  ngOnInit() {
    // this.getServiceType();
    this.getOpenFor();
    this.getCompanies();
    this.specificPeople.set([this.createSpecificPerson()]);

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

  onOpenForChange(value: string) {
    const option = this.openForOptions().find((opt) => opt.value === value);
    this.selectedOpenFor.set({ value, label: option?.label ?? '' });
    if (value === '__FREELANCE__') {
      this.isAnnounceChooseFreelance.set(true);
      setTimeout(() => {
        this.detailTextarea.nativeElement.focus();
        this.detailTextarea.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      this.isAnnounceChooseFreelance.set(false);
    }
  }

  onSpecificOpenForChange(person: SpecificPersonRequest, value: string) {
    person.openFor = value;
    this.touchSpecificPeople();
  }

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
    person.systems = person.systems.includes(system)
      ? person.systems.filter((item) => item !== system)
      : [...person.systems, system];
    this.touchSpecificPeople();
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

  submit() {
    const payload = this.specificPeople().map((person) => ({
      openFor: person.openFor,
      phone: person.phone,
      note: person.note,

      systems: person.systems,

      bms: person.systems.includes('bms') ? person.bms : null,

      oracle: person.systems.includes('oracle') ? person.oracle : null,

      onee: person.systems.includes('onee') ? person.onee : null,

      onePortal: person.systems.includes('onePortal') ? person.onePortal : null,
    }));

    console.log('SUBMIT PAYLOAD:', payload);
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
    if (this.IsOneeJob) {
      formData.append('openForType', 'ONEEJOB');
      formData.append('openForCodeempid', this.openforOneejob);
    } else if (this.isFreelanceSelected()) {
      formData.append('openForType', 'freelance');
    } else {
      const isSelf = this.selectedOpenFor().value === this.authService.userData().CODEMPID;
      formData.append('openForType', isSelf ? 'self' : 'other');
      formData.append('openForCodeempid', this.selectedOpenFor().value);
    }
    formData.append(
      'description',
      this.IsOneeJob ? `[ONEE JOBS]\n ${this.requestDetails()}` : this.requestDetails(),
    );
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

  // GET MASTER
  // getServiceType() {
  //   this.itServiceService.getServiceType().subscribe({
  //     next: (res) => {
  //       console.log(res.data);
  //       const mappedServices_main = res.data.mainServices.map((item: any) => ({
  //         ...item,
  //         checked: false,
  //         disabled: false,
  //       }));

  //       this.serviceOptions.set(mappedServices_main);
  //       this.setDefaultSpecificService();

  //       const mappedServices_user = res.data.userSubOptions.map((item: any) => ({
  //         ...item,
  //         checked: false,
  //       }));

  //       this.userSubOptions.set(mappedServices_user);

  //       const mappedServices_system = res.data.systemSubOptions.map((item: any) => ({
  //         ...item,
  //         checked: false,
  //       }));

  //       this.systemSubOptions.set(mappedServices_system);

  //       // this.availableCategories = res.data
  //       // this.cdr.detectChanges();
  //     },
  //     error: (error) => {
  //       console.error('Error fetching data:', error);
  //     },
  //   });
  // }
  getOpenFor() {
    this.itServiceService
      .getOpenFor({ currentEmpId: this.authService.userData().CODEMPID })
      .subscribe({
        next: (res) => {
          this.openForOptions.set(res.data);
          const defaultOption = this.openForOptions().find(
            (opt) => opt.value === this.authService.userData().CODEMPID,
          );
          if (defaultOption) {
            this.selectedOpenFor.set({
              value: defaultOption.value,
              label: defaultOption.label,
            });
            this.specificPeople.update((people) =>
              people.map((person, index) =>
                index === 0 ? { ...person, openFor: defaultOption.value } : person,
              ),
            );
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        },
      });
  }

  getDetailFromJobsByApplicantId(id: string) {
    this.itServiceService.getDetailFromJobsByApplicant(id).subscribe({
      next: (res) => {
        // console.log('getDetailFromJobsByApplicantId', res);
        this.detailJobs = res;
        const data = res[0];
        // console.log('data : ', data);
        this.openforOneejob = data
          ? `${data.FirstNameThai} ${data.LastNameThai} (พนักงานใหม่)`
          : '';
        this.requestDetails.set(
          `ชื่อ-นามสกุล: ${data.FirstNameThai} ${data.LastNameThai} (พนักงานใหม่)\n` +
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
    return {
      id: this.nextSpecificPersonId++,
      openFor: this.authService.userData().CODEMPID ?? '',
      phone: PhoneUtil.formatPhoneNumber(this.authService.userData()?.TELOFF ?? ''),
      note: '',
      systems: [],

      bms: {
        companies: [],
        detail: '',
      },

      oracle: {
        companies: [],
        modules: this.oracleModules.map((module) => ({
          module,
          permission: '-',
        })),
      },

      onee: {
        companies: [],
        permission: '',
        supervisor: '',
      },

      onePortal: {
        companies: [],
        responseType: '',
        supervisor: '',
      },
    };
  }

  private isSpecificPersonValid(person: SpecificPersonRequest): boolean {
    const phoneDigits = (person.phone ?? '').replace(/\D/g, '');

    const phoneValid = phoneDigits.length === 4 || phoneDigits.length === 10;

    if (!person.openFor || !phoneValid || person.systems.length === 0) {
      return false;
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
  departmentList: any[] = [];
  filteredDepartmentList: any[] = [];

  // function

  private remapCompanyCode(code: string): string {
    if (code === 'OTD') return 'ONEE';
    if (code === 'OTV') return 'ONE31';
    return code;
  }

  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
        console.log(data);
        this.companyList = data.map((item: any) => ({
          ...item,
          COMPANY_CODE: this.remapCompanyCode(item.COMPANY_CODE),
        }));
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }

  getDepartments() {
    this.masterService.getDepartmentMaster().subscribe({
      next: (data) => {
        // console.log(data);
        this.departmentList = data;
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }
}
