import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuAllForm } from './menu-all-form';

describe('MenuAllForm', () => {
  let component: MenuAllForm;
  let fixture: ComponentFixture<MenuAllForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuAllForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuAllForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
