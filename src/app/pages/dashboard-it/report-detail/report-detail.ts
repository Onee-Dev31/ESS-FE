import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { decryptValue } from '../../../utils/crypto.js ';
import { TicketWorkspaceComponent } from '../ticket-workspace/ticket-workspace';

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [TicketWorkspaceComponent],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.scss',
})
export class ReportDetail {
  readonly ticketId = signal<string | null>(null);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      try {
        const encrypted = params.get('id');
        const id = encrypted ? decryptValue(decodeURIComponent(encrypted)).trim() : '';
        this.ticketId.set(/^\d+$/.test(id) && Number(id) > 0 ? id : null);
      } catch {
        this.ticketId.set(null);
      }
    });
  }
}
