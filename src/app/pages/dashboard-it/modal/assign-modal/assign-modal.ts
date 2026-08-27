import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SwalService } from '../../../../services/swal.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import dayjs from 'dayjs';
import {
  FilePreviewItem,
  FilePreviewModalComponent,
} from '../../../../components/modals/file-preview-modal/file-preview-modal';
import { IT_ATTACHMENT_FILE_CONFIG } from '../../../../constants/it-attachment-file.constant';

@Component({
  selector: 'app-assign-modal',
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    FilePreviewModalComponent,
  ],
  templateUrl: './assign-modal.html',
  styleUrl: './assign-modal.scss',
})
export class AssignModal {
  getEmployeeImage(empCode: string): string {
    return `${environment.employeeImageUrl}/${empCode}.jpg`;
  }
  private swalService = inject(SwalService);

  @Input() ticket: any;
  @Input() visible = false;
  // @Input() assigneeGroups: any[] = [];

  // เพิ่ม property
  assignSearchKeyword = signal('');
  private _assigneeGroups = signal<any[]>([]);

  // setter สำหรับ Input
  @Input() set assigneeGroups(val: any[]) {
    this._assigneeGroups.set(val);
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitModal = new EventEmitter<any>();

  selectedAssigneeEmpCodes: any[] = [];
  selectedTag: number | null = null;
  originalTag: number | null = null;
  repairCostType: 'paid' | 'free' | null = null;
  message = '';
  reason = '';
  attachments: any[] = [];
  readonly FILE_CONFIG = IT_ATTACHMENT_FILE_CONFIG;
  isPreviewModalOpen = signal(false);
  previewFiles = signal<FilePreviewItem[]>([]);
  // assignSearchKeyword = '';
  ticketId: number | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ticket'] && this.ticket) {
      this.selectedTag = Number(this.ticket.ticketTypeId);
      this.originalTag = Number(this.ticket.ticketTypeId);
      this.repairCostType = null;
      this.message = '';
      this.reason = '';
      this.attachments = [];
      if (this.ticket.assignments) {
        this.ticketId = this.ticket.ticketId;
        this.selectedAssigneeEmpCodes = this.ticket.assignments.map((a: any) => ({
          id: a.codeempid,
          name: a.full_name,
          adUser: a.aduser,
        }));
      }
    }
  }

  get isChangedToRepair(): boolean {
    return this.selectedTag === 1 && this.originalTag !== 1;
  }

  onTagChange() {
    this.repairCostType = null;
    this.message = '';
    this.attachments = [];
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(input.files);
    input.value = '';
  }

  private addFiles(files: FileList) {
    const errors: string[] = [];
    const validFiles: { name: string; size: number; file: File }[] = [];

    for (const file of Array.from(files)) {
      const reasons: string[] = [];
      if (this.attachments.length + validFiles.length >= this.FILE_CONFIG.maxFiles) {
        reasons.push(`เกินจำนวนสูงสุด ${this.FILE_CONFIG.maxFiles} ไฟล์`);
      }
      if (file.size / (1024 * 1024) > this.FILE_CONFIG.maxSizeMB) {
        reasons.push(`ขนาดเกิน ${this.FILE_CONFIG.maxSizeMB} MB`);
      }
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (
        !this.FILE_CONFIG.allowedTypes.includes(file.type) &&
        !this.FILE_CONFIG.allowedExtensions.includes(extension)
      ) {
        reasons.push('ประเภทไฟล์ไม่รองรับ');
      }
      if (reasons.length) errors.push(`${file.name} (${reasons.join(', ')})`);
      else validFiles.push({ name: file.name, size: file.size, file });
    }

    if (errors.length) this.swalService.warning(errors.join('\n'));
    this.attachments = [...this.attachments, ...validFiles];
  }

  removeAttachment(index: number) {
    this.attachments.splice(index, 1);
  }

  viewFile(file: any) {
    const url = file.file ? URL.createObjectURL(file.file) : file.filePath || '';
    this.previewFiles.set([
      {
        fileName: file.name || file.fileName,
        date: dayjs().format('DD/MM/YYYY HH:mm'),
        url,
        type: file.file?.type || file.type || 'application/octet-stream',
      },
    ]);
    this.isPreviewModalOpen.set(true);
  }

  close() {
    this.closeModal.emit();
  }

  // get filteredAssigneeGroups() {
  //   const kw = (this.assignSearchKeyword || '').trim().toLowerCase();
  //   if (!kw) return this.assigneeGroups;
  //   return this.assigneeGroups
  //     .map((g) => ({
  //       ...g,
  //       members: g.members.filter((m: any) => m.name.toLowerCase().includes(kw)),
  //     }))
  //     .filter((g) => g.members.length > 0);
  // }
  filteredAssigneeGroups = computed(() => {
    const kw = this.assignSearchKeyword().trim().toLowerCase();
    if (!kw) return this._assigneeGroups();
    return this._assigneeGroups()
      .map((g) => ({
        ...g,
        members: g.members.filter((m: any) => m.name.toLowerCase().includes(kw)),
      }))
      .filter((g) => g.members.length > 0);
  });

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.includes('user.png')) {
      img.src = 'user.png';
    }
  }

  openImage(empCode: string) {
    console.log('Open image:', empCode);
  }

  toggleAssignee(emp: any) {
    const idx = this.selectedAssigneeEmpCodes.findIndex((e) => e.id === emp.id);

    if (idx > -1) {
      this.selectedAssigneeEmpCodes.splice(idx, 1);
    } else {
      this.selectedAssigneeEmpCodes.push(emp);
    }
  }
  toggleGroup(group: any) {
    const memberIds = group.members.map((m: any) => m.id);

    const allIn = memberIds.every((id: any) =>
      this.selectedAssigneeEmpCodes.some((e) => e.id === id),
    );

    if (allIn) {
      this.selectedAssigneeEmpCodes = this.selectedAssigneeEmpCodes.filter(
        (e) => !memberIds.includes(e.id),
      );
    } else {
      group.members.forEach((m: any) => {
        const exists = this.selectedAssigneeEmpCodes.some((e) => e.id === m.id);

        if (!exists) {
          this.selectedAssigneeEmpCodes.push(m);
        }
      });
    }
  }

  isGroupSelected(group: any): boolean {
    return group.members.every((m: any) =>
      this.selectedAssigneeEmpCodes.some((e) => e.id === m.id),
    );
  }

  isSelected(empId: string): boolean {
    return this.selectedAssigneeEmpCodes.some((e) => e.id === empId);
  }

  removeAssignee(empId: string) {
    this.selectedAssigneeEmpCodes = this.selectedAssigneeEmpCodes.filter((e) => e.id !== empId);
  }

  save() {
    this.submitModal.emit({
      assignees: this.selectedAssigneeEmpCodes,
      ticketTypeId: this.selectedTag,
      ticketId: this.ticketId,
      message: this.message,
      attachments: this.attachments,
      reason: this.reason.trim() || undefined,
      ...(this.isChangedToRepair && { repairCostType: this.repairCostType }),
    });
  }
}
