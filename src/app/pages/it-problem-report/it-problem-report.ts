import { Component, signal, inject, OnInit, computed, ChangeDetectorRef } from '@angular/core';
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

@Component({
  selector: 'app-it-problem-report',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, FilePreviewModalComponent],
  templateUrl: './it-problem-report.html',
  styleUrl: './it-problem-report.scss'
})
export class ItProblemReportComponent implements OnInit {
  private swalService = inject(SwalService);
  private userService = inject(UserService);
  private router = inject(Router);
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

  // MASTER
  availableCategories: any[] = [];

  ngOnInit() {
    this.getSubProblem();




    // * คนที่มีเบอร์ให้เอาลงมาใส่ตรงนี้เลย *
    // this.userService.getUserProfile().subscribe((profile: UserProfile) => {
    //   if (profile?.phone) {
    //     const formatted = PhoneUtil.formatPhoneNumber(profile.phone);
    //     this.problemFormData.update(data => ({ ...data, phoneNumber: formatted }));
    //   }
    // });
  }

  onPhoneNumberChange(value: string) {
    const formatted = PhoneUtil.formatPhoneNumber(value);
    this.problemFormData.update(data => ({ ...data, phoneNumber: formatted }));
  }

  isFormValid = computed(() => {
    const { topic, detail, categories, phoneNumber } = this.problemFormData();
    return topic.trim().length > 0 && detail.trim().length > 0 && categories.length > 0 && phoneNumber.trim().length > 0;
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
  // onFileSelected(event: any) {
  //   const files: FileList = event.target.files;
  //   if (files && files.length > 0) {
  //     const newAttachments = Array.from(files).map(f => ({
  //       name: f.name,
  //       size: f.size,
  //       file: f
  //     }));
  //     const currentAttachments = this.problemFormData().attachments;
  //     this.problemFormData.set({
  //       ...this.problemFormData(),
  //       attachments: [...currentAttachments, ...newAttachments]
  //     });
  //   }
  // }

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
    this.showSummaryModal.set(true);
  }

  clearForm() {
    this.problemFormData.set({
      topic: '',
      detail: '',
      phoneNumber: '', // *
      categories: [],
      attachments: []
    });
    // * Re-fetch phone number from profile if available
    // this.ngOnInit();
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
    formData.append('subCategoryId', data.categories[0].category_id);
    formData.append('contactPhone', data.phoneNumber);
    formData.append('ticketTypeId', '1');

    data.attachments.forEach((item: any) => {
      if (item?.file instanceof File) {
        formData.append('files', item.file);
        // formData.append('fileDescriptions', item.name || '');
      }
    });

    console.log([...formData.entries()]);

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
            this.swalService.success('แจ้งปัญหาสำเร็จ', res.ticketNumber).then(() => {
              this.clearForm();
              this.router.navigate(['/it-service-list']);
            });
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error.error.message);
          // const message = error?.error?.message || '';
        },
        complete: () => {
          console.log("COMPLETE");
        }
      });

    // this.submittedRequests.update(reqs => [newRequest, ...reqs]);

    // // Mock shared state
    // this.itServiceMock.addTicket({
    //   subject: data.topic,
    //   ticketType: 'แจ้งปัญหา',
    //   description: data.detail,
    //   status: 'Assigned Tickets',
    //   requesterName: 'พนักงาน (Self)',
    //   attachments: data.attachments.map(a => ({
    //     fileName: a.name,
    //     filePath: URL.createObjectURL(a.file),
    //     fileType: a.file.type,
    //     fileSize: a.file.size || 0
    //   }))
    // });

    // this.swalService.success('สำเร็จ', 'ส่งคำขอแจ้งปัญหาเรียบร้อยแล้ว');
    // this.showSummaryModal.set(false);

    // // Redirect to list page
    // this.router.navigate(['/it-service-list']);

    // this.problemFormData.set({ topic: '', detail: '', phoneNumber: '', categories: [], attachments: [] });
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
        this.availableCategories = res.data
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }
}
