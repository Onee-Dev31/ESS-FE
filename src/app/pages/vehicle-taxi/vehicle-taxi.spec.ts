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

  it('maps description and route fields for every trip in a claim', () => {
    const [claim] = (component as any).mapApiData([
      {
        claimId: 1,
        details: [
          {
            work_date: '2026-07-14',
            description: 'ขาไป',
            location_from_name: 'บ้าน',
            location_to_name: 'Office',
          },
          {
            work_date: '2026-07-14',
            description: 'ขากลับ',
            location_from_name: 'Office',
            other_to: 'บ้าน',
          },
        ],
      },
    ]);

    expect(claim.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: 'ขาไป',
          locationFrom: 'บ้าน',
          locationTo: 'Office',
        }),
        expect.objectContaining({
          description: 'ขากลับ',
          locationFrom: 'Office',
          locationTo: 'บ้าน',
        }),
      ]),
    );
  });
});
