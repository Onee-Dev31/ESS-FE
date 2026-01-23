import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertModals } from './alert-modals';

describe('AlertModals', () => {
  let component: AlertModals;
  let fixture: ComponentFixture<AlertModals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertModals]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertModals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
