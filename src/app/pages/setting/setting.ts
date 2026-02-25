import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { PageHeaderComponent } from "../../components/shared/page-header/page-header";
import { MatIconModule } from '@angular/material/icon';
import { LoadingService } from '../../services/loading';
import { SettingService } from '../../services/setting.service';
import { SwalService } from '../../services/swal.service';
import { MasterDataService } from '../../services/master-data.service';
import { MenuForm } from "../../components/features/menu-form/menu-form";
import { AuthService } from '../../services/auth.service';
import { MenuAllForm } from "../../components/features/menu-all-form/menu-all-form";
import { NzModalModule } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzCheckboxModule,
    NzButtonModule,
    PageHeaderComponent,
    MatIconModule,
    MenuForm,
    MenuAllForm,
    NzModalModule
  ],
  templateUrl: './setting.html',
  styleUrl: './setting.scss',
})
export class Setting implements OnInit {

  private loadingService = inject(LoadingService);
  private settingService = inject(SettingService);
  private swalService = inject(SwalService);
  private masterService = inject(MasterDataService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('Header') header!: ElementRef;

  menus: any[] = [];
  menusParent: any[] = [];
  rolePermissions: any[] = [];

  selectedMenu: any = null;
  selectedMenuPermissions: any[] = [];
  originalPermissions: any[] = [];

  ORDER_NO: number = 0;

  rolePermissionMap = new Map<number, any[]>();

  isFormOpen = signal<boolean>(false);
  isFormMenuAllOpen = signal<boolean>(false);
  isViewSummaryOpen = signal<boolean>(false);

  IS_EDIT_MODE = false;

  ngOnInit() {
    this.getMenu()
  }

  handleMenuSubmit(data: any) {
    const payload = {
      menuKey: data.menuKey,
      label: data.label,
      icon: data.icon,
      routePath: data.routePath,
      parentMenuID: data.parentMenuID === 0 ? null : data.parentMenuID,
      orderNo: data.orderNo,
      isVisible: data.isVisible === 0 ? false : true,
      isEnabled: data.isEnabled === 0 ? false : true,
      remark: '',
      createdBy: this.authService.currentUser()?.toLocaleLowerCase()
    }

    console.log(payload)

    this.settingService.createMenu(payload).subscribe({
      next: (res) => {
        // console.log(res)
        this.closeForm();
        this.getMenu();
      }
    });
  }

  enableEdit() {
    this.IS_EDIT_MODE = true;
  }

  handleSave() {
    this.swalService.confirm('ยืนยันการบันทึกสิทธิ์')
      .then(result => {
        if (!result.isConfirmed) return;
        this.swalService.loading('กำลังบันทึกข้อมูล...');

        const newData = this.selectedMenuPermissions

        const rolePermissionsMap = this.selectedMenuPermissions.map(item => ({
          RoleID: item.RoleID,
          Permissions: {
            View: item.CanView,
            canCreate: item.CanCreate,
            canUpdate: item.CanUpdate,
            canDelete: item.CanDelete,
            canApprove: item.CanApprove
          }
        }));

        const payload = {
          menuID: newData[0].MenuID,
          rolePermissions: rolePermissionsMap
        }

        console.log('payload:', payload);

        this.settingService.updateMenuRolePermission(payload).subscribe({
          next: (res) => {
            // console.log(res)

            if (res?.success) {
              this.swalService.success(res.message)
            }
            this.getMenu();
          }
        });
        this.IS_EDIT_MODE = false;
      });


  }

  handleCancel() {
    // revert กลับค่าเดิม
    this.selectedMenuPermissions = JSON.parse(
      JSON.stringify(this.originalPermissions)
    );

    this.IS_EDIT_MODE = false;
  }

  handleAllMenuSubmit(data: any) {
    this.swalService.confirm('ยืนยันการบันทึกสิทธิ์')
      .then(result => {
        if (!result.isConfirmed) return;
        this.swalService.loading('กำลังบันทึกข้อมูล...');

        const payload = {
          menus: data.map((menu: any) => ({
            ...menu,
            modifiedBy: this.authService.currentUser()
          }))
        }

        console.log("payload > ", payload)

        this.settingService.updateMenu(payload).subscribe({
          next: (res) => {
            console.log(res)

            if (res?.success) {
              this.swalService.success(res.message)
            }
            this.getMenu();
            this.closeAllMenuForm();
          }
        });
      });

  }

  //FUNCTION
  private buildPermissionMap() {
    this.rolePermissionMap.clear();

    this.rolePermissions.forEach(p => {
      if (!this.rolePermissionMap.has(p.MenuID)) {
        this.rolePermissionMap.set(p.MenuID, []);
      }

      this.rolePermissionMap.get(p.MenuID)!.push(p);
    });
  }

  buildMenuTree(data: any[]) {
    const map = new Map<number, any>();

    data
      // .filter(m => m.IsVisible)
      .sort((a, b) => a.OrderNo - b.OrderNo)
      .forEach(m => {
        const iconType = this.getIconType(m.Icon);

        map.set(m.MenuID, {
          ...m,
          iconType,
          children: []
        });
      });

    const tree: any[] = [];

    map.forEach(menu => {
      if (menu.ParentMenuID) {
        map.get(menu.ParentMenuID)?.children.push(menu);
      } else {
        tree.push(menu);
      }
    });

    return tree;
  }

  getIconType(icon: string | null): 'fa' | 'material' | 'none' {
    if (!icon) return 'none';

    if (icon.includes('fa')) return 'fa';

    return 'material';
  }

  // เลือกเมนู
  selectMenu(menu: any) {
    // console.log(this.menus, this.rolePermissionMap)
    if (!menu.IsEnabled) return;

    this.selectedMenu = menu;

    const perms =
      (this.rolePermissionMap.get(menu.MenuID) || [])
        .sort((a, b) => a.RoleID - b.RoleID);

    // clone สำหรับแก้ไข
    this.selectedMenuPermissions = JSON.parse(JSON.stringify(perms));

    // เก็บ original ไว้
    this.originalPermissions = JSON.parse(JSON.stringify(perms));

    setTimeout(() => {
      this.header?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });


    this.IS_EDIT_MODE = false;
  }

  // เพิ่มเมนู
  handleAddMenu() {
    this.isFormOpen.set(true);
  }
  closeForm() {
    this.isFormOpen.set(false);
  }

  // แก้ไขเมนู
  handleEditMenu() {
    this.isFormMenuAllOpen.set(true);
  }
  closeAllMenuForm() {
    this.isFormMenuAllOpen.set(false);
  }

  //Summary
  handleSummaryMenu() {
    this.isViewSummaryOpen.set(true);
  }
  closeSummaryMenu() {
    this.isViewSummaryOpen.set(false);
  }

  // SUMMARY
  summaryRoles: string[] = [];
  summaryTable: any[] = [];
  summaryMenu() {
    // 1. ดึง Role ไม่ซ้ำ
    this.summaryRoles = this.rolePermissions
      .sort((a, b) => a.RoleId - b.RoleId)   // sort ตาม RoleId ก่อน
      .map(r => r.RoleName)                  // ค่อย map เป็นชื่อ
      .filter((value, index, self) => self.indexOf(value) === index); // unique

    // console.log("summaryRoles >>> ", this.summaryRoles)

    // 2. group permission ตาม MenuID
    const permissionMap = this.rolePermissions.reduce((acc: any, item: any) => {
      if (!acc[item.MenuID]) {
        acc[item.MenuID] = {};
      }

      acc[item.MenuID][item.RoleName] = {
        C: item.CanCreate,
        R: item.CanView,
        U: item.CanUpdate,
        D: item.CanDelete,
        A: item.CanApprove
      };

      return acc;
    }, {});

    // console.log("permissionMap >>> ", permissionMap)

    // 3. flatten เมนู (เอาทั้ง parent + child)
    const flattenMenus = (menus: any[], level: number = 0): any[] => {
      return menus.flatMap(m => [
        { ...m, level },
        ...(m.children?.length
          ? flattenMenus(m.children, level + 1)
          : [])
      ]);
    };

    const allMenus = flattenMenus(this.menus);

    // console.log("allMenus >>> ", allMenus)

    // 4. สร้าง table
    this.summaryTable = allMenus.map(menu => ({
      label: menu.Label,
      level: menu.level,
      permissions: permissionMap[menu.MenuID] || {}
    }));

    console.log("summaryTable >>> ", this.summaryTable)
    this.isViewSummaryOpen.set(true);
  }



  formatPermission(p: any): string {
    if (!p) return '-';

    let result = '';
    if (p.C) result += 'C';
    if (p.R) result += 'R';
    if (p.U) result += 'U';
    if (p.D) result += 'D';
    if (p.A) result += 'A';

    return result || '-';
  }

  //GET MASTER
  getMenu() {
    this.settingService.getMenu().subscribe({
      next: (res) => {
        console.log(res.data);

        const rawMenus = res.data.menus;

        this.menusParent = rawMenus
          .filter((m: any) => m.ParentMenuID == null);

        this.ORDER_NO = rawMenus.length
          ? Math.max(...rawMenus.map((m: any) => m.OrderNo || 0))
          : 0;

        this.menus = this.buildMenuTree(rawMenus);

        this.rolePermissions = res.data.rolePermissions;
        this.buildPermissionMap();

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

}