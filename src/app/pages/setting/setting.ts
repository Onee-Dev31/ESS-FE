import { ChangeDetectorRef, Component, inject } from '@angular/core';
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

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTableModule, NzCheckboxModule, NzButtonModule, PageHeaderComponent, MatIconModule],
  templateUrl: './setting.html',
  styleUrl: './setting.scss',
})
export class Setting {

  private loadingService = inject(LoadingService);
  private settingService = inject(SettingService);
  private swalService = inject(SwalService);
  private masterService = inject(MasterDataService);
  private cdr = inject(ChangeDetectorRef);

  menus: any[] = [];
  rolePermissions: any[] = [];
  selectedMenu: any = null;
  selectedMenuPermissions: any[] = [];

  rolePermissionMap = new Map<number, any[]>();

  ngOnInit() {
    this.getMenu()
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
      .filter(m => m.IsVisible)
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
    if (!menu.IsEnabled) return;

    this.selectedMenu = menu;

    this.selectedMenuPermissions =
      (this.rolePermissionMap.get(menu.MenuID) || [])
        .sort((a, b) => a.RoleID - b.RoleID);

    console.log('Selected Menu:', menu);
    console.log('Permissions:', this.selectedMenuPermissions);
  }

  //GET MASTER
  getMenu() {
    this.settingService.getMenu().subscribe({
      next: (res) => {
        console.log(res.data);

        this.menus = this.buildMenuTree(res.data.menus);
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