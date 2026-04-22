import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllowanceFormComponent } from './allowance-form';

describe('AllowanceForm', () => {
  let component: AllowanceFormComponent;
  let fixture: ComponentFixture<AllowanceFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllowanceFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AllowanceFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
