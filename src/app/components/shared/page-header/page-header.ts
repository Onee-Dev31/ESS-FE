import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/** ส่วนหัวของหน้า (Page Header) พร้อมปุ่มย้อนกลับและรายการ Action */
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
    @use '../../../../styles/variables' as *;
    @use '../../../../styles/mixins' as *;

    .top-header-strip {
        display: flex;
        align-items: center;
        padding: 1rem 1.5rem;
        background: var(--bg-card);
        border-bottom: 1px solid var(--border-color);
        gap: 1rem;
        position: sticky;
        top: 0;
        z-index: 10;

        h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-header);
            flex: 1;
        }

        .btn-back {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--bg-card);
            color: var(--text-sub);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
                background: var(--bg-slate);
                border-color: var(--border);
                color: var(--text-header);
                transform: translateX(-2px);
            }
        }
    }


    @include tablet {
         .top-header-strip {
            padding: 0.75rem 1rem;
            h2 {
                font-size:$font-size-body;
            }
        }
    }

    @include mobile {
         .top-header-strip {
            padding: 0.5rem 0.7rem;
            h2 {
                font-size: $font-size-label;
            }
        }
    }

    @media (max-width: 425px) {
         .top-header-strip {
            padding: 0.5rem 0.7rem;
            h2 {
                font-size: $font-size-hint;
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
