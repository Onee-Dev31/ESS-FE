import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Timeoff } from './timeoff';

describe('Timeoff', () => {
  let component: Timeoff;
  let fixture: ComponentFixture<Timeoff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Timeoff]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Timeoff);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
