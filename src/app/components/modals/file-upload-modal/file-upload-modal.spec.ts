import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileUploadModal } from './file-upload-modal';

describe('FileUploadModal', () => {
  let component: FileUploadModal;
  let fixture: ComponentFixture<FileUploadModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileUploadModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
