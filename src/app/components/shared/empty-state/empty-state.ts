import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** ส่วนแสดงข้อความและไอคอนเมื่อไม่พบข้อมูล (Empty State) */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyStateComponent {
  @Input() title: string = 'ไม่พบข้อมูล';
  @Input() description: string = 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา';
  @Input() icon: string = 'fas fa-inbox';
  @Input() actionLabel: string = '';
  @Input() actionIcon: string = '';

  @Output() action = new EventEmitter<void>();

  onAction() {
    this.action.emit();
  }
}
