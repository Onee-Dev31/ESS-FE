import { Component, signal, inject, computed, HostListener, ElementRef, ViewChild, OnInit, effect, ChangeDetectorRef, Input } from '@angular/core';
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
import { AuthService } from '../../services/auth.service';
import { ItServiceService } from '../../services/it-service.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-it-repair-request',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, FilePreviewModalComponent],
  templateUrl: './it-repair-request.html',
  styleUrl: './it-repair-request.scss'
})
export class ItRepairRequestComponent implements OnInit {
  private swalService = inject(SwalService);
  private userService = inject(UserService);
  private router = inject(Router);
  private itServiceMock = inject(ItServiceMockService);
  private authService = inject(AuthService);
  private itServiceService = inject(ItServiceService);
  private cdr = inject(ChangeDetectorRef);

  // CONDITION
  @Input() openBy!: string;


  @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.isDropdownOpen() && this.dropdownWrapper && !this.dropdownWrapper.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  repairFormData = signal({
    device: { typeId: '', name: '' },
    category: { categoryId: '', group: '' },
    brand: '',
    model: '',
    symptom: '',
    phoneNumber: '',
    attachments: [] as { name: string, size?: number, file: File }[]
  });

  phoneModel = '';

  // MASTER
  deviceCategories: any[] = [];

  ngOnInit() {
    this.getDeviceCategory();

    const userData = this.authService.userData();
    if (userData?.USR_MOBILE) {
      const formatted = PhoneUtil.formatPhoneNumber(userData.USR_MOBILE);
      this.phoneModel = formatted;
      this.repairFormData.update(data => ({ ...data, phoneNumber: formatted }));
    }
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let digitsOnly = input.value.replace(/\D/g, '');
    digitsOnly = digitsOnly.slice(0, 10);
    const formatted = PhoneUtil.formatPhoneNumber(digitsOnly);
    input.value = formatted;
    this.phoneModel = formatted;
    this.repairFormData.update(data => ({ ...data, phoneNumber: this.phoneModel }));
  }

  onPhoneNumberChange(value: string) {
    const formatted = PhoneUtil.formatPhoneNumber(value);
    this.repairFormData.update(data => ({ ...data, phoneNumber: formatted }));
  }

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  // Searchable Dropdown Logic
  searchTerm = signal('');
  isDropdownOpen = signal(false);

  // deviceCategories = [
  //   {
  //     group: 'Computer & Accessories',
  //     items: ['Laptop / Notebook', 'Desktop PC', 'Monitor', 'Keyboard', 'Mouse', 'Docking Station', 'UPS (เครื่องสำรองไฟ)', 'External Hard Drive']
  //   },
  //   {
  //     group: 'Printing & Office',
  //     items: ['Printer', 'Photocopier', 'Scanner', 'Shredder (เครื่องทำลายเอกสาร)']
  //   },
  //   {
  //     group: 'Network & Communication',
  //     items: ['IP Phone', 'Wi-Fi Access Point', 'Router / Switch', 'LAN Cable / Port']
  //   },
  //   {
  //     group: 'Meeting Room & AV',
  //     items: ['Projector', 'Television', 'Webcam / Conference Cam', 'Microphone', 'Speaker', 'HDMI / DisplayPort Cable']
  //   },
  //   {
  //     group: 'Mobile & Others',
  //     items: ['Tablet / iPad', 'Smartphone', 'Power Adapter / Charger', 'Headset / Headphone']
  //   }
  // ];

  filteredCategories = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.deviceCategories;

    return this.deviceCategories.map(cat => ({
      ...cat,
      items: cat.items.filter((item: any) => item.name.toLowerCase().includes(term))
    })).filter(cat => cat.items.length > 0);
  });

  selectDevice(device: any, category: any) {
    console.log(category)
    this.repairFormData.update(prev => ({
      ...prev, device: device, category: {
        categoryId: category.categoryId, group: category.group
      }
    }));
    this.searchTerm.set(device.name);
    this.isDropdownOpen.set(false);
  }

  onDeviceInput(event: any) {
    const value = event.target.value;
    this.searchTerm.set(value);
    this.repairFormData.update(prev => ({ ...prev, device: value }));
    this.isDropdownOpen.set(true);
  }

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  clearDevice(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.repairFormData.update(prev => ({ ...prev, device: { typeId: '', name: '' } }));
    this.searchTerm.set('');
    this.isDropdownOpen.set(false);
  }

  isFormValid = computed(() => {
    const { device, symptom, attachments, phoneNumber } = this.repairFormData();
    return (device.typeId !== '' && device.name !== '') && (symptom.trim().length > 0 || attachments.length > 0) && phoneNumber != '';
  });

  showSummaryModal = signal(false);

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const newAttachments = Array.from(files).map(f => ({
        name: f.name,
        size: f.size,
        file: f
      }));
      const currentAttachments = this.repairFormData().attachments;
      this.repairFormData.set({
        ...this.repairFormData(),
        attachments: [...currentAttachments, ...newAttachments]
      });
    }
  }

  removeAttachment(index: number) {
    const currentAttachments = [...this.repairFormData().attachments];
    currentAttachments.splice(index, 1);
    this.repairFormData.set({
      ...this.repairFormData(),
      attachments: currentAttachments
    });
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
      this.swalService.info('แจ้งเตือน', 'ไฟล์นี้เป็นข้อมูลตัวอย่าง ไม่สามารถเปิดดูได้จริง');
    }
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  submit() {
    if (!this.isFormValid()) {
      this.swalService.warning('แจ้งเตือน', 'กรุณาระบุอุปกรณ์ และรายละเอียดอาการหรือแนบรูปภาพให้ครบถ้วน');
      return;
    }

    this.repairFormData.update(data => ({ ...data, phoneNumber: this.phoneModel }));

    this.showSummaryModal.set(true);
  }

  clearForm() {
    const original = this.authService.userPhone();
    this.phoneModel = '';
    this.cdr.detectChanges();
    this.phoneModel = original;

    this.repairFormData.set({
      device: { typeId: '', name: '' },
      category: { categoryId: '', group: '' },
      brand: '',
      model: '',
      symptom: '',
      phoneNumber: '',
      attachments: []
    });
    this.searchTerm.set('');
    this.isDropdownOpen.set(false);
  }

  closePage() {
    this.router.navigate(['/it-service-request']);
  }

  closeSummaryModal() {
    this.showSummaryModal.set(false);
  }

  confirmSubmission() {
    const data = this.repairFormData();

    console.log(data)

    const formData = new FormData();

    formData.append('deviceTypeId', data.device.typeId);
    formData.append('deviceCategoryId', data.category.categoryId);
    formData.append('brand', data.brand);
    formData.append('model', data.model);
    formData.append('symptom', data.symptom);
    formData.append('contactPhone', data.phoneNumber);
    formData.append('requesterAduser', this.authService.currentUser() || '-');
    formData.append('ticketTypeId', '1');

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
            this.swalService.success('ส่งคำขอแจ้งซ่อมเรียบร้อยแล้ว', res.ticketNumber).then(() => {
              this.clearForm();
              this.router.navigate(['/it-service-list']);
            });
          }
        },
        error: (error) => {
          console.error('Error fetching data:', error.error.message);
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
  getDeviceCategory() {
    this.itServiceService.getDeviceCategory().subscribe({
      next: (res) => {
        // console.log(res);
        this.deviceCategories = res.data
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }
}
