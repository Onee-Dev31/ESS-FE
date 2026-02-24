import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-menu-all-form',
  imports: [
    CommonModule,
    FormsModule,
    NzTooltipModule,
    MatIconModule,
    NzSelectModule,
    DragDropModule,
    NzInputModule,
    NzSwitchModule
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


  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      console.log('Modal opened');
      console.log('menus', this.menus);
      console.log('rolePermissions', this.rolePermissions);
      this.menus = this.menus.map((menu: any) => ({
        ...menu,
        isExpanded: true,
        children: menu.children ?? []
      }));
      this.generateDropListIds();

    }
  }

  handleClose() {
    this.onClose.emit();
  }

  handleSubmit() {
    const formData = this.flattenMenus(this.menus)
    console.log(formData)
    this.onSubmit.emit(formData);
  }

  toggleMenu(menu: any) {
    menu.isExpanded = !menu.isExpanded;
  }

  dropParent(event: CdkDragDrop<any[]>) {

    moveItemInArray(
      this.menus,
      event.previousIndex,
      event.currentIndex
    );

    this.menus.forEach((menu: any, index: any) => {
      menu.OrderNo = index + 1;
    });
  }

  childDropLists: string[] = [];

  generateDropListIds() {
    this.childDropLists = this.menus.map((m: { MenuID: string; }) => 'child-' + m.MenuID);
  }

  dropChild(event: CdkDragDrop<any[]>, parentMenu: any) {

    if (event.previousContainer === event.container) {

      moveItemInArray(
        parentMenu.children,
        event.previousIndex,
        event.currentIndex
      );

    } else {

      transferArrayItem(
        event.previousContainer.data,
        parentMenu.children,
        event.previousIndex,
        event.currentIndex
      );

      const movedItem = parentMenu.children[event.currentIndex];
      movedItem.ParentMenuID = parentMenu.MenuID;
    }

    parentMenu.children.forEach((child: any, index: any) => {
      child.OrderNo = index + 1;
    });
  }

  // FUNCTION
  flattenMenus(tree: any[]): any[] {
    console.log("tree > ", tree)
    const result: any[] = [];
    let runningOrder = 1;

    tree.forEach(parent => {

      // push parent
      result.push({
        menuID: parent.MenuID,
        menuKey: parent.MenuKey,
        label: parent.Label,
        icon: parent.Icon,
        isVisible: parent.IsVisible,
        isEnabled: parent.IsEnabled,
        routePath: parent.RoutePath,
        parentMenuID: null,
        orderNo: runningOrder++,
        remark: parent.Remark,
        modifiedBy: parent.ModifiedBy
      });

      // push children
      parent.children?.forEach((child: any) => {
        result.push({
          menuID: child.MenuID,
          menuKey: child.MenuKey,
          label: child.Label,
          icon: child.Icon,
          isVisible: child.IsVisible,
          isEnabled: child.IsEnabled,
          routePath: child.RoutePath,
          parentMenuID: parent.MenuID,
          orderNo: runningOrder++,
          remark: child.Remark,
          modifiedBy: child.ModifiedBy
        });
      });

    });

    return result;
  }


}
