import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveSignature } from './save-signature';

describe('SaveSignature', () => {
  let component: SaveSignature;
  let fixture: ComponentFixture<SaveSignature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveSignature]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaveSignature);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
