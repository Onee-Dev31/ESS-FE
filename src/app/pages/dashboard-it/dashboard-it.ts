import { Component } from '@angular/core';
import { ItDashboardSummary } from './it-dashboard-summary/it-dashboard-summary';
import { TicketWorkspaceComponent } from './ticket-workspace/ticket-workspace';

@Component({
  selector: 'app-dashboard-it',
  standalone: true,
  imports: [ItDashboardSummary, TicketWorkspaceComponent],
  templateUrl: './dashboard-it.html',
  styleUrl: './dashboard-it.scss',
})
export class DashboardIT {}
