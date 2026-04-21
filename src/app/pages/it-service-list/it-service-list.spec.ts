import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItService } from './it-service-list';

describe('ItService', () => {
  let component: ItService;
  let fixture: ComponentFixture<ItService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItService],
    }).compileComponents();

    fixture = TestBed.createComponent(ItService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
