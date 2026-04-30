import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CcModal } from './cc-modal';

describe('CcModal', () => {
  let component: CcModal;
  let fixture: ComponentFixture<CcModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CcModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CcModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
