import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { mapTaxiClaimDetail, TaxiLogItem } from '../../../interfaces/taxi.interface';
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

  it('maps snake_case claim attendance fields to the edit model', () => {
    expect(
      mapTaxiClaimDetail({
        detail_id: 101,
        work_date: '2026-07-14',
        day_type: 'W',
        shift_code: 'D1',
        time_in: '09:00',
        time_out: '18:00',
      }),
    ).toEqual(
      expect.objectContaining({
        detailId: 101,
        workDate: '2026-07-14',
        dayType: 'W',
        shiftCode: 'D1',
        timeIn: '09:00',
        timeOut: '18:00',
      }),
    );
  });

  it('preserves null attendance fields from the claim response', () => {
    const detail = mapTaxiClaimDetail({
      detail_id: 102,
      work_date: '2026-07-15',
      day_type: null,
      shift_code: null,
      time_in: null,
      time_out: null,
    });

    expect(detail.dayType).toBeNull();
    expect(detail.shiftCode).toBeNull();
    expect(detail.timeIn).toBeNull();
    expect(detail.timeOut).toBeNull();
  });

  it('uses detailId as the render identity and clientId for new trips', () => {
    const existing = makeItem({ clientId: 'generated-existing', detailId: 101 });
    const added = makeItem({ clientId: 'temporary-new', detailId: undefined });

    expect(component.trackByClientId(0, existing)).toBe(101);
    expect(component.trackByClientId(1, added)).toBe('temporary-new');
  });

  it('loads all same-date and cross-month claim details without eligible-date enrichment', async () => {
    const getEligibleDates = vi.fn(() => of({ data: [] }));
    (component as any).taxiService.getEligibleDates = getEligibleDates;
    (component as any).taxiService.getTaxiClaims = vi.fn(() =>
      of({
        data: [
          {
            details: [
              {
                detail_id: 101,
                work_date: '2026-07-14',
                day_type: 'W',
                shift_code: 'O01',
                time_in: '09:00',
                time_out: '18:00',
                rate_amount: 200,
                remaining_amount: 50,
                attachments: [],
              },
              {
                detail_id: 102,
                work_date: '2026-07-14',
                day_type: 'W',
                shift_code: 'O01',
                time_in: '09:00',
                time_out: '18:00',
                rate_amount: 250,
                remaining_amount: 50,
                attachments: [],
              },
              {
                detail_id: 103,
                work_date: '2026-08-01',
                day_type: null,
                shift_code: null,
                time_in: null,
                time_out: null,
                rate_amount: 100,
                remaining_amount: 400,
                attachments: [],
              },
            ],
          },
        ],
      }),
    );

    (component as any).loadClaimForEdit(77);
    await new Promise((resolve) => setTimeout(resolve));
    await new Promise((resolve) => setTimeout(resolve));

    expect(getEligibleDates).not.toHaveBeenCalled();
    expect(component.items.map((item) => item.detailId)).toEqual([101, 102, 103]);
    expect(component.items[0]).toEqual(
      expect.objectContaining({
        dayType: 'W',
        shiftCode: 'O01',
        checkIn: '09:00',
        checkOut: '18:00',
      }),
    );
    expect(component.getShiftTimeLabel(component.items[2])).toBe('ไม่มีข้อมูลกะ');
  });

  it('does not render empty shift and time values as nested placeholders', () => {
    expect(
      component.getShiftTimeLabel(
        makeItem({ shiftCode: '', checkIn: undefined, checkOut: undefined }),
      ),
    ).toBe('ไม่มีข้อมูลกะ');
    expect(
      component.getShiftTimeLabel(makeItem({ shiftCode: 'N1', checkIn: '', checkOut: '' })),
    ).toBe('กะ N1');
    expect(
      component.getShiftTimeLabel(makeItem({ shiftCode: '', checkIn: '22:00', checkOut: '23:00' })),
    ).toBe('22:00 - 23:00');
  });

  it('waits for locations before loading request data from ngOnChanges', () => {
    const loadData = vi.spyOn(component as any, 'checkAndLoadData');
    component.requests = { claimId: 1 };
    const changes = { requests: new SimpleChange(null, { claimId: 1 }, true) };

    component.ngOnChanges(changes);
    expect(loadData).not.toHaveBeenCalled();
    expect(component.isEditMode).toBe(true);
    expect(component.isLoading).toBe(true);

    (component as any).locationsLoaded = true;
    component.ngOnChanges(changes);
    expect(loadData).toHaveBeenCalledTimes(1);
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

  it('enables delete-all when every existing trip is unchecked', () => {
    component.isEditMode = true;
    component.originalDetailCount = 2;
    component.items = [
      makeItem({ detailId: 101, selected: false }),
      makeItem({ detailId: 102, selected: false }),
    ];

    expect(component.isKeep()).toBe(0);
    expect(component.isDelete()).toBe(2);
    expect(component.hasDelete()).toBe(true);
    expect(component.isSubmitDisabled()).toBe(false);
  });

  it('enables delete-all after every existing trip is removed with trash buttons', () => {
    const first = makeItem({ detailId: 101 });
    const second = makeItem({ detailId: 102 });
    component.isEditMode = true;
    component.originalDetailCount = 2;
    component.items = [first, second];

    component.removeTrip(first);
    component.removeTrip(second);

    expect(component.items).toHaveLength(0);
    expect(component.isDelete()).toBe(2);
    expect(component.hasDelete()).toBe(true);
    expect(component.isSubmitDisabled()).toBe(false);
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
    expect(details[0]).not.toHaveProperty('day_type');
    expect(details[0]).not.toHaveProperty('shift_code');
    expect(details[0]).not.toHaveProperty('time_in');
    expect(details[0]).not.toHaveProperty('time_out');
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
