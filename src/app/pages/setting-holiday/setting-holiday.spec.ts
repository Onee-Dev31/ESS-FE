import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingHoliday } from './setting-holiday';

describe('SettingHoliday', () => {
  let component: SettingHoliday;
  let fixture: ComponentFixture<SettingHoliday>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingHoliday]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingHoliday);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
