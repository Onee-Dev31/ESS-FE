import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { StatusColor, getStatusLabel } from '../../../utils/status.util';
import {
  getTicketDisplayStatus,
  TicketStatusAudience,
  TicketStatusSource,
} from './ticket-status.model';

@Component({
  selector: 'app-ticket-status-pill',
  standalone: true,
  imports: [NgStyle],
  template: `
    @if (displayStatus) {
      <span class="status-pill" [ngStyle]="statusStyle">
        <i class="fas fa-sync-alt" aria-hidden="true"></i>
        {{ label }}
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
        line-height: 1.5;
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketStatusPillComponent {
  @Input({ required: true }) ticket!: TicketStatusSource;
  @Input({ required: true }) audience!: TicketStatusAudience;

  get displayStatus(): string {
    return getTicketDisplayStatus(this.ticket, this.audience);
  }

  get label(): string {
    return getStatusLabel(this.displayStatus);
  }

  get statusStyle(): Record<string, string> {
    return StatusColor.getStyle(this.displayStatus);
  }
}
