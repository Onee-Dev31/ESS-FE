import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignatureModal } from './signature-modal';

describe('SignatureModal', () => {
  let component: SignatureModal;
  let fixture: ComponentFixture<SignatureModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignatureModal],
    }).compileComponents();

    fixture = TestBed.createComponent(SignatureModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
