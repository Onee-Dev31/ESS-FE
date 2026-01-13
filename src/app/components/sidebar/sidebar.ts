import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // เพิ่ม RouterModule เพื่อใช้ routerLink
import { SidebarService } from '../../services/sidebar';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule], // เพิ่ม RouterModule ที่นี่
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  openMenu: string = 'Dashboards'; 

  // ปรับข้อมูลให้มี subItems เพื่อให้ HTML วนลูปแสดงผลได้จริง
  menuItems = [
    { 
      name: 'CMS', 
      icon: 'fa-book', 
      subItems: [
        { label: 'โพสต์ทั้งหมด', path: '/cms/posts' },
        { label: 'เพิ่มเนื้อหาใหม่', path: '/cms/new' }
      ] 
    },
    { 
      name: 'Widgets', 
      icon: 'fa-chart-line', 
      subItems: [
        { label: 'สถิติการใช้งาน', path: '/widgets/stats' },
        { label: 'กราฟภาพรวม', path: '/widgets/charts' }
      ] 
    },
    { 
      name: 'User', 
      icon: 'fa-user', 
      subItems: [
        { label: 'จัดการผู้ใช้งาน', path: '/users/list' },
        { label: 'บทบาทและสิทธิ์', path: '/users/roles' }
      ] 
    },
    { 
      name: 'Tables', 
      icon: 'fa-table', 
      subItems: [
        { label: 'ตารางข้อมูล', path: '/tables/data' }
      ] 
    }
  ];

  constructor(public sidebarService: SidebarService) {}

  toggleMenu(menuName: string) {
    this.openMenu = this.openMenu === menuName ? '' : menuName;
  }
}