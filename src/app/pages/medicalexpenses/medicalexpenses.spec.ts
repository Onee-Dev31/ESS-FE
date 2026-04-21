import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalexpensesComponent } from './medicalexpenses';

describe('Medicalexpenses', () => {
  let component: MedicalexpensesComponent;
  let fixture: ComponentFixture<MedicalexpensesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalexpensesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalexpensesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
