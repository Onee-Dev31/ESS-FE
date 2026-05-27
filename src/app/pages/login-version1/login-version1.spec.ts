import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginVersion1 } from './login-version1';

describe('LoginVersion1', () => {
  let component: LoginVersion1;
  let fixture: ComponentFixture<LoginVersion1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginVersion1]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginVersion1);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
