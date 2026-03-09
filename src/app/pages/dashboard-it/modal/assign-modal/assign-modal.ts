import { Component, EventEmitter, inject, Input, Output, SimpleChanges } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SwalService } from '../../../../services/swal.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-assign-modal',
  imports: [
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
  ],
  templateUrl: './assign-modal.html',
  styleUrl: './assign-modal.scss',
})
export class AssignModal {

  private swalService = inject(SwalService);

  @Input() ticket: any;
  @Input() visible = false;
  @Input() assigneeGroups: any[] = [];

  @Output() closeModal = new EventEmitter<void>();
  @Output() submitModal = new EventEmitter<any>();

  selectedAssigneeEmpCodes: any[] = [];
  assignSearchKeyword = '';

  ngOnChanges(changes: SimpleChanges) {

    if (changes['ticket'] && this.ticket) {

      if (this.ticket.assignments) {

        this.selectedAssigneeEmpCodes = this.ticket.assignments
          .map((a: any) => ({
            id: a.codeempid,
            name: a.full_name,
            adUser: a.aduser
          }));

      }

    }

  }

  close() {
    this.closeModal.emit();
  }


  get filteredAssigneeGroups() {
    const kw = (this.assignSearchKeyword || '').trim().toLowerCase();
    if (!kw) return this.assigneeGroups;
    return this.assigneeGroups.map(g => ({
      ...g,
      members: g.members.filter((m: any) => m.name.toLowerCase().includes(kw))
    })).filter(g => g.members.length > 0);
  }

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
    const idx = this.selectedAssigneeEmpCodes.findIndex(e => e.id === emp.id);

    if (idx > -1) {
      this.selectedAssigneeEmpCodes.splice(idx, 1);
    } else {
      this.selectedAssigneeEmpCodes.push(emp);
    }
  }
  toggleGroup(group: any) {

    const memberIds = group.members.map((m: any) => m.id);

    const allIn = memberIds.every((id: any) =>
      this.selectedAssigneeEmpCodes.some(e => e.id === id)
    );

    if (allIn) {

      this.selectedAssigneeEmpCodes =
        this.selectedAssigneeEmpCodes.filter(e => !memberIds.includes(e.id));

    } else {

      group.members.forEach((m: any) => {

        const exists = this.selectedAssigneeEmpCodes.some(e => e.id === m.id);

        if (!exists) {
          this.selectedAssigneeEmpCodes.push(m);
        }

      });

    }

  }

  isGroupSelected(group: any): boolean {
    return group.members.every((m: any) =>
      this.selectedAssigneeEmpCodes.some(e => e.id === m.id)
    );
  }

  isSelected(empId: string): boolean {
    return this.selectedAssigneeEmpCodes.some(e => e.id === empId);
  }

  removeAssignee(empId: string) {

    this.selectedAssigneeEmpCodes =
      this.selectedAssigneeEmpCodes.filter(e => e.id !== empId);

  }

  save() {
    // console.log(this.selectedAssigneeEmpCodes)
    this.submitModal.emit(this.selectedAssigneeEmpCodes);
  }
}
