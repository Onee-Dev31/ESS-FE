import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeoffComponent } from './timeoff';

describe('TimeoffComponent', () => {
  let component: TimeoffComponent;
  let fixture: ComponentFixture<TimeoffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeoffComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeoffComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
