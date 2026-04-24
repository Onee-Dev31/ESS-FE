import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalSetup } from './approval-setup';

describe('ApprovalSetup', () => {
  let component: ApprovalSetup;
  let fixture: ComponentFixture<ApprovalSetup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalSetup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalSetup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
