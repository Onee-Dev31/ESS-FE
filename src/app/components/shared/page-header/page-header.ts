import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="top-header-strip">
      <button class="btn-back" (click)="onBack()">
        <i class="fas fa-chevron-left"></i>
      </button>
      <h2>{{ title }}</h2>
      <div class="header-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
    styles: [`
    .top-header-strip {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        background: white;
        border-bottom: 1px solid #edf2f7;
        gap: 1rem;
        position: sticky;
        top: 0;
        z-index: 10;

        h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: #2d3748;
            flex: 1;
        }

        .btn-back {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            background: white;
            color: #4a5568;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
                background: #f7fafc;
                border-color: #cbd5e0;
                color: #2d3748;
                transform: translateX(-2px);
            }
        }
    }

    @media (max-width: 640px) {
        .top-header-strip {
            padding: 0.75rem 1rem;
            h2 {
                font-size: 1.1rem;
            }
        }
    }
  `]
})
export class PageHeaderComponent {
    @Input({ required: true }) title: string = '';
    @Input() backUrl?: string;
    @Output() back = new EventEmitter<void>();

    private router = inject(Router);

    onBack() {
        if (this.back.observed) {
            this.back.emit();
        } else if (this.backUrl) {
            this.router.navigate([this.backUrl]);
        } else {
            this.router.navigate(['/dashboard']);
        }
    }
}
