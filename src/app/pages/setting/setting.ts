import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
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

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTableModule, NzCheckboxModule, NzButtonModule, PageHeaderComponent, MatIconModule, MenuForm],
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

  menus: any[] = [];
  rolePermissions: any[] = [];
  selectedMenu: any = null;
  selectedMenuPermissions: any[] = [];
  menusParent: any[] = [];

  ORDER_NO: number = 0;

  rolePermissionMap = new Map<number, any[]>();

  isFormOpen = signal<boolean>(false);

  ngOnInit() {
    this.getMenu()
  }

  handleMenuSubmit(data: any) {
    console.log('Received from child:', data);

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

    // ตัวอย่างเรียก API
    this.settingService.createMenu(payload).subscribe({
      next: (res) => {
        console.log(res)
        this.closeForm();
        this.getMenu();
      }
    });
  }
  //FUNCTION
  private buildPermissionMap() {
    this.rolePermissionMap.clear(); // ล้างก่อนกันข้อมูลซ้ำ

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

  selectMenu(menu: any) {
    // console.log(this.menus, this.rolePermissionMap)
    if (!menu.IsEnabled) return;

    this.selectedMenu = menu;

    this.selectedMenuPermissions =
      (this.rolePermissionMap.get(menu.MenuID) || [])
        .sort((a, b) => a.RoleID - b.RoleID);

    console.log('Selected Menu:', menu);
    console.log('Permissions:', this.selectedMenuPermissions);
  }

  handleAddMenu() {
    console.log("add menu")
    this.isFormOpen.set(true);
  }

  closeForm() {
    this.isFormOpen.set(false);
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