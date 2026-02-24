import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-menu-all-form',
  imports: [
    CommonModule,
    FormsModule,
    NzTooltipModule,
    MatIconModule,
    NzSelectModule
  ],
  templateUrl: './menu-all-form.html',
  styleUrl: './menu-all-form.scss',
})
export class MenuAllForm {
  @Input() isOpen = false;
  @Input() menus: any = null;
  @Input() rolePermissions: any = null;
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
      console.log('Modal opened');
      console.log('menus', this.menus);
      console.log('rolePermissions', this.rolePermissions);

    }
  }

  handleClose() {
    this.onClose.emit();
  }

  handleSubmit() {
    console.log(this.formData)
    this.onSubmit.emit(this.formData);
  }

}
