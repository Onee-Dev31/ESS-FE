import { CommonModule } from '@angular/common';
import { Component, signal, viewChild } from '@angular/core';
import { ApprovalSetupChainModal } from '../../components/modals/approval-setup-chain-modal/approval-setup-chain-modal';
import { DepartmentSetup } from './components/department-setup/department-setup';
import { EmployeeSetup } from './components/employee-setup/employee-setup';
import { ItPaidSetup } from './components/it-paid-setup/it-paid-setup';
import { PageHeaderComponent } from '../../components/shared/page-header/page-header';

@Component({
  selector: 'app-approval-setup',
  standalone: true,
  imports: [
    CommonModule,
    ApprovalSetupChainModal,
    DepartmentSetup,
    EmployeeSetup,
    ItPaidSetup,
    PageHeaderComponent,
  ],
  templateUrl: './approval-setup.html',
  styleUrl: './approval-setup.scss',
})
export class ApprovalSetup {
  activeTab = signal<'department' | 'employee' | 'it-paid'>('department');
  isSetupModalOpen = signal(false);

  departmentSetup = viewChild(DepartmentSetup);
  employeeSetup = viewChild(EmployeeSetup);
  itPaidSetup = viewChild(ItPaidSetup);

  setTab(tab: 'department' | 'employee' | 'it-paid') {
    this.activeTab.set(tab);
  }

  refreshCurrentTab() {
    if (this.activeTab() === 'department') {
      this.departmentSetup()?.refresh();
      return;
    }

    if (this.activeTab() === 'employee') {
      this.employeeSetup()?.refresh();
      return;
    }

    this.itPaidSetup()?.refresh();
  }

  openSetupModal() {
    this.isSetupModalOpen.set(true);
  }

  closeSetupModal() {
    this.isSetupModalOpen.set(false);
  }
}
