import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { ItServiceService } from '../../../services/it-service.service';
import { tickets } from '../../../utils/it-dashboard-mock';
import { FilePreviewItem } from '../../../components/modals/file-preview-modal/file-preview-modal';
import { StatusColor, StatusColor_Reverse, ticketTypyColor } from '../../../utils/status.util';
import dayjs from 'dayjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-report-detail',
  imports: [CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.scss',
})
export class ReportDetail {
  StatusColor = StatusColor;
  StatusColor_Reverse = StatusColor_Reverse;
  Tickets = signal<any[]>(tickets)
  selectedTicket = signal<any | undefined>(undefined);

  isPreviewModalOpen = signal<boolean>(false);
  previewFiles = signal<FilePreviewItem[]>([]);

  isVisibleAssignee = signal<boolean>(false);
  selectedAssignee = signal<any | undefined>(undefined);
  constructor(
    private itServiceService: ItServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.selectedTicket.set(this.route.snapshot.queryParamMap.get('id'))
    this.selectTicket();
  }


  getTicketById(ticketId: string) {
    return this.itServiceService.getTicketById(ticketId)
  }

  selectTicket() {
    this.getTicketById(this.selectedTicket()).subscribe(async (res: any) => {
      console.log(res)

      let convertedFiles: any[] = [];

      if (res.attachments?.length) {
        convertedFiles = await Promise.all(
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
      const attachments = convertedFiles
      const assignGroups = res.assignGroups;
      const assignments = res.assignments;

      const result = this.buildTimeline(res.timeline, res.timelineAssignees);
      console.log("result : ", result);

      // this.selectedAssigneeEmpCodes = assignments.map((assign: any) => ({
      //   id: assign.codeempid,
      //   adUser: assign.aduser,
      //   name: assign.full_name
      // }));

      const objectData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        ticketType: ticket.ticket_type_name_th,
        status: ticket.IT_Status,
        priority: ticket.priority,
        source: ticket.source,
        createdDate: new Date(ticket.created_at).toISOString(),
        requesterCode: ticket.requester_code,
        requesterAduser: ticket.requester_aduser,
        requesterName: ticket.requester_name,
        requesterEmail: ticket.requester_email,
        requesterDept: ticket.requester_dept,
        requesterCompanyCode: ticket.requester_companyCode,
        requesterCompanyName: ticket.requester_companyName,
        requesterPhone: ticket.contact_phone,
        // requesterInitials: 'MP', //ชื่อย่อ
        requesterColor: ticketTypyColor.getColor(ticket.ticket_type_id),
        attachments: attachments,
        itNotes: ticket.requester_code === 'OTD01050',
        assignments: assignments,
        assignTimeline: result
      }

      console.log("selectedTicket:", objectData)
      this.selectedTicket.set(objectData);
      this.cdr.detectChanges();
    }
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

  viewFile(file: any) {

    console.log("file", file)
    this.previewFiles.set([{
      fileName: file.fileName,
      date: dayjs().format('DD/MM/YYYY HH:mm'),
      url: file.filePath,
      type: file.type || 'image/png'
    }]);
    this.isPreviewModalOpen.set(true);
  }

  closePreview() {
    this.isPreviewModalOpen.set(false);
  }

  buildTimeline(timelines: any[], assignees: any[]) {

    // console.log(timelines, assignees)

    return timelines.map(t => {

      const assigneeList = assignees
        .filter(a => a.timeline_id === t.timeline_id)
        .map(a => ({
          id: a.id,
          fullName: a.full_name,
          nickName: a.nickname,
          empCode: a.codeempid,
          adUser: a.aduser,
          email: a.email,
          phone: a.phone
        }));

      return {
        step: t.step,
        title: t.title,
        description: t.description,
        status: t.status,
        Assignee: assigneeList,

        createBy: {
          fullName: t.created_by_name,
          nickName: t.created_by_nickname,
          empCode: t.created_by_codeempid,
          adUser: t.created_by_aduser
        },

        createdDate: new Date(t.created_at).toISOString()
      };

    });

  }

  statusLabel(s: string) {
    switch (s) {
      case 'inprogress': return 'In Progress Tickets';
      case 'assigned': return 'Assigned Tickets';
      case 'done': return 'Done';
      case 'open': return 'Open';
      default: return s;
    }
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
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

  selectAssignee(item: any) {
    console.log(item)
    this.isVisibleAssignee.set(true)
    this.selectedAssignee.set(item)
  }

  closeAssignee() {
    this.isVisibleAssignee.set(false)
  }

}
