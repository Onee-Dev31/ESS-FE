import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingMenu } from './setting-menu';

describe('SettingMenu', () => {
  let component: SettingMenu;
  let fixture: ComponentFixture<SettingMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
