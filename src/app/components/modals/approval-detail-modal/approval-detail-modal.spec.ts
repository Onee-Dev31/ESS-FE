/**
 * @file Approval Detail Modal Spec
 * @description Logic for Approval Detail Modal Spec
 */

// Section: Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ApprovalDetailModalComponent } from './approval-detail-modal';

describe('ApprovalDetailModalComponent', () => {
  let component: ApprovalDetailModalComponent;
  let fixture: ComponentFixture<ApprovalDetailModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalDetailModalComponent],
      providers: [provideNoopAnimations()]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ApprovalDetailModalComponent);
    component = fixture.componentInstance;

    // Provide mock data
    component.approvalItem = {
      requestNo: 'REQ-001',
      requestDate: '2024-01-01',
      requestBy: {
        name: 'Test User',
        employeeId: 'EMP001',
        department: 'Test Dept',
        company: 'Test Co'
      },
      requestType: 'ค่ารักษาพยาบาล' as any,
      requestDetail: 'Test detail',
      amount: 1000,
      status: 'Pending',
      rawStatus: 'Waiting Check'
    } as any;

    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
