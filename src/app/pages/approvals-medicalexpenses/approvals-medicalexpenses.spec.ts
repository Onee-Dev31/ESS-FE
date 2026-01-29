import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalsMedicalexpensesComponent } from './approvals-medicalexpenses';

describe('ApprovalsMedicalexpensesComponent', () => {
  let component: ApprovalsMedicalexpensesComponent;
  let fixture: ComponentFixture<ApprovalsMedicalexpensesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalsMedicalexpensesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalsMedicalexpensesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
