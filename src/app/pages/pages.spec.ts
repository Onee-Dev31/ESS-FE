import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pages } from './pages';

describe('Pages', () => {
  let component: Pages;
  let fixture: ComponentFixture<Pages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pages]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pages);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
