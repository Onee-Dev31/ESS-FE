import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItProblemReportComponent } from './it-problem-report';

describe('ItProblemReportComponent', () => {
  let component: ItProblemReportComponent;
  let fixture: ComponentFixture<ItProblemReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItProblemReportComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ItProblemReportComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
