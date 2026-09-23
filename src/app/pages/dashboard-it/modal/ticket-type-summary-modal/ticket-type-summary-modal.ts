import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalShellComponent } from '../../../../components/shared/modal-shell/modal-shell';

@Component({
  selector: 'app-ticket-type-summary-modal',
  standalone: true,
  imports: [CommonModule, ModalShellComponent],
  templateUrl: './ticket-type-summary-modal.html',
  styleUrl: './ticket-type-summary-modal.scss',
})
export class TicketTypeSummaryModal {
  @Input({ required: true }) ticket!: any;
  @Output() closeModal = new EventEmitter<void>();

  get ticketTypeId(): number {
    return Number(this.ticket?.ticketTypeId ?? this.ticket?.ticket_type_id);
  }

  get problemCategory(): string {
    return this.ticket?.ticketCategory ?? this.ticket?.sub_category_name ?? '-';
  }

  get problemSource(): string {
    return this.ticket?.problemBy ?? '-';
  }

  get repairCostLabel(): string {
    const repairCostType = String(
      this.ticket?.repair_cost_type ?? this.ticket?.repairCostType ?? '',
    )
      .trim()
      .toLowerCase();
    if (repairCostType === 'paid') return 'แบบมีค่าใช้จ่าย';
    if (repairCostType === 'free') return 'แบบไม่มีค่าใช้จ่าย';
    return '-';
  }

  get basicServices(): any[] {
    return this.services.filter((service: any) => this.isBasicService(service));
  }

  get specificServices(): any[] {
    // รายการที่ไม่ใช่กลุ่มพื้นฐานให้แสดงในระบบเฉพาะ เพื่อไม่ให้ข้อมูลจาก API ตกหล่น
    return this.services.filter((service: any) => !this.isBasicService(service));
  }

  private get services(): any[] {
    return Array.isArray(this.ticket?.services) ? this.ticket.services : [];
  }

  private isBasicService(service: any): boolean {
    const group = String(
      service?.group_type ?? service?.groupType ?? service?.service_group ?? '',
    )
      .trim()
      .toLowerCase();

    return !group || ['main', 'user', 'basic'].includes(group);
  }

  serviceName(service: any): string {
    return service?.service_name_th ?? service?.label ?? service?.service_name ?? '-';
  }
}
