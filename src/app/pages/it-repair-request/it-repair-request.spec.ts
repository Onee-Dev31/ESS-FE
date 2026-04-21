import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItRepairRequestComponent } from './it-repair-request';

describe('ItRepairRequestComponent', () => {
  let component: ItRepairRequestComponent;
  let fixture: ComponentFixture<ItRepairRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItRepairRequestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ItRepairRequestComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
