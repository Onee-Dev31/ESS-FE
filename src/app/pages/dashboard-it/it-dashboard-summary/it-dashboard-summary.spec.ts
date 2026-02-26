import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItDashboardSummary } from './it-dashboard-summary';

describe('ItDashboardSummary', () => {
  let component: ItDashboardSummary;
  let fixture: ComponentFixture<ItDashboardSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItDashboardSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItDashboardSummary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
