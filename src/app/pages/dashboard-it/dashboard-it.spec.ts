import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardIT } from './dashboard-it';

describe('DashboardIT', () => {
  let component: DashboardIT;
  let fixture: ComponentFixture<DashboardIT>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardIT],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardIT);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
