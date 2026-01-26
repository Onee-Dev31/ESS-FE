import { Component, Input, Output, EventEmitter, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicalexpensesService, MedicalRequest } from '../../../services/medicalexpenses.service';

@Component({
  selector: 'app-medicalexpenses-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medicalexpenses-form.html',
  styleUrl: './medicalexpenses-form.scss',
})
export class MedicalexpensesForm implements OnInit {
  private medicalService = inject(MedicalexpensesService);

  @Input() requestId: string = '';
  @Output() onClose = new EventEmitter<void>();

  currentDate = signal<string>('');
  isEditMode = signal<boolean>(false);

  claimTypes = [
    { id: 'opd', label: 'ผู้ป่วยนอก (OPD)', amount: '10,500', icon: 'fas fa-stethoscope', color: '#ff6b6b' },
    { id: 'dental', label: 'ทันตกรรม', amount: '584', icon: 'fas fa-book-medical', color: '#4d96ff' },
    { id: 'vision', label: 'สายตา', amount: '876', icon: 'fas fa-glasses', color: '#6bc1ff' },
    { id: 'ipd', label: 'ผู้ป่วยใน', amount: '3,500', icon: 'fas fa-user-md', color: '#6bcb77' },
  ];

  selectedClaimType = signal<string>('opd');

  hospital: string = '';
  disease: string = '';
  startDate: string = '';
  endDate: string = '';
  amount: number = 0;

  attachments = signal<any[]>([
    { id: 1, name: 'approval-list-page.005-87d92c90a8cb2e588a7032052d9d94ac.png', description: 'ใบเสร็จยา' },
    { id: 2, name: 'original-aa87c620661b3eb94e5d85441b761387.png', description: 'ใบรับรองแพทย์' }
  ]);

  ngOnInit() {
    if (this.requestId) {
      this.medicalService.getRequestById(this.requestId).subscribe(req => {
        if (req) {
          // Edit Mode: Populate existing data
          this.isEditMode.set(true);
          this.currentDate.set(this.formatDateToThaiMonth(req.createDate));

          if (req.items && req.items.length > 0) {
            const item = req.items[0];
            this.hospital = item.hospital;
            this.disease = item.diseaseType;

            // Map types from Service label back to UI id
            const typeMatch = this.claimTypes.find(t => t.label === item.limitType);
            if (typeMatch) {
              this.selectedClaimType.set(typeMatch.id);
            }

            // Convert DD/MM/YYYY to YYYY-MM-DD for date inputs
            const fromParts = item.treatmentDateFrom.split('/');
            if (fromParts.length === 3) {
              // assume BE year in data, convert to AD for input if necessary? 
              // Actually the service uses formatted strings. Let's keep it simple.
              // If it's 23/01/2568 -> we need 2025-01-23 for input type="date"
              const yearAD = parseInt(fromParts[2]) - 543;
              this.startDate = `${yearAD}-${fromParts[1]}-${fromParts[0]}`;

              const toParts = item.treatmentDateTo.split('/');
              const toYearAD = parseInt(toParts[2]) - 543;
              this.endDate = `${toYearAD}-${toParts[1]}-${toParts[0]}`;
            }

            this.amount = item.requestedAmount;
          }
        } else {
          // Create Mode with generated ID
          this.isEditMode.set(false);
          this.currentDate.set(this.formatDateToThaiMonth(new Date().toISOString()));
          this.resetDates();
        }
      });
    } else {
      this.currentDate.set(this.formatDateToThaiMonth(new Date().toISOString()));
      this.resetDates();
    }
  }

  private resetDates() {
    this.startDate = new Date().toISOString().split('T')[0];
    this.endDate = new Date().toISOString().split('T')[0];
  }

  private formatDateToThaiMonth(dateStr: string): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  selectClaimType(id: string) {
    this.selectedClaimType.set(id);
  }

  deleteAttachment(id: number) {
    this.attachments.update(current => current.filter(a => a.id !== id));
  }

  triggerFileInput(input: HTMLInputElement) {
    input.click();
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const newId = this.attachments().length > 0 ? Math.max(...this.attachments().map(a => (a as any).id)) + 1 : 1;
        this.attachments.update(current => [...current, {
          id: newId,
          name: file.name,
          description: ''
        }]);
      }
    }
    event.target.value = '';
  }

  close() {
    this.onClose.emit();
  }

  save() {
    if (!this.hospital || !this.disease || this.amount <= 0) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const typeLabel = this.claimTypes.find(t => t.id === this.selectedClaimType())?.label || '';

    // Format dates back to DD/MM/YYYY (BE)
    const formatDateToBE = (iso: string) => {
      const parts = iso.split('-');
      return `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
    };

    const request: MedicalRequest = {
      id: this.requestId,
      createDate: this.isEditMode() ? new Date().toISOString() : new Date().toISOString(), // In real app use existing createDate
      status: this.isEditMode() ? 'ตรวจสอบแล้ว' : 'รออนุมัติ',
      employeeId: 'EMP001',
      totalRequestedAmount: this.amount,
      totalApprovedAmount: 0,
      items: [{
        requestDate: formatDateToBE(new Date().toISOString().split('T')[0]),
        limitType: typeLabel,
        diseaseType: this.disease,
        hospital: this.hospital,
        treatmentDateFrom: formatDateToBE(this.startDate),
        treatmentDateTo: formatDateToBE(this.endDate),
        requestedAmount: this.amount,
        approvedAmount: 0
      }]
    };

    if (this.isEditMode()) {
      this.medicalService.updateRequest(request).subscribe(() => this.close());
    } else {
      this.medicalService.addRequest(request).subscribe(() => this.close());
    }
  }
}
