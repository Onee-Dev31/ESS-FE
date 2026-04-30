import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteForItModal } from './note-for-it-modal';

describe('NoteForItModal', () => {
  let component: NoteForItModal;
  let fixture: ComponentFixture<NoteForItModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteForItModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteForItModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
