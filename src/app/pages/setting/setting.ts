import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { PageHeaderComponent } from "../../components/shared/page-header/page-header";
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule, NzTableModule, NzCheckboxModule, NzButtonModule, PageHeaderComponent, MatIconModule],
  templateUrl: './setting.html',
  styleUrl: './setting.scss',
})
export class Setting {

  isEditMode = false;

  // 🔹 Roles (แนวนอน)
  roles = [
    { id: 1, key: 'employee', name: 'Employee' },
    { id: 2, key: 'approver', name: 'Approver' },
    { id: 3, key: 'hr', name: 'HR' },
    { id: 4, key: 'it-staff', name: 'IT Staff' },
    { id: 5, key: 'department-admin', name: 'Department Admin' },
    { id: 6, key: 'it-director', name: 'IT Director' },
    { id: 7, key: 'system-admin', name: 'System Admin' }
  ];

  // 🔹 Menu (แนวตั้ง)
  menus = [
    { id: 1, name: 'Home', level: 0 },
    { id: 2, name: 'สวัสดิการ', level: 0 },
    { id: 3, name: 'การลา', level: 0 },
    { id: 4, name: 'อนุมัติ', level: 0 },
    { id: 5, name: 'IT Service', level: 0 },
    { id: 6, name: 'ตรวจสอบ', level: 0 },
    { id: 7, name: 'จัดการพนักงาน', level: 0 },

    { id: 8, name: 'Dashboard', level: 1 },
    { id: 56, name: 'IT Dashboard', level: 1 },
    { id: 9, name: 'Welcome', level: 1 },
    { id: 10, name: 'ค่ารักษาพยาบาล', level: 1 },
  ];

  // 🔹 Permissions (จากตารางที่ให้มา)
  permissions: { roleId: number; menuId: number }[] = [

    // Home (1)
    { roleId: 1, menuId: 1 },
    { roleId: 2, menuId: 1 },
    { roleId: 3, menuId: 1 },
    { roleId: 4, menuId: 1 },
    { roleId: 5, menuId: 1 },
    { roleId: 6, menuId: 1 },
    { roleId: 7, menuId: 1 },

    // สวัสดิการ (2)
    { roleId: 1, menuId: 2 },
    { roleId: 2, menuId: 2 },
    { roleId: 3, menuId: 2 },
    { roleId: 4, menuId: 2 },
    { roleId: 5, menuId: 2 },
    { roleId: 6, menuId: 2 },
    { roleId: 7, menuId: 2 },

    // การลา (3)
    { roleId: 1, menuId: 3 },
    { roleId: 2, menuId: 3 },
    { roleId: 3, menuId: 3 },
    { roleId: 4, menuId: 3 },
    { roleId: 5, menuId: 3 },
    { roleId: 6, menuId: 3 },
    { roleId: 7, menuId: 3 },

    // อนุมัติ (4)
    { roleId: 2, menuId: 4 },
    { roleId: 3, menuId: 4 },
    { roleId: 6, menuId: 4 },

    // IT Service (5)
    { roleId: 1, menuId: 5 },
    { roleId: 2, menuId: 5 },
    { roleId: 3, menuId: 5 },
    { roleId: 4, menuId: 5 },
    { roleId: 5, menuId: 5 },
    { roleId: 6, menuId: 5 },
    { roleId: 7, menuId: 5 },

    // ตรวจสอบ (6)
    { roleId: 5, menuId: 6 },

    // จัดการพนักงาน (7)
    { roleId: 3, menuId: 7 },
    { roleId: 6, menuId: 7 },

    // Dashboard (8)
    { roleId: 1, menuId: 8 },
    { roleId: 2, menuId: 8 },
    { roleId: 3, menuId: 8 },
    { roleId: 4, menuId: 8 },
    { roleId: 5, menuId: 8 },
    { roleId: 6, menuId: 8 },
    { roleId: 7, menuId: 8 },

    // IT Dashboard (56)
    { roleId: 4, menuId: 56 },
    { roleId: 6, menuId: 56 },
    { roleId: 7, menuId: 56 },

    // Welcome (9)
    { roleId: 1, menuId: 9 },
    { roleId: 2, menuId: 9 },
    { roleId: 3, menuId: 9 },
    { roleId: 4, menuId: 9 },
    { roleId: 5, menuId: 9 },
    { roleId: 6, menuId: 9 },
    { roleId: 7, menuId: 9 },

    // ค่ารักษาพยาบาล (10)
    { roleId: 1, menuId: 10 },
    { roleId: 2, menuId: 10 },
    { roleId: 3, menuId: 10 },
    { roleId: 4, menuId: 10 },
    { roleId: 5, menuId: 10 },
    { roleId: 6, menuId: 10 },
    { roleId: 7, menuId: 10 },
  ];

  hasPermission(roleId: number, menuId: number): boolean {
    return this.permissions.some(
      p => p.roleId === roleId && p.menuId === menuId
    );
  }

  togglePermission(roleId: number, menuId: number, event: any) {
    if (event.target.checked) {
      this.permissions.push({ roleId, menuId });
    } else {
      this.permissions = this.permissions.filter(
        p => !(p.roleId === roleId && p.menuId === menuId)
      );
    }
  }

  toggleAllForRole(roleId: number, event: any) {
    const isChecked = event.target.checked;

    if (isChecked) {
      // เพิ่มทุก menu ที่ยังไม่มี
      this.menus.forEach(menu => {
        const exists = this.permissions.some(
          p => p.roleId === roleId && p.menuId === menu.id
        );

        if (!exists) {
          this.permissions.push({ roleId, menuId: menu.id });
        }
      });
    } else {
      // ลบ permission ของ role นี้ทั้งหมด
      this.permissions = this.permissions.filter(
        p => p.roleId !== roleId
      );
    }
  }

  isAllChecked(roleId: number): boolean {
    return this.menus.every(menu =>
      this.permissions.some(
        p => p.roleId === roleId && p.menuId === menu.id
      )
    );
  }

  enableEdit() {
    this.isEditMode = true;
  }

  cancelEdit() {
    this.isEditMode = false;
  }

  savePermission() {
    // TODO: call API here
    console.log(this.permissions);
    this.isEditMode = false;
  }
}