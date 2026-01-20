import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Approvals } from './approvals';

describe('Approvals', () => {
  let component: Approvals;
  let fixture: ComponentFixture<Approvals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Approvals]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Approvals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
