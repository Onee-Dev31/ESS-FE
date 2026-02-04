/**
 * @file Approval Detail Modal Spec
 * @description Logic for Approval Detail Modal Spec
 */

// Section: Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalDetailModalComponent } from './approval-detail-modal';

describe('ApprovalDetailModal', () => {
  let component: ApprovalDetailModalComponent;
  let fixture: ComponentFixture<ApprovalDetailModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalDetailModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalDetailModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
