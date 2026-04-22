import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleTaxiComponent } from './vehicle-taxi';

describe('VehicleTaxi', () => {
  let component: VehicleTaxiComponent;
  let fixture: ComponentFixture<VehicleTaxiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleTaxiComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleTaxiComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
