import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItProblemReport } from './it-problem-report';

describe('ItProblemReport', () => {
  let component: ItProblemReport;
  let fixture: ComponentFixture<ItProblemReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItProblemReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItProblemReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
