import { Component, signal, inject } from '@angular/core';
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
    symptom: ''
  });

  showSummaryModal = signal(false);

  submittedRequests = signal<any[]>([
    {
      id: 2,
      displayId: '#REP2602-0002',
      date: new Date('2026-02-19T08:15:00'),
      device: 'Printer',
      brand: 'Brother',
      model: 'HL-L2370DN',
      symptom: 'กระดาษติดบ่อย และหมึกจาง',
      status: 'Pending'
    }
  ]);

  get nextRequestId() {
    const nextId = this.submittedRequests().length + 1;
    return `#REP2602-${String(nextId).padStart(4, '0')}`;
  }

  submit() {
    const { device, brand, model, symptom } = this.repairFormData();
    if (!device.trim() || !brand.trim() || !model.trim() || !symptom.trim()) {
      this.swalService.warning('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
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
    this.repairFormData.set({ device: '', brand: '', model: '', symptom: '' });
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
