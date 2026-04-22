import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllowanceComponent } from './allowance';

describe('Allowance', () => {
  let component: AllowanceComponent;
  let fixture: ComponentFixture<AllowanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllowanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllowanceComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
