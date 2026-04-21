import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItRequestSignature } from './it-request-signature';

describe('ItRequestSignature', () => {
  let component: ItRequestSignature;
  let fixture: ComponentFixture<ItRequestSignature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItRequestSignature],
    }).compileComponents();

    fixture = TestBed.createComponent(ItRequestSignature);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
