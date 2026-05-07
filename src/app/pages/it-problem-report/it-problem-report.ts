import {
  Component,
  signal,
  inject,
  OnInit,
  computed,
  ChangeDetectorRef,
  effect,
  Input,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';
import { UserService, UserProfile } from '../../services/user.service';
import { PhoneUtil } from '../../utils/phone.util';
import {
  FilePreviewModalComponent,
  FilePreviewItem,
} from '../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { ItServiceMockService } from '../../services/it-service-mock.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SignalrService } from '../../services/signalr.service';

@Component({
  selector: 'app-it-problem-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    FilePreviewModalComponent,
    NzSelectModule,
  ],
  templateUrl: './it-problem-report.html',
  styleUrl: './it-problem-report.scss',
})
export class ItProblemReportComponent implements OnInit {
  private swalService = inject(SwalService);
  private userService = inject(UserService);
  private router = inject(Router);

  private signalrService = inject(SignalrService);
  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  problemFormData = signal({
    topic: '',
    detail: '',
    phoneNumber: '',
    categories: [] as any[],
    attachments: [] as { name: string; size?: number; file: File }[],
  });
  phoneModel = '';
  phoneError = '';
  authData = JSON.parse(localStorage.getItem('allData') || '{}');

  // MASTER
  availableCategories: any[] = [];
  openForOptions = signal<any[]>([]);
  selectedOpenFor = signal<string>(this.authService.userData().CODEMPID);

  // CONDITION
  @Input() openBy!: string;

  // CC
  ccSelected = signal<{ label: string; value: string }[]>([]);
  ccOptions = signal<{ label: string; value: string }[]>([]);
  readonly nzFilterOption = () => true;
  ccSearched = signal<boolean>(false);
  readonly CC_CATEGORIES = ['BMS', 'Oracle', 'Onee App'];

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

  ngOnInit() {
    this.getSubProblem();
    this.getOpenFor();
    const userData = this.authService.userData();
    if (userData?.TELOFF) {
      const formatted = PhoneUtil.formatPhoneNumber(userData.TELOFF);
      this.phoneModel = formatted;
      this.problemFormData.update((data) => ({ ...data, phoneNumber: formatted }));
    }
  }

  onCcSearch(search: string) {
    if (!search?.trim()) {
      this.ccOptions.set([]);
      this.ccSearched.set(false);
      return;
    }
    this.ccSearched.set(true);
    this.itServiceService.searchEmployees({ search, pageSize: 20 }).subscribe({
      next: (res) => {
        // console.log(res);
        this.ccOptions.set(
          (res.data || []).map((e: any) => ({
            // label: `${e.FullNameThai || e.FullNameEng || e.FullName || e.fullname || e.name || '-'} (${e.UserID || e.CODEEMPID || e.EmpNo || e.codeempid || '-'})`,
            label: `${e.UserID}-${e.FullNameThai} (${e.Nickname})`,
            value: e.UserID || e.CODEEMPID || e.EmpNo || e.codeempid || '',
          })),
        );
      },
    });
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let digitsOnly = input.value.replace(/\D/g, '');
    digitsOnly = digitsOnly.slice(0, 10);
    const formatted = PhoneUtil.formatPhoneNumber(digitsOnly);
    input.value = formatted;
    this.phoneModel = formatted;
    this.problemFormData.update((data) => ({ ...data, phoneNumber: this.phoneModel }));

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
    this.problemFormData.update((data) => ({ ...data, phoneNumber: formatted }));
  }

  isFormValid = computed(() => {
    const { topic, detail, categories, phoneNumber } = this.problemFormData();
    return (
      topic.trim().length > 0 &&
      detail.trim().length > 0 &&
      categories.length > 0 &&
      phoneNumber !== '' &&
      !this.phoneError
    );
  });

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  toggleCategory(cat: string) {
    const current = this.problemFormData();
    const isSelected = current.categories.includes(cat);

    this.problemFormData.set({
      ...current,
      categories: isSelected ? [] : [cat],
    });
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

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    this.addFiles(files);
  }

  private addFiles(files: FileList) {
    if (!files || files.length === 0) return;

    const current = this.problemFormData().attachments;
    const errors: string[] = [];
    const validFiles: { name: string; size: number; file: File }[] = [];

    for (const f of Array.from(files)) {
      const reasons: string[] = [];

      // เช็คจำนวน
      if (current.length + validFiles.length >= this.FILE_CONFIG.maxFiles) {
        reasons.push(`เกินจำนวนสูงสุด ${this.FILE_CONFIG.maxFiles} ไฟล์`);
      }

      // เช็คขนาด
      const sizeMB = f.size / (1024 * 1024);
      if (sizeMB > this.FILE_CONFIG.maxSizeMB) {
        reasons.push(`ขนาดเกิน ${this.FILE_CONFIG.maxSizeMB} MB`);
      }

      // เช็ค type
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      if (
        !this.FILE_CONFIG.allowedTypes.includes(f.type) &&
        !this.FILE_CONFIG.allowedExtensions.includes(ext)
      ) {
        reasons.push(`ประเภทไฟล์ไม่รองรับ`);
      }

      if (reasons.length > 0) {
        errors.push(`${f.name} (${reasons.join(', ')})`);
        this.swalService.warning(errors.join('\n'));
      } else {
        validFiles.push({ name: f.name, size: f.size, file: f });
      }
    }

    if (validFiles.length > 0) {
      this.problemFormData.update((data) => ({
        ...data,
        attachments: [...current, ...validFiles],
      }));
    }
  }

  // private addFiles(files: FileList) {
  //   if (files && files.length > 0) {
  //     const newAttachments = Array.from(files).map((f) => ({
  //       name: f.name,
  //       size: f.size,
  //       file: f,
  //     }));

  //     const currentAttachments = this.problemFormData().attachments;

  //     this.problemFormData.set({
  //       ...this.problemFormData(),
  //       attachments: [...currentAttachments, ...newAttachments],
  //     });
  //   }
  // }

  viewFile(fileObj: any) {
    if (fileObj.file) {
      const url = URL.createObjectURL(fileObj.file);
      this.previewFiles.set([
        {
          fileName: fileObj.name,
          date: dayjs().format('DD/MM/YYYY HH:mm'),
          url: url,
          type: fileObj.file.type,
        },
      ]);
      this.isPreviewModalOpen.set(true);
    } else {
      // For dummy data which doesn't have a real File object
      this.swalService.info('แจ้งเตือน', 'ไฟล์นี้เป็นข้อมูลตัวอย่าง ไม่สามารถเปิดดูได้จริง');
    }
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  removeAttachment(index: number) {
    const currentAttachments = [...this.problemFormData().attachments];
    currentAttachments.splice(index, 1);
    this.problemFormData.set({
      ...this.problemFormData(),
      attachments: currentAttachments,
    });
  }

  showSummaryModal = signal(false);

  submittedRequests = signal<any[]>([
    {
      id: 1,
      displayId: '#PRB2602-0001',
      date: new Date('2026-02-19T10:45:00'),
      topics: 'ระบบ ONEE เข้าใช้งานไม่ได้',
      detail: 'ล็อกอินแล้วขึ้น Error 500 ตลอดเวลา',
      phoneNumber: '081-234-5678',
      categories: ['Onee App', 'Software โปรแกรมต่างๆ'],
      attachments: [{ name: 'error-screenshot.png' }],
      status: 'Pending',
    },
  ]);

  get nextRequestId() {
    const nextId = this.submittedRequests().length + 1;
    return `#PRB2602-${String(nextId).padStart(4, '0')}`;
  }

  submit() {
    const data = this.problemFormData();
    if (!data.topic.trim() || !data.detail.trim()) {
      this.swalService.warning('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    this.problemFormData.update((data) => ({ ...data, phoneNumber: this.phoneModel }));
    this.showSummaryModal.set(true);
  }

  clearForm() {
    const original = this.authData.employee.TELOFF;
    this.phoneModel = '';
    this.cdr.detectChanges();
    this.phoneModel = original;

    this.problemFormData.set({
      topic: '',
      detail: '',
      phoneNumber: original,
      categories: [],
      attachments: [],
    });
  }

  closePage() {
    this.router.navigate(['/it-service-request']);
  }

  closeSummaryModal() {
    this.showSummaryModal.set(false);
  }

  confirmSubmission() {
    const data = this.problemFormData();
    const formData = new FormData();
    formData.append('subject', data.topic);
    formData.append('description', data.detail);
    formData.append('requesterAduser', this.authService.currentUser() || '-');
    formData.append('subCategoryId', data.categories[0].id);
    formData.append('contactPhone', data.phoneNumber);
    formData.append(
      'IsSelfRequestByIT',
      this.openBy
        ? 'false'
        : this.authService.userData().DEPARTMENT === '10806 IT Department'
          ? 'true'
          : 'false',
    ); //it เปิดให้ตัวเอง ?

    if (this.openBy === 'IT') {
      formData.append('openForCodeempid', this.selectedOpenFor());
    }
    formData.append('ticketTypeId', '2');

    const cc = this.ccSelected();
    if (cc.length > 0 && this.isVisibleCC()) {
      const ids = cc.map((c) => c.value);
      formData.append('CcCodeEmpIdsJson', JSON.stringify(ids));
    }

    data.attachments.forEach((item: any) => {
      if (item?.file instanceof File) {
        formData.append('files', item.file);
        // formData.append('fileDescriptions', item.name || '');
      }
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
          if (res.success) {
            this.signalrService.sendNewTicketNotification(res.ticketNumber);
            this.swalService.success('แจ้งปัญหาสำเร็จ', res.ticketNumber).then(() => {
              this.clearForm();
              this.router.navigate(['/it-service-list']);
            });
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error.error.message);
          this.swalService.warning('เกิดข้อผิดพลาด', error.error.message).then(() => {
            this.clearForm();
            this.router.navigate(['/it-service-list']);
          });
          // const message = error?.error?.message || '';
        },
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
  getSubProblem() {
    this.itServiceService.getSubProblem().subscribe({
      next: (res) => {
        // console.log(res);
        this.availableCategories = res.data;
        this.cdr.detectChanges();
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
          this.openForOptions.set(res.data);
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        },
      });
  }

  isVisibleCC = computed(() => {
    const { categories } = this.problemFormData();
    return categories.some((cat) => this.CC_CATEGORIES.includes(cat.sub_category_name));
  });
}
