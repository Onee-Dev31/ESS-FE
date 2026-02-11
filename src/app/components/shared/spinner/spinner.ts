import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** ส่วนประกอบแสดงสัญลักษณ์การทำงาน (Loading Spinner) */
@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss'
})
export class SpinnerComponent {
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() overlay: boolean = false;
  @Input() color: string = '#0071e3';
}
