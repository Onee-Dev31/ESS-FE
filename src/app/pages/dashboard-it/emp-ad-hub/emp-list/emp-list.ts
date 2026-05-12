import { Component } from '@angular/core';

@Component({
  selector: 'app-emp-list',
  imports: [],
  template: `
    <div class="placeholder">
      <i class="fas fa-users"></i>
      <p>Employee List</p>
      <span>Coming soon</span>
    </div>
  `,
  styles: [
    `
      .placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 20px;
        color: var(--text-muted);
        gap: 12px;
        i {
          font-size: 3rem;
          opacity: 0.3;
        }
        p {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }
        span {
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class EmpList {}
