import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidateLoginSso } from './validate-login-sso';

describe('ValidateLoginSso', () => {
  let component: ValidateLoginSso;
  let fixture: ComponentFixture<ValidateLoginSso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidateLoginSso]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidateLoginSso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
