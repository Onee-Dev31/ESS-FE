import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Medicalexpenses } from './medicalexpenses';

describe('Medicalexpenses', () => {
  let component: Medicalexpenses;
  let fixture: ComponentFixture<Medicalexpenses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Medicalexpenses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Medicalexpenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
