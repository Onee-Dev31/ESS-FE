import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesDetailModal } from './services-detail-modal';

describe('ServicesDetailModal', () => {
  let component: ServicesDetailModal;
  let fixture: ComponentFixture<ServicesDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesDetailModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ServicesDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
