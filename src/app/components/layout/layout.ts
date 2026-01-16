import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';
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