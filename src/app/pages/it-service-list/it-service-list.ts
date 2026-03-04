import { Component, signal, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilePreviewModalComponent, FilePreviewItem } from '../../components/modals/file-preview-modal/file-preview-modal';
import { RatingModalComponent } from '../../components/modals/rating-modal/rating-modal';
import dayjs from 'dayjs';
import { ItServiceMockService, Ticket } from '../../services/it-service-mock.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';
import { ticketTypyColor } from '../../utils/status.util';
@Component({
  selector: 'app-it-service',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, RatingModalComponent],
  templateUrl: './it-service-list.html',
  styleUrl: './it-service-list.scss',
})
export class ItService implements OnInit {
  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private userData = this.authService.userData()
  searchQuery = signal('');

  mockTickets = this.itServiceMock.ticketsSignal;
  Tickets = signal<any[]>([])
  selectedTicket = signal<Ticket | undefined>(undefined);

  isPreviewModalOpen = signal<boolean>(false);
  isRatingModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);


  ngOnInit() {
    this.getMyTicket();
  }

  selectTicket(ticketId: string) {
    console.log(ticketId)
    this.getTicketById(ticketId).subscribe((res: any) => {
      console.log(res)

      const ticket = res.ticket;
      const replies = res.replies;
      const services = res.services;
      const attachments = res.attachments.map((item: any) => ({
        id: item.id,
        ticketId: item.ticket_id,
        fileName: item.file_name,
        filePath: item.file_path,
        fileType: item.file_type,
        fileSize: item.file_size,
        fileDescription: item.file_description,
        uploadedByaAduser: item.uploaded_by_aduser,
        created_date: item.created_at
      }));
      const assignGroups = res.assignGroups;

      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        ticketType: ticket.ticket_type_name_th,
        status: ticket.status,
        priority: ticket.priority,
        source: ticket.source,
        createdDate: new Date(ticket.created_at).toISOString(),
        requesterAduser: ticket.requester_aduser,
        requesterName: ticket.requester_name,
        // requesterInitials: 'MP', //ชื่อย่อ
        requesterColor: ticketTypyColor.getColor(ticket.ticket_type_id),
        attachments: attachments,
        itNotes: '',
        assigneeName: '',
        assigneeAduser: '',
        assigneeEmail: '',
        assigneePhone: ''

      }

      console.log(objectData)
      this.selectedTicket.set(objectData);
    }
    );



  }

  // selectTicket(ticket: any) {
  //   this.selectedTicket.set(ticket);
  // }

  clearSelection() {
    this.selectedTicket.set(undefined);
  }

  viewFile(file: any) {
    this.previewFiles.set([{
      fileName: file.fileName,
      date: dayjs().format('DD/MM/YYYY HH:mm'),
      url: file.filePath,
      type: file.fileType || 'image/png'
    }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  openRating() {
    this.isRatingModalOpen.set(true);
  }

  closeRating() {
    this.isRatingModalOpen.set(false);
  }

  handleRate(event: { rating: number, comment: string }) {
    console.log('Rating submitted:', event);
    // Here you would typically call a service to save the rating
    this.closeRating();
  }


  // FUNCTION

  mapPriorityColor(priority: string) {
    switch (priority) {
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'orange';
      case 'LOW': return 'green';
      default: return 'gray';
    }
  }

  isToday(dateValue: string | Date): boolean {
    const date = new Date(dateValue);
    const now = new Date();

    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  // GET
  getMyTicket() {

    // { requesterCodeempid: this.userData.CODEMPID }
    // { requesterAduser: this.userData.AD_USER }

    this.itServiceService.getMyTickets({ requesterCodeempid: this.userData.CODEMPID }).subscribe({
      next: (res) => {
        console.log(res);
        this.Tickets.set(res.data.map((ticket: any) => ({
          ...ticket,
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          ticketType: ticket.ticket_type_name_th,
          status: ticket.status,
          createdDate: new Date(ticket.created_at).toISOString()
        })))
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }

  getTicketById(ticketId: string) {
    return this.itServiceService.getTicketById(ticketId)
  }
}
