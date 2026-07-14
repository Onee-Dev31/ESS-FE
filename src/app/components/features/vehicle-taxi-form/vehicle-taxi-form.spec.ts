import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TaxiLogItem } from '../../../interfaces/taxi.interface';
import { VehicleTaxiFormComponent } from './vehicle-taxi-form';

describe('VehicleTaxiForm', () => {
  let component: VehicleTaxiFormComponent;
  let fixture: ComponentFixture<VehicleTaxiFormComponent>;

  const makeItem = (overrides: Partial<TaxiLogItem> = {}): TaxiLogItem => ({
    clientId: `trip-${Math.random()}`,
    date: '2026-07-14',
    description: 'เดินทางไปทำงาน',
    destination: '',
    distance: 0,
    amount: 100,
    attachedFileNames: [],
    selected: true,
    remainingAmount: 500,
    availableAmount: 500,
    dailyLimit: 500,
    usedAmount: 0,
    isEligible: true,
    locationFromId: 1,
    locationToId: 2,
    otherFrom: '',
    otherTo: 'บ้าน',
    attachedFiles: [],
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleTaxiFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleTaxiFormComponent);
    component = fixture.componentInstance;
    component.locations = [
      { location_id: 1, location_name: 'Office', is_office: true, description: '' },
      { location_id: 2, location_name: 'Other', is_office: false, description: '' },
    ];
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders only selected dates and adds more than two independent trips for the same date', () => {
    const first = makeItem({ selected: false, amount: 0 });
    component.eligibleDates = [first, makeItem({ date: '2026-07-15', selected: false })];
    component.selectedEligibleDate = '2026-07-14';

    component.addSelectedDate();
    component.addSelectedDate();
    component.addSelectedDate();

    expect(component.items).toHaveLength(3);
    expect(new Set(component.items.map((item) => item.clientId)).size).toBe(3);
    expect(component.items.every((item) => item.date === first.date)).toBe(true);
    expect(component.items.every((item) => item.detailId == null)).toBe(true);
    expect(component.items.some((item) => item.date === '2026-07-15')).toBe(false);
  });

  it('validates the combined amount of all selected trips per day', () => {
    const first = makeItem({ amount: 300 });
    const second = makeItem({ amount: 250 });
    component.items = [first, second];

    expect(component.getDailySelectedTotal(first)).toBe(550);
    expect(component.getDailyAmountError(first)).toContain('เกินวงเงิน');
    expect(component.areAllItemsValid()).toBe(false);

    second.amount = 200;
    expect(component.getDailyAmountError(first)).toBeNull();
    expect(component.areAllItemsValid()).toBe(true);
  });

  it('removes only the selected trip when duplicate work dates exist', () => {
    const first = makeItem({ detailId: 101 });
    const second = makeItem({ detailId: 102 });
    component.isEditMode = true;
    component.items = [first, second];

    component.removeTrip(first);

    expect(component.items).toEqual([second]);
    expect(component.items[0].detailId).toBe(102);
  });

  it('sends existing detail_id but omits it for a newly added trip during PATCH', () => {
    let submittedFormData: FormData | undefined;
    const updateTaxiClaim = vi.fn((_claimId: number, formData: FormData) => {
      submittedFormData = formData;
      return of({ success: true });
    });
    (component as any).taxiService.updateTaxiClaim = updateTaxiClaim;
    component.isEditMode = true;
    component.originalClaimId = 77;
    component.items = [makeItem({ detailId: 101 }), makeItem({ detailId: undefined })];

    component.save();

    const details = submittedFormData!.getAll('details').map((value) => JSON.parse(String(value)));
    expect(details).toHaveLength(2);
    expect(details[0].detail_id).toBe(101);
    expect(details[1]).not.toHaveProperty('detail_id');
    expect(details[0].work_date).toBe(details[1].work_date);
  });

  it('maps attachment indexes from the final selected detail array', () => {
    let submittedFormData: FormData | undefined;
    (component as any).taxiService.createTaxiClaim = vi.fn((formData: FormData) => {
      submittedFormData = formData;
      return of({ success: true });
    });
    const first = makeItem({
      attachedFiles: [new File(['first'], 'first.pdf', { type: 'application/pdf' })],
    });
    const removed = makeItem({ selected: false });
    const last = makeItem({
      attachedFiles: [new File(['last'], 'last.pdf', { type: 'application/pdf' })],
    });
    component.items = [first, removed, last];

    component.save();

    expect(submittedFormData!.getAll('details')).toHaveLength(2);
    expect(submittedFormData!.getAll('detail_indexes').map(String)).toEqual(['0', '1']);
  });

  it('shows the HTTP 400 backend message and unlocks submit', () => {
    const warning = vi.fn();
    (component as any).toastService.warning = warning;
    (component as any).taxiService.createTaxiClaim = vi.fn(() =>
      throwError(() => ({ error: { message: 'ยอดเบิกรวมเกินวงเงินคงเหลือ' } })),
    );
    component.items = [makeItem()];

    component.save();

    expect(warning).toHaveBeenCalledWith('ยอดเบิกรวมเกินวงเงินคงเหลือ');
    expect(component.isSubmitting).toBe(false);
  });
});
