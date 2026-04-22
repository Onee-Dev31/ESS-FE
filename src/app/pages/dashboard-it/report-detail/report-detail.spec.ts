import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportDetail } from './report-detail';

describe('ReportDetail', () => {
  let component: ReportDetail;
  let fixture: ComponentFixture<ReportDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
