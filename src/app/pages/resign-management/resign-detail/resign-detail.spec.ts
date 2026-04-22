import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResignDetail } from './resign-detail';

describe('ResignDetail', () => {
  let component: ResignDetail;
  let fixture: ComponentFixture<ResignDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResignDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResignDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
