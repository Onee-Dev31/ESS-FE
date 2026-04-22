import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingEmployee } from './setting-employee';

describe('SettingEmployee', () => {
  let component: SettingEmployee;
  let fixture: ComponentFixture<SettingEmployee>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingEmployee]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingEmployee);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
