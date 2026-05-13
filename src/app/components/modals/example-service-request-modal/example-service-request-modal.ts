import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-example-service-request-modal',
  imports: [],
  templateUrl: './example-service-request-modal.html',
  styleUrl: './example-service-request-modal.scss',
})
export class ExampleServiceRequestModal {
  @Input() type: 1 | 2 = 1;
  @Output() onClose = new EventEmitter<void>();

  close() {
    this.onClose.emit();
  }

  copied: Record<number, boolean> = {};

  copyAll(type: number) {
    const texts: Record<number, string> = {
      1: `รหัสพนักงาน : ONE000001
ชื่อ (EN) : Mr. Onee Sandee
ชื่อ (TH) : นายวันอี แสนดี
เมนู : ใบเสนอราคา, บันทึกค่าใช้จ่าย
ตำแหน่ง : Admin
บริษัท : ONEE`,
      2: `เมนู : ใบเสนอราคา, บันทึกค่าใช้จ่าย
ตำแหน่ง : Admin
บริษัท : ONEE`,
    };

    navigator.clipboard.writeText(texts[type] ?? '');
    this.copied[type] = true;
    setTimeout(() => (this.copied[type] = false), 2000);
  }
}
