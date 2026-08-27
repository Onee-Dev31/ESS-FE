import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginVersion4 } from './login-version4';

describe('LoginVersion4', () => {
  let component: LoginVersion4;
  let fixture: ComponentFixture<LoginVersion4>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginVersion4],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginVersion4);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
