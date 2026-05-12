import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingEmployeePermissionRoleForm } from './setting-employee-permission-role-form';

describe('SettingEmployeePermissionRoleForm', () => {
  let component: SettingEmployeePermissionRoleForm;
  let fixture: ComponentFixture<SettingEmployeePermissionRoleForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingEmployeePermissionRoleForm],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingEmployeePermissionRoleForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
