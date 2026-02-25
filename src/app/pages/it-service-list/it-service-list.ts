import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilePreviewModalComponent, FilePreviewItem } from '../../components/modals/file-preview-modal/file-preview-modal';
import dayjs from 'dayjs';
import { ItServiceMockService, Ticket } from '../../services/it-service-mock.service';

@Component({
  selector: 'app-it-service',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent],
  templateUrl: './it-service-list.html',
  styleUrl: './it-service-list.scss',
})
export class ItService {
  private itServiceMock = inject(ItServiceMockService);
  searchQuery = signal('');

  mockTickets = this.itServiceMock.ticketsSignal;

  selectedTicket = signal<Ticket>(this.mockTickets()[0]);

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  selectTicket(ticket: Ticket) {
    this.selectedTicket.set(ticket);
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
}
