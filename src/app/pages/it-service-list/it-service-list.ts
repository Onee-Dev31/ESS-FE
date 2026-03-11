import { Component, signal, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilePreviewModalComponent, FilePreviewItem } from '../../components/modals/file-preview-modal/file-preview-modal';
import { RatingModalComponent } from '../../components/modals/rating-modal/rating-modal';
import dayjs from 'dayjs';
import { ItServiceMockService, Ticket } from '../../services/it-service-mock.service';
import { ItServiceService } from '../../services/it-service.service';
import { AuthService } from '../../services/auth.service';
import { StatusColor, ticketTypyColor, StatusColor_Reverse } from '../../utils/status.util';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { StatusKey } from '../../interfaces/it-dashboard.interface';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-it-service',
  standalone: true,
  imports: [CommonModule, FormsModule, FilePreviewModalComponent, RatingModalComponent, NzSelectModule, NzIconModule, NzButtonModule],
  templateUrl: './it-service-list.html',
  styleUrl: './it-service-list.scss',
})
export class ItService implements OnInit {
  private itServiceMock = inject(ItServiceMockService);
  private itServiceService = inject(ItServiceService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private userData = this.authService.userData()
  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;

  searchQuery = signal('');

  mockTickets = this.itServiceMock.ticketsSignal;
  Tickets = signal<any[]>([])
  selectedTicket = signal<any | undefined>(undefined);

  isPreviewModalOpen = signal<boolean>(false);
  isRatingModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);
  IS_NOTE_TICKET = signal(false);
  IS_REOPEN_TICKET = signal(false);

  filterStatus: StatusKey | null = 'all';
  keyword = '';
  convertedFiles: any[] = [];
  attachments: any[] = [];
  deletedAttachmentIds: number[] = [];
  newFiles: any[] = [];
  desNew: string = '';
  ngOnInit() {
    this.getMyTicket();
  }

  selectTicket(ticketId: string) {
    console.log(ticketId)
    this.getTicketById(ticketId).subscribe(async (res: any) => {
      console.log(res)

      if (res.attachments?.length) {
        this.convertedFiles = await Promise.all(
          res.attachments.map((f: any) =>
            this.convertUrlToFile({
              id: f.id,
              fileName: f.file_name,
              filePath: f.file_path,
              fileType: f.file_type,
              fileSize: f.file_size,
              fileDescription: f.file_description,
              uploadedByaAduser: f.uploaded_by_aduser,
              created_date: f.created_at
            })
          )
        );
      }

      const ticket = res.ticket;
      const replies = res.replies;
      const services = res.services;
      const attachments = this.convertedFiles;
      const assignGroups = res.assignGroups;
      this.desNew = ticket.description;
      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        ticketType: ticket.ticket_type_name_th,
        status: ticket.IT_Status === null ? ticket.user_status : ticket.IT_Status === 'Closed' ? 'Closed' : 'In Progress',
        status_user: ticket.user_status,
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
        assigneePhone: '',
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

  // FUNCTION ACTION

  openAddNote() {
    this.IS_NOTE_TICKET.set(true)
  }

  closeAddNoteModal() {
    this.IS_NOTE_TICKET.set(false);
  }

  openReOpen() {
    this.IS_REOPEN_TICKET.set(true)
  }

  closeReOpenModal() {
    this.IS_REOPEN_TICKET.set(false);
  }

  copy(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    console.log('คัดลอกแล้ว');
  }

  // FUNCTION MAP

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  statusLabel(s: any) {
    // console.log(s)
    switch (s) {
      case 'inprocess': return 'In Progress Tickets';
      case 'assigned': return 'Assigned Tickets';
      case 'done': return 'Done';
      case 'open': return 'Open';
      default: return s;
    }
  }

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

  private async convertUrlToFile(fileData: any) {

    try {

      const response = await fetch(fileData.filePath);

      if (!response.ok) {
        throw new Error('Fetch failed');
      }

      const blob = await response.blob();

      const file = new File(
        [blob],
        fileData.fileName,
        { type: fileData.fileType }
      );

      return {
        fileId: fileData.id,
        name: fileData.fileName,
        file: file,
        description: fileData.fileDescription || '',
        uploadedByAduser: fileData.uploadedByaAduser,
        createdDate: fileData.created_date,
        filePath: fileData.filePath,
        size: fileData.fileSize,
        type: fileData.fileType,
        isError: false
      };

    } catch (error) {

      console.warn('File fetch failed:', fileData.fileName);

      // 🔥 fallback return
      return {
        fileId: fileData.id,
        name: fileData.fileName,
        file: null,  // ไม่มี blob
        description: fileData.fileDescription || '',
        uploadedByAduser: fileData.uploadedByaAduser,
        createdDate: fileData.created_date,
        filePath: fileData.filePath,
        size: fileData.fileSize,
        type: fileData.fileType,
        isError: true
      };
    }
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
          status: ticket.IT_Status === null ? ticket.user_status : ticket.IT_Status === 'Closed' ? 'Closed' : 'In Progress',
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) return;

    this.addFiles(files);

    // reset input เพื่อให้เลือกไฟล์ชื่อเดิมซ้ำได้
    input.value = '';
  }

  private addFiles(files: FileList) {
    const current = this.selectedTicket();
    if (!current) return;

    const newFiles: any[] = Array.from(files).map((f) => ({
      id: null,
      name: f.name,
      size: f.size,
      file: f,
      isNew: true,
      isDeleted: false
    }));

    this.selectedTicket.set({
      ...current,
      attachments: [...current.attachments, ...newFiles]
    });
  }

  removeAttachment(file: any) {

    const current = this.selectedTicket();
    if (!current) return;

    const attachments = current.attachments || [];

    // ถ้าเป็นไฟล์เดิมจาก DB
    if (file.fileId) {
      this.deletedAttachmentIds.push(file.fileId);
    }

    // ลบออกจาก list
    const updatedAttachments = attachments.filter((x: any) => x !== file);

    this.selectedTicket.set({
      ...current,
      attachments: updatedAttachments
    });

    console.log("deletedAttachmentIds:", this.deletedAttachmentIds);
    console.log("attachments:", updatedAttachments);
  }

  Resubmit(ticket: any) {
    Swal.fire({
      title: 'ยืนยันการ Re-Submit ?',
      text: 'คุณต้องการส่ง Ticket นี้ให้หัวหน้า Approve หรือไม่',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#aaa'
    }).then((result) => {
      if (!result.isConfirmed) return;

      const requester = JSON.parse(localStorage.getItem('employee') || '{}');
      const current = this.selectedTicket();
      if (!current) return;

      const formData = new FormData();

      // -------------------------
      // ข้อมูลทั่วไป
      // -------------------------

      formData.append('TicketId', String(current.ticketId));
      formData.append('Requester', requester.CODEMPID ?? '');
      formData.append('TicketNumber', current.ticketNumber ?? '');
      formData.append('Description', current.description ?? '');

      const newFiles = (current.attachments || []).filter((x: any) => x.isNew && x.file);
      newFiles.forEach((item: any) => {
        formData.append('NewFiles', item.file, item.name);
      });

      (this.deletedAttachmentIds || []).forEach((id: number) => {
        formData.append('DeletedAttachmentIds', String(id));
      });

      console.log('===== REOPEN FORM DATA =====');
      for (const pair of (formData as any).entries()) {
        console.log(pair[0], pair[1]);
      }
      // ยิงจริง
      this.itServiceService.re_open(formData).subscribe({
        next: (res) => {
          console.log('re_open success:', res);

          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'Re-Submit Ticket สำเร็จ',
            timer: 1500,
            showConfirmButton: false
          });

          this.deletedAttachmentIds = [];
          this.getMyTicket();
          this.selectTicket(current.ticketId.toString());
        },
        error: (error) => {
          console.error('Error Re-Open:', error);

          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถ Re-Submit ได้'
          });
        }
      });
    });
  }

}
