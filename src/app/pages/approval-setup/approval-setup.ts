import { CommonModule } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { ApprovalSetupChainModal } from '../../components/modals/approval-setup-chain-modal/approval-setup-chain-modal';
import { DepartmentSetup } from './components/department-setup/department-setup';
import { EmployeeSetup } from './components/employee-setup/employee-setup';

@Component({
  selector: 'app-approval-setup',
  standalone: true,
  imports: [CommonModule, ApprovalSetupChainModal, DepartmentSetup, EmployeeSetup],
  templateUrl: './approval-setup.html',
  styleUrl: './approval-setup.scss',
})
export class ApprovalSetup {
  activeTab = signal<'department' | 'employee'>('department');
  isSetupModalOpen = signal(false);

  departmentSetup = viewChild(DepartmentSetup);
  employeeSetup = viewChild(EmployeeSetup);

  setTab(tab: 'department' | 'employee') {
    this.activeTab.set(tab);
  }

  refreshCurrentTab() {
    if (this.activeTab() === 'department') {
      this.departmentSetup()?.refresh();
      return;
    }

    this.employeeSetup()?.refresh();
  }

  openSetupModal() {
    this.isSetupModalOpen.set(true);
  }

  closeSetupModal() {
    this.isSetupModalOpen.set(false);
  }
}
