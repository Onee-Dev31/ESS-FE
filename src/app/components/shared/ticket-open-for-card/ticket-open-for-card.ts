import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ticket-open-for-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-open-for-card.html',
  styleUrl: './ticket-open-for-card.scss',
})
export class TicketOpenForCardComponent {
  @Input({ required: true }) openFor!: any;
}
