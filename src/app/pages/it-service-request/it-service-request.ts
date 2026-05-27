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
import { SignalrService } from '../../services/signalr.service';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { MasterDataService } from '../../services/master-data.service';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { EmpAdForm } from '../dashboard-it/empployee-ad-management/emp-ad-form/emp-ad-form';

@Component({
  selector: 'app-it-service-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    NzSelectModule,
    ExampleServiceRequestModal,
    FilePreviewModalComponent,
    NzModalModule,
    EmpAdForm,
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
  private signalrService = inject(SignalrService);
  private masterService = inject(MasterDataService);

  @ViewChild('detailTextarea') detailTextarea!: ElementRef;

  authData = JSON.parse(localStorage.getItem('allData') || '{}');

  phoneModel = '';
  phoneError = '';
  phoneNumber = signal('');
  requestDetails = signal('');
  attachments = signal<{ name: string; size: number; file: File }[]>([]);
  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  readonly FILE_CONFIG = {
    maxFiles: 5,
    maxSizeMB: 5,
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'xls'],
  };

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
  private readonly BASIC_SYSTEM_SERVICE_ID = 22;
  isBasicSystemServiceSelected = computed(() =>
    this.serviceOptions().some(
      (service) => service.id === this.BASIC_SYSTEM_SERVICE_ID && service.checked,
    ),
  );
  IsOneeJob: boolean = false;
  applicantId: string = '';
  detailJobs: any = null;
  isFormValid = computed(() => {
    const services = this.serviceOptions();
    const hasService = services.some((s) => s.checked);
    const isRequestSystemChecked = services.some(
      (s) => s.checked && (s.id === this.BASIC_SYSTEM_SERVICE_ID || s.value === 'requser'),
    );
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
      this.phoneNumber().length > 0 &&
      (this.phoneNumber().length === 4 || this.phoneNumber().length === 10);
    const openForValid = this.selectedOpenFor().value !== null;
    // const freelanceValid = !this.isFreelanceSelected() || this.freelanceName().trim().length > 0;
    return hasService && openForValid && subValidationPassed && detailValid && phoneValid;
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
        this.detailTextarea.nativeElement.focus();
        this.detailTextarea.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      this.isAnnounceChooseFreelance.set(false);
    }
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

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();

    if (event.dataTransfer?.files) {
      this.addFiles(event.dataTransfer.files);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(input.files);
    }
    input.value = '';
  }

  private addFiles(files: FileList) {
    if (!files || files.length === 0) return;

    const current = this.attachments();
    const errorMap = new Map<string, string[]>();
    const validFiles: { name: string; size: number; file: File }[] = [];

    for (const file of Array.from(files)) {
      const reasons: string[] = [];

      // max files
      if (current.length + validFiles.length >= this.FILE_CONFIG.maxFiles) {
        reasons.push(`อัปโหลดได้สูงสุด ${this.FILE_CONFIG.maxFiles} ไฟล์`);
      }

      const sizeMB = file.size / (1024 * 1024);

      if (sizeMB > this.FILE_CONFIG.maxSizeMB) {
        reasons.push(`ขนาดเกิน ${this.FILE_CONFIG.maxSizeMB} MB`);
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

      if (
        !this.FILE_CONFIG.allowedTypes.includes(file.type) &&
        !this.FILE_CONFIG.allowedExtensions.includes(ext)
      ) {
        reasons.push('ประเภทไฟล์ไม่รองรับ');
      }

      if (reasons.length > 0) {
        reasons.forEach((reason) => {
          // max files ไม่ต้องแสดงชื่อไฟล์
          if (reason.includes('อัปโหลดได้สูงสุด')) {
            if (!errorMap.has(reason)) {
              errorMap.set(reason, []);
            }
            return;
          }

          const fileNames = errorMap.get(reason) ?? [];
          fileNames.push(file.name);
          errorMap.set(reason, fileNames);
        });
      } else {
        validFiles.push({
          name: file.name,
          size: file.size,
          file,
        });
      }
    }
    if (errorMap.size > 0) {
      const html = Array.from(errorMap.entries())
        .map(([reason, fileNames]) => {
          // ไม่มีชื่อไฟล์
          if (fileNames.length === 0) {
            return `
                  <div style="margin-bottom:12px; text-align:center;">
                    <div style="font-weight:700;">${reason}</div>
                  </div>
                `;
          }

          return `
              <div style="margin-bottom:12px; text-align:center;">
                <div style="font-weight:700;">${reason}</div>

                <div style="margin-top:4px; color:#64748b;">
                  ${fileNames.map((name) => `• ${name}`).join('<br>')}
                </div>
              </div>
            `;
        })
        .join('');

      this.swalService.warning('', undefined, html);
    }

    if (validFiles.length > 0) {
      this.attachments.set([...current, ...validFiles]);
    }
  }

  viewFile(fileObj: { name: string; file: File }) {
    const url = URL.createObjectURL(fileObj.file);
    this.previewFiles.set([
      {
        fileName: fileObj.name,
        date: dayjs().format('DD/MM/YYYY HH:mm'),
        url,
        type: fileObj.file.type,
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  removeAttachment(index: number) {
    const next = [...this.attachments()];
    next.splice(index, 1);
    this.attachments.set(next);
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
    this.syncBasicSystemSelection();
    this.isSystemCategorySelected.set(
      selectedValues.includes('requser') || this.isBasicSystemServiceSelected(),
    );

    if (!selectedValues.includes('requser') && !this.isBasicSystemServiceSelected()) {
      this.selectedSystemTypes.set([]);
      this.userSubOptions.update((items) => items.map((i) => ({ ...i, checked: false })));
      this.systemSubOptions.update((items) => items.map((i) => ({ ...i, checked: false })));
    }
  }

  private syncBasicSystemSelection() {
    const shouldSelectBasic = this.isBasicSystemServiceSelected();

    if (!shouldSelectBasic) {
      return;
    }

    this.selectedSystemTypes.update((types) =>
      types.includes('user') ? types : [...types, 'user'],
    );
    this.userSubOptions.update((items) => items.map((item) => ({ ...item, checked: true })));
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
    const selectedServices = this.serviceOptions().filter((s) => s.checked);

    if (selectedServices.length === 0) {
      this.swalService.warning('แจ้งเตือน', 'กรุณาเลือกบริการอย่างน้อย 1 รายการ');
      return;
    }

    const isRequestSystem = selectedServices.some(
      (s) => s.id === this.BASIC_SYSTEM_SERVICE_ID || s.value === 'requser',
    );
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
    this.attachments.set([]);
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

    this.attachments().forEach((item) => {
      if (item?.file instanceof File) {
        formData.append('files', item.file);
      }
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

  isShowSpecialForm(): boolean {
    return this.serviceOptions().some((s) => s.id === 22 && s.checked);
  }

  showEmpAdForm = false;
  requestUserData: any = null;
  onServiceChange(index: number, service: any) {
    this.toggleService(index);

    if (service.id === 22 && service.checked) {
      this.showEmpAdForm = true;
    }
  }

  closeEmpAdForm() {
    this.showEmpAdForm = false;

    const service = this.serviceOptions().find((s) => s.id === 22);

    // ถ้าไม่มีข้อมูลที่ save กลับมา
    if (!this.requestUserData && service?.checked) {
      const index = this.serviceOptions().findIndex((s) => s.id === 22);

      if (index !== -1) {
        this.toggleService(index);
      }
    }
  }

  onEmployeeFormSave(data: any) {
    console.log(data);
    this.requestUserData = data;

    const requestUserDetail = `
        ชื่อ-นามสกุลภาษาไทย : ${data.NAMETHAI}

        ชื่อ-นามสกุลภาษาอังกฤษ : ${data.TITLEENG ?? ''} ${data.NAMEENG}

        ชื่อเล่น : ${data.NICKNAME}

        ตำแหน่ง : ${data.POST}

        บริษัท : ${data.COMPANY_NAME}

        แผนก : ${data.DEPARTMENT}

        เบอร์โทรศัพท์ : ${data.USR_MOBILE}

        อีเมล : ${data.EMAIL}

        ชั้น : ${data.FLOOR}

        หัวหน้า : ${data.HEAD_NAME}

        AD User หัวหน้า : ${data.AD_USER}
        `.trim();

    this.requestDetails.set(requestUserDetail);
    this.showEmpAdForm = false;
  }

  // GET MASTER
  getServiceType() {
    this.itServiceService.getServiceType().subscribe({
      next: (res) => {
        console.log(res.data);
        const mappedServices_main = res.data.mainServices
          .filter((item: any) => item.id !== 6)
          .map((item: any) => ({
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
          const mapped = res.data.map((item: any) => ({
            ...item,
            label: item.value === '__FREELANCE__' ? 'Freelance หรือ บุคคลอื่น' : item.label,
          }));

          this.openForOptions.set(mapped);
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

  companyList: any[] = [];
  departmentList: any[] = [];
  filteredDepartmentList: any[] = [];

  private remapCompanyCode(code: string): string {
    if (code === 'OTD') return 'ONEE';
    if (code === 'OTV') return 'ONE31';
    return code;
  }

  getCompanies() {
    this.masterService.getCompanyMaster().subscribe({
      next: (data) => {
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
        this.departmentList = data;
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }
}
