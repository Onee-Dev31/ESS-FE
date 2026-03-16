import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResignReport } from './resign-report';

describe('ResignReport', () => {
  let component: ResignReport;
  let fixture: ComponentFixture<ResignReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResignReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResignReport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
