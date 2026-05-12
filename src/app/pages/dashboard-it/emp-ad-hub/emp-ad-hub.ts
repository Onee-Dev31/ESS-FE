import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { EmpployeeAdManagement } from '../empployee-ad-management/empployee-ad-management';
import { EmpList } from './emp-list/emp-list';
import { DeptHeadsComponent } from '../../dept-heads/dept-heads';

type TabKey = 'emp-ad' | 'emp-list' | 'approver-flow';

interface Tab {
  key: TabKey;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-emp-ad-hub',
  imports: [CommonModule, EmpployeeAdManagement, EmpList, DeptHeadsComponent],
  templateUrl: './emp-ad-hub.html',
  styleUrl: './emp-ad-hub.scss',
})
export class EmpAdHub {
  activeTab: TabKey = 'emp-ad';

  tabs: Tab[] = [
    { key: 'emp-ad', label: 'Employee AD', icon: 'fas fa-user-cog' },
    { key: 'approver-flow', label: 'Approver Flow', icon: 'fas fa-project-diagram' },
    { key: 'emp-list', label: 'Employee List', icon: 'fas fa-users' },
  ];

  setTab(key: TabKey) {
    this.activeTab = key;
  }
}
