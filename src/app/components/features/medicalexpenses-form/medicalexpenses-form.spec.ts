import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalexpensesForm } from './medicalexpenses-form';

describe('MedicalexpensesForm', () => {
  let component: MedicalexpensesForm;
  let fixture: ComponentFixture<MedicalexpensesForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalexpensesForm],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalexpensesForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
