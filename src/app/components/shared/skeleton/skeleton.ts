/**
 * @file Skeleton
 * @description Logic for Skeleton
 */

// Section: Imports
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Section: Logic
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
