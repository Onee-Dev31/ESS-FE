/**
 * @file Vehicle Taxi Form Spec
 * @description Logic for Vehicle Taxi Form Spec
 */

// Section: Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleTaxiFormComponent } from './vehicle-taxi-form';

describe('VehicleTaxiForm', () => {
  let component: VehicleTaxiFormComponent;
  let fixture: ComponentFixture<VehicleTaxiFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleTaxiFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleTaxiFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
