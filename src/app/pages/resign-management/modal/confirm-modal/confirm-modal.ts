import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import dayjs from 'dayjs';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

@Component({
  selector: 'app-confirm-modal',
  imports: [
    CommonModule,
    FormsModule,
    NzDatePickerModule
  ],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.scss',
})
export class ConfirmModal implements OnChanges {
  @Input() data: any[] = [];
  @Output() submitModal = new EventEmitter<any>();
  @Output() closeModal = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && changes['data'].currentValue) {
      // this.loading = true;
      console.log('data', changes['data'].currentValue);
    }
  }

  close() {
    this.closeModal.emit();
  }

  remove(empCode: string) {

    this.data = this.data.filter(emp => emp.empCode !== empCode);

  }

  submit() {

    const result = this.data
      .filter(emp => emp.lastDate && emp.effectiveDate);

    this.submitModal.emit(result);

  }

  disableLastDate(emp: any) {
    return (current: Date): boolean => {

      if (!emp?.effectiveDate || !current) return false;

      return dayjs(current).isAfter(dayjs(emp.effectiveDate), 'day');
    };
  }

  disableEffectiveDate(emp: any) {
    return (current: Date): boolean => {

      if (!emp?.lastDate || !current) return false;

      return dayjs(current).isBefore(dayjs(emp.lastDate), 'day');
    };
  }
}
