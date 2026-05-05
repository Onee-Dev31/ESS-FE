import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarPreviewModal } from './avatar-preview-modal';

describe('AvatarPreviewModal', () => {
  let component: AvatarPreviewModal;
  let fixture: ComponentFixture<AvatarPreviewModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarPreviewModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvatarPreviewModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
