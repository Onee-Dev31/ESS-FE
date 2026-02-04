/**
 * @file Approvals Spec
 * @description Logic for Approvals Spec
 */

// Section: Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalsComponent } from './approvals';

describe('Approvals', () => {
  let component: ApprovalsComponent;
  let fixture: ComponentFixture<ApprovalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
