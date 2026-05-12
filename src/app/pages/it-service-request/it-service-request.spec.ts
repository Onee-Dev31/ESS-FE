import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ITServiceRequestComponent } from './it-service-request';

describe('ITServiceRequestComponent', () => {
  let component: ITServiceRequestComponent;
  let fixture: ComponentFixture<ITServiceRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ITServiceRequestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ITServiceRequestComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
