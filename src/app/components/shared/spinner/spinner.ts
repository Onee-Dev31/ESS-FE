/**
 * @file Spinner
 * @description Logic for Spinner
 */

// Section: Imports
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Section: Logic
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
