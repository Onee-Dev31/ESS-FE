import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** ส่วนประกอบแสดงสถานะการโหลดข้อมูล (Skeleton Screen) ให้ผู้ใช้เห็นว่าระบบกำลังทำงาน */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss'
})
export class SkeletonComponent {
  @Input() type: 'table' | 'card' | 'text' = 'table';
  @Input() rows: number = 5;
  @Input() height: string = '20px';

  get rowsArray(): number[] {
    return Array(this.rows).fill(0);
  }
}
