import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginVersion2 } from './login-version2';

describe('LoginVersion2', () => {
  let component: LoginVersion2;
  let fixture: ComponentFixture<LoginVersion2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginVersion2],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginVersion2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
