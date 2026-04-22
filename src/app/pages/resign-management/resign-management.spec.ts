import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResignManagement } from './resign-management';

describe('ResignManagement', () => {
  let component: ResignManagement;
  let fixture: ComponentFixture<ResignManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResignManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResignManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
