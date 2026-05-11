import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpployeeAdManagement } from './empployee-ad-management';

describe('EmpployeeAdManagement', () => {
  let component: EmpployeeAdManagement;
  let fixture: ComponentFixture<EmpployeeAdManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmpployeeAdManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmpployeeAdManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
