import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExampleServiceRequestModal } from './example-service-request-modal';

describe('ExampleServiceRequestModal', () => {
  let component: ExampleServiceRequestModal;
  let fixture: ComponentFixture<ExampleServiceRequestModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleServiceRequestModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ExampleServiceRequestModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
