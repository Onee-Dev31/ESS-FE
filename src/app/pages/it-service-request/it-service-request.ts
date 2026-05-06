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
import { ExampleServiceRequestModal } from '../../components/modals/example-service-request-modal/example-service-request-modal';

@Component({
  selector: 'app-it-service-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    NzSelectModule,
    ExampleServiceRequestModal,
  ],
  templateUrl: './it-service-request.html',
  styleUrl: './it-service-request.scss',
})
export class ITServiceRequestComponent implements OnInit {
  // Inject Services
  private swalService = inject(SwalService);
  private userService = inject(UserService);
  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

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
  freelanceName = signal<string>('');
  isAnnounceChooseFreelance = signal<boolean>(false);
  isFreelanceSelected = computed(() => this.selectedOpenFor().value === '__FREELANCE__');
  IS_EXAMPLE = signal<boolean>(false);

  isSystemCategorySelected = signal(false);
  IsOneeJob: boolean = false;
  applicantId: string = '';
  detailJobs: any = null;
  isFormValid = computed(() => {
    const services = this.serviceOptions();
    const hasService = services.some((s) => s.checked);
    const isRequestSystemChecked = services.find((s) => s.value === 'request_system')?.checked;
    let subValidationPassed = true;

    if (isRequestSystemChecked) {
      const types = this.selectedSystemTypes();
      const hasType = types.length > 0;

      const hasUserType = types.includes('user');
      const hasSystemType = types.includes('system');

      const userSubSelected = this.userSubOptions().some((o) => o.checked);
      const systemSubSelected = this.systemSubOptions().some((o) => o.checked);

      // Must have at least one type selected, and if a type is selected, must have sub-options
      subValidationPassed =
        hasType && (!hasUserType || userSubSelected) && (!hasSystemType || systemSubSelected);
    }

    const detailValid = this.requestDetails().trim().length > 0;
    const phoneValid =
      this.phoneNumber().trim().length > 0 &&
      (this.phoneNumber().trim().length === 4 || this.phoneNumber().trim().length === 10);
    const openForValid = this.selectedOpenFor().value !== null;
    const freelanceValid = !this.isFreelanceSelected() || this.freelanceName().trim().length > 0;
    return (
      hasService &&
      openForValid &&
      subValidationPassed &&
      detailValid &&
      phoneValid &&
      freelanceValid
    );
  });

  ngOnInit() {
    this.getServiceType();
    this.getOpenFor();

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
        this.detailTextarea.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      this.isAnnounceChooseFreelance.set(false);
    }
  }

  example() {
    console.log('example');
    this.IS_EXAMPLE.set(true);
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
    console.log();
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
    const selectedServices = this.serviceOptions().filter((s) => s.checked);

    if (selectedServices.length === 0) {
      this.swalService.warning('แจ้งเตือน', 'กรุณาเลือกบริการอย่างน้อย 1 รายการ');
      return;
    }

    const isRequestSystem = selectedServices.some((s) => s.value === 'request_system');
    if (isRequestSystem) {
      if (this.selectedSystemTypes().length === 0) {
        this.swalService.warning('แจ้งเตือน', 'กรุณาเลือกประเภทระบบ (Basic หรือ Specific)');
        return;
      }

      const hasUserType = this.selectedSystemTypes().includes('user');
      const hasSystemType = this.selectedSystemTypes().includes('system');

      const userSubSelected = this.userSubOptions().some((o) => o.checked);
      const systemSubSelected = this.systemSubOptions().some((o) => o.checked);

      if (hasUserType && !userSubSelected) {
        this.swalService.warning('แจ้งเตือน', 'กรุณาระบุระบบพื้นฐาน (Basic System) ที่ต้องการ');
        return;
      }

      if (hasSystemType && !systemSubSelected) {
        this.swalService.warning('แจ้งเตือน', 'กรุณาระบุระบบเฉพาะ (Specific System) ที่ต้องการ');
        return;
      }
    }

    if (!this.requestDetails().trim()) {
      this.swalService.warning('แจ้งเตือน', 'กรุณากรอกรายละเอียด (Details)');
      return;
    }

    this.showSummaryModal.set(true);
  }

  closeSummaryModal() {
    this.showSummaryModal.set(false);
  }

  clearForm() {
    this.serviceOptions.update((items) => items.map((i) => ({ ...i, checked: false })));
    this.isSystemCategorySelected.set(false);
    this.userSubOptions.update((items) => items.map((i) => ({ ...i, checked: false })));
    this.systemSubOptions.update((items) => items.map((i) => ({ ...i, checked: false })));
    // this.selectedOpenFor.set('self');
    // this.otherOpenForName.set('');
    this.requestDetails.set('');
    this.freelanceName.set('');
    this.selectedSystemTypes.set([]);

    this.phoneNumber.set('');

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
      formData.append('openForFreelanceName', this.freelanceName());
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

    console.log('formData', [...formData.entries()]);

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
          // console.log(res);
          if (res.success) {
            // this.signalrService.sendTestRealtime()
            this.swalService.success('ส่งคำขอเรียบร้อยแล้ว', res.ticketNumber).then(() => {
              this.clearForm();
              this.router.navigate(['/it-service-list']);
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
  getServiceType() {
    this.itServiceService.getServiceType().subscribe({
      next: (res) => {
        console.log(res.data);
        const mappedServices_main = res.data.mainServices.map((item: any) => ({
          ...item,
          checked: false,
          disabled: false,
        }));

        this.serviceOptions.set(mappedServices_main);

        const mappedServices_user = res.data.userSubOptions.map((item: any) => ({
          ...item,
          checked: false,
        }));

        this.userSubOptions.set(mappedServices_user);

        const mappedServices_system = res.data.systemSubOptions.map((item: any) => ({
          ...item,
          checked: false,
        }));

        this.systemSubOptions.set(mappedServices_system);

        // this.availableCategories = res.data
        // this.cdr.detectChanges();
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
          console.log(res.data);
          this.openForOptions.set(res.data);
          const defaultOption = this.openForOptions().find(
            (opt) => opt.value === this.authService.userData().CODEMPID,
          );
          if (defaultOption) {
            this.selectedOpenFor.set({
              value: defaultOption.value,
              label: defaultOption.label,
            });
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
        console.log('getDetailFromJobsByApplicantId', res);
        this.detailJobs = res;
        const data = res[0];
        console.log('data : ', data);
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
}
