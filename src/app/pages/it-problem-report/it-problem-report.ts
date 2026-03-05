import { Component, signal, inject, OnInit, computed, ChangeDetectorRef, effect, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';
import { UserService, UserProfile } from '../../services/user.service';
import { PhoneUtil } from '../../utils/phone.util';
import { FilePreviewModalComponent, FilePreviewItem } from '../../components/modals/file-preview-modal/file-preview-modal';
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
  imports: [CommonModule, FormsModule, PageHeaderComponent, FilePreviewModalComponent, NzSelectModule],
  templateUrl: './it-problem-report.html',
  styleUrl: './it-problem-report.scss'
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
    attachments: [] as { name: string, size?: number, file: File }[]
  });
  phoneModel = '';

  // MASTER
  availableCategories: any[] = [];
  openForOptions = signal<any[]>([])
  selectedOpenFor = signal<string>(this.authService.userData().CODEMPID);

  // CONDITION
  @Input() openBy!: string;

  ngOnInit() {
    this.getSubProblem();
    this.getOpenFor();
    const userData = this.authService.userData();
    if (userData?.USR_MOBILE) {
      const formatted = PhoneUtil.formatPhoneNumber(userData.USR_MOBILE);
      this.phoneModel = formatted;
      this.problemFormData.update(data => ({ ...data, phoneNumber: formatted }));
    }

  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let digitsOnly = input.value.replace(/\D/g, '');
    digitsOnly = digitsOnly.slice(0, 10);
    const formatted = PhoneUtil.formatPhoneNumber(digitsOnly);
    input.value = formatted;
    this.phoneModel = formatted;
    this.problemFormData.update(data => ({ ...data, phoneNumber: this.phoneModel }));
  }

  onPhoneNumberChange(value: string) {
    const formatted = PhoneUtil.formatPhoneNumber(value);
    this.problemFormData.update(data => ({ ...data, phoneNumber: formatted }));
  }

  isFormValid = computed(() => {
    const { topic, detail, categories, phoneNumber } = this.problemFormData();
    return topic.trim().length > 0 && detail.trim().length > 0 && categories.length > 0 && phoneNumber !== '';
  });

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  toggleCategory(cat: string) {
    const current = this.problemFormData();
    const isSelected = current.categories.includes(cat);

    this.problemFormData.set({
      ...current,
      categories: isSelected ? [] : [cat]
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
    if (files && files.length > 0) {
      const newAttachments = Array.from(files).map(f => ({
        name: f.name,
        size: f.size,
        file: f
      }));

      const currentAttachments = this.problemFormData().attachments;

      this.problemFormData.set({
        ...this.problemFormData(),
        attachments: [...currentAttachments, ...newAttachments]
      });
    }
  }

  viewFile(fileObj: any) {
    if (fileObj.file) {
      const url = URL.createObjectURL(fileObj.file);
      this.previewFiles.set([{
        fileName: fileObj.name,
        date: dayjs().format('DD/MM/YYYY HH:mm'),
        url: url,
        type: fileObj.file.type
      }]);
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
      attachments: currentAttachments
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
      status: 'Pending'
    }
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
    this.problemFormData.update(data => ({ ...data, phoneNumber: this.phoneModel }));
    this.showSummaryModal.set(true);
  }

  clearForm() {
    const original = this.authService.userPhone();
    this.phoneModel = '';
    this.cdr.detectChanges();
    this.phoneModel = original;

    this.problemFormData.set({
      topic: '',
      detail: '',
      phoneNumber: '',
      categories: [],
      attachments: []
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
    formData.append('IsSelfRequestByIT', this.authService.userData().DEPARTMENT === '10806 IT Department' ? 'true' : 'false'); //it เปิดให้ตัวเอง ?
    formData.append('ticketTypeId', '2');

    data.attachments.forEach((item: any) => {
      if (item?.file instanceof File) {
        formData.append('files', item.file);
        // formData.append('fileDescriptions', item.name || '');
      }
    });

    console.log("formData", [...formData.entries()]);

    this.swalService.loading('กำลังบันทึกข้อมูล...');
    this.itServiceService.createTicket(formData)
      .pipe(
        finalize(() => {
          this.closeSummaryModal();
        })
      ).subscribe({
        next: (res) => {
          console.log(res);
          if (res.success) {
            this.signalrService.sendTestRealtime()
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
        }
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
        console.log(res);
        this.availableCategories = res.data
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  getOpenFor() {
    this.itServiceService.getOpenFor({ currentEmpId: this.authService.userData().CODEMPID }).subscribe({
      next: (res) => {
        console.log(res.data);
        this.openForOptions.set(res.data)
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }
}
