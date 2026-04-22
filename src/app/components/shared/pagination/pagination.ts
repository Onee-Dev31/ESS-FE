import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/** ส่วนประกอบสำหรับการแบ่งหน้า (Pagination) เพื่อจัดการปริมาณข้อมูลที่แสดงในตาราง */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pagination-container">
      <div class="pagination-info">
        แสดง {{ currentPage * pageSize + 1 }}
        ถึง {{ Math.min((currentPage + 1) * pageSize, totalItems) }}
        จาก {{ totalItems }} รายการ
      </div>
      <div class="pagination-controls">
        <div class="page-size-selector">
          <span>จำนวนแถวต่อหน้า:</span>
          <select [ngModel]="pageSize" (ngModelChange)="onPageSizeChange.emit($event)">
            <option [ngValue]="1">1</option>
            <option [ngValue]="5">5</option>
            <option [ngValue]="10">10</option>
            <option [ngValue]="20">20</option>
            <option [ngValue]="50">50</option>
            <option [ngValue]="ALL_PAGE_SIZE">ทั้งหมด</option>
          </select>
        </div>
        <div class="page-buttons">
          <button class="page-btn" (click)="onPageChange.emit(0)" [disabled]="currentPage === 0">
            <i class="fas fa-angle-double-left"></i>
          </button>
          <button class="page-btn" (click)="onPageChange.emit(currentPage - 1)" [disabled]="currentPage === 0">
            <i class="fas fa-angle-left"></i>
          </button>
          <span class="page-info">
            <strong>หน้า {{ currentPage + 1 }} จาก {{ totalPages }}</strong>
          </span>
          <button class="page-btn" (click)="onPageChange.emit(currentPage + 1)" [disabled]="currentPage >= totalPages - 1">
            <i class="fas fa-angle-right"></i>
          </button>
          <button class="page-btn" (click)="onPageChange.emit(totalPages - 1)" [disabled]="currentPage >= totalPages - 1">
            <i class="fas fa-angle-double-right"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./pagination.scss']
})
export class PaginationComponent {
  @Input({ required: true }) currentPage: number = 0;
  @Input({ required: true }) pageSize: number = 10;
  @Input({ required: true }) totalItems: number = 0;

  @Output() onPageChange = new EventEmitter<number>();
  @Output() onPageSizeChange = new EventEmitter<number>();

  readonly ALL_PAGE_SIZE = 10000;

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  protected readonly Math = Math;
}
