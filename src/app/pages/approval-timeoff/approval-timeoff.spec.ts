import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovalTimeoff } from './approval-timeoff';

describe('ApprovalTimeoff', () => {
  let component: ApprovalTimeoff;
  let fixture: ComponentFixture<ApprovalTimeoff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalTimeoff]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovalTimeoff);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
