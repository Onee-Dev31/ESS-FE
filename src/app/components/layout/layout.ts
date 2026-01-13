import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // 1. Import ตัวนี้เข้ามา
import { NavbarComponent } from '../navbar/navbar'; // Import Navbar ที่คุณสร้าง
import { Sidebar } from '../sidebar/sidebar'; // Import Sidebar ที่คุณสร้าง
import { SidebarService } from '../../services/sidebar';

@Component({
  selector: 'app-layout',
  standalone: true, 
  imports: [
    CommonModule, 
    RouterOutlet,   
    NavbarComponent,
    Sidebar
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class LayoutComponent { 
  constructor(public sidebarService: SidebarService) {}
}