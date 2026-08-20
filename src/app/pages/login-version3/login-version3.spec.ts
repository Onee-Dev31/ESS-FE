import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginVersion3 } from './login-version3';

describe('LoginVersion3', () => {
  let component: LoginVersion3;
  let fixture: ComponentFixture<LoginVersion3>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginVersion3],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginVersion3);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
