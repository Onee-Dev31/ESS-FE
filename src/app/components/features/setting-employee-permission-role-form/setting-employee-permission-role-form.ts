import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { MasterDataService } from '../../../services/master-data.service';
import { SettingService } from '../../../services/setting.service';

@Component({
  selector: 'app-setting-employee-permission-role-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTooltipModule,
    MatIconModule,
    NzSelectModule,
    DragDropModule,
    NzInputModule,
    NzSwitchModule,
  ],
  templateUrl: './setting-employee-permission-role-form.html',
  styleUrl: './setting-employee-permission-role-form.scss',
})
export class SettingEmployeePermissionRoleForm implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() selected: any;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<any>();

  private masterService = inject(MasterDataService);

  //MASTER
  roleList: any[] = [];

  emp: any;
  permissionRoleByEmployee: any[] = [];
  originalPermissionRoleByEmployee: any[] = [];

  ngOnInit() {
    this.getRoleMaster();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      // console.log('Modal opened');
      // console.log('selected', this.selected);

      this.emp = this.selected.emp;
      const userRoleIds = new Set(this.selected.roles.map((r: any) => r.RoleID));

      this.permissionRoleByEmployee = this.roleList
        .sort((a, b) => a.RoleID - b.RoleID)
        .map((role) => ({
          ...role,
          checked: userRoleIds.has(role.RoleID),
        }));
    }
  }

  handleClose() {
    // console.log("-- handleClose --")
    this.onClose.emit();
  }

  handleSubmit() {
    // console.log("-- handleSubmit --")
    const batchRoles = this.permissionRoleByEmployee
      .filter((r) => r.checked)
      .map((r) => ({
        RoleID: r.RoleID,
        IsActive: r.checked ? 1 : 0,
      }));

    // console.log(batchRoles)
    this.onSubmit.emit(batchRoles);
  }

  // FUNCTION

  // MASTER
  getRoleMaster() {
    this.masterService.getRoleMaster().subscribe({
      next: (res) => {
        // console.log(res);
        this.roleList = res.data;
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
    });
  }
}
