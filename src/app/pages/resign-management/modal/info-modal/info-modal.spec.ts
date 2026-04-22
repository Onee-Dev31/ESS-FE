import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoModal } from './info-modal';

describe('InfoModal', () => {
  let component: InfoModal;
  let fixture: ComponentFixture<InfoModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
