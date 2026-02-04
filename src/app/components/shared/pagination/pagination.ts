/**
 * @file Pagination
 * @description Logic for Pagination
 */

// Section: Imports
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Section: Logic
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
            <option [value]="10">10</option>
            <option [value]="20">20</option>
            <option [value]="50">50</option>
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
    styles: [`
    .pagination-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
      margin-top: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pagination-info {
        color: #718096;
        font-size: 0.875rem;
    }

    .pagination-controls {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
    }

    .page-size-selector {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #718096;

        select {
            padding: 0.25rem 0.5rem;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            outline: none;
            cursor: pointer;

            &:focus {
                border-color: #4299e1;
            }
        }
    }

    .page-buttons {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .page-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
        background: white;
        border-radius: 4px;
        color: #4a5568;
        cursor: pointer;
        transition: all 0.2s;

        &:hover:not(:disabled) {
            background: #f7fafc;
            border-color: #cbd5e0;
            color: #2d3748;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #f7fafc;
        }
    }

    .page-info {
        font-size: 0.875rem;
        color: #4a5568;
        padding: 0 0.5rem;
    }

    @media (max-width: 640px) {
        .pagination-container {
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .pagination-controls {
            flex-direction: column;
            gap: 1rem;
        }
    }
  `]
})
export class PaginationComponent {
    @Input({ required: true }) currentPage: number = 0;
    @Input({ required: true }) pageSize: number = 10;
    @Input({ required: true }) totalItems: number = 0;

    @Output() onPageChange = new EventEmitter<number>();
    @Output() onPageSizeChange = new EventEmitter<number>();

    get totalPages(): number {
        return Math.ceil(this.totalItems / this.pageSize) || 1;
    }

    protected readonly Math = Math;
}
