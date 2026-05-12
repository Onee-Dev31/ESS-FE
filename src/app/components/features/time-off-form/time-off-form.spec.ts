import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeOffForm } from './time-off-form';

describe('TimeOffForm', () => {
  let component: TimeOffForm;
  let fixture: ComponentFixture<TimeOffForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeOffForm],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeOffForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
