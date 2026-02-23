import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItRepairRequest } from './it-repair-request';

describe('ItRepairRequest', () => {
  let component: ItRepairRequest;
  let fixture: ComponentFixture<ItRepairRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItRepairRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItRepairRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
