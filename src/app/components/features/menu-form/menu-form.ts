import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { MatIconModule  } from "@angular/material/icon";
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-menu-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTooltipModule,
    MatIconModule ,
    NzSelectModule
  ],
  templateUrl: './menu-form.html',
  styleUrl: './menu-form.scss',
})
export class MenuForm implements OnChanges {
  @Input() isOpen = false;
  @Input() menusParent: any = null;
  @Input() ORDER_NO: any = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();

  formData: any = {
    menuKey: '',
    label: '',
    icon: '',
    routePath: '',
    parentMenuID: 0,
    orderNo: 0,
    isVisible: 1,
    isEnabled: 1,
    remark: '',
    createdBy: ''
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.formData.orderNo = this.ORDER_NO + 1
    }
  }

  handleClose() {
    this.onClose.emit();
  }

  handleSubmit() {
    this.onSubmit.emit(this.formData);
  }

}
