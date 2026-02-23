import { Component, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';
import { SwalService } from '../../services/swal.service';

@Component({
  selector: 'app-it-repair-request',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './it-repair-request.html',
  styleUrl: './it-repair-request.scss'
})
export class ItRepairRequestComponent {
  private swalService = inject(SwalService);
  private router = inject(Router);

  repairFormData = signal({
    device: '',
    brand: '',
    model: '',
    symptom: '',
    attachments: [] as { name: string, size?: number, file: File }[]
  });

  // Searchable Dropdown Logic
  searchTerm = signal('');
  isDropdownOpen = signal(false);

  deviceCategories = [
    {
      group: 'Computer & Accessories',
      items: ['Laptop / Notebook', 'Desktop PC', 'Monitor', 'Keyboard', 'Mouse', 'Docking Station', 'UPS (เครื่องสำรองไฟ)', 'External Hard Drive']
    },
    {
      group: 'Printing & Office',
      items: ['Printer', 'Photocopier', 'Scanner', 'Shredder (เครื่องทำลายเอกสาร)']
    },
    {
      group: 'Network & Communication',
      items: ['IP Phone', 'Wi-Fi Access Point', 'Router / Switch', 'LAN Cable / Port']
    },
    {
      group: 'Meeting Room & AV',
      items: ['Projector', 'Television', 'Webcam / Conference Cam', 'Microphone', 'Speaker', 'HDMI / DisplayPort Cable']
    },
    {
      group: 'Mobile & Others',
      items: ['Tablet / iPad', 'Smartphone', 'Power Adapter / Charger', 'Headset / Headphone']
    }
  ];

  filteredCategories = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.deviceCategories;

    return this.deviceCategories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.toLowerCase().includes(term))
    })).filter(cat => cat.items.length > 0);
  });

  selectDevice(deviceName: string) {
    this.repairFormData.update(prev => ({ ...prev, device: deviceName }));
    this.searchTerm.set(deviceName);
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
    this.repairFormData.update(prev => ({ ...prev, device: '' }));
    this.searchTerm.set('');
    this.isDropdownOpen.set(false);
  }

  isFormValid = computed(() => {
    const { device, symptom, attachments } = this.repairFormData();
    return device.trim().length > 0 && (symptom.trim().length > 0 || attachments.length > 0);
  });

  showSummaryModal = signal(false);

  submittedRequests = signal<any[]>([
    {
      id: 1,
      displayId: '#REP2602-0001',
      date: new Date('2026-02-19T08:15:00'),
      device: 'Printer',
      brand: 'Brother',
      model: 'HL-L2370DN',
      symptom: 'กระดาษติดบ่อย และหมึกจาง',
      attachments: [{ name: 'printer-error.jpg' }],
      status: 'Pending'
    }
  ]);

  get nextRequestId() {
    const nextId = this.submittedRequests().length + 1;
    return `#REP2602-${String(nextId).padStart(4, '0')}`;
  }

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
      window.open(url, '_blank');
    } else {
      this.swalService.info('แจ้งเตือน', 'ไฟล์นี้เป็นข้อมูลตัวอย่าง ไม่สามารถเปิดดูได้จริง');
    }
  }

  submit() {
    if (!this.isFormValid()) {
      this.swalService.warning('แจ้งเตือน', 'กรุณาระบุอุปกรณ์ และรายละเอียดอาการหรือแนบรูปภาพให้ครบถ้วน');
      return;
    }
    this.showSummaryModal.set(true);
  }

  closePage() {
    this.router.navigate(['/it-service-request']);
  }

  closeSummaryModal() {
    this.showSummaryModal.set(false);
  }

  confirmSubmission() {
    const data = this.repairFormData();
    const newRequest = {
      id: Date.now(),
      displayId: this.nextRequestId,
      date: new Date(),
      ...data,
      status: 'Pending'
    };

    this.submittedRequests.update(reqs => [newRequest, ...reqs]);
    this.swalService.success('สำเร็จ', 'ส่งคำขอแจ้งซ่อมเรียบร้อยแล้ว');
    this.showSummaryModal.set(false);
    this.repairFormData.set({ device: '', brand: '', model: '', symptom: '', attachments: [] });
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
}
