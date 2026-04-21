import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

localStorage.setItem(
  'employee',
  JSON.stringify({
    CODEMPID: 'EMP001',
    NAMEENG: 'Test User',
    NAMETH: 'ผู้ใช้ทดสอบ',
    DEPCODE: 'IT',
    DEPNAME: 'IT Department',
    POSITIONCODE: 'DEV',
    POSITIONNAME: 'Developer',
    USR_MOBILE: '0812345678',
  }),
);
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('currentUser', 'testuser');
localStorage.setItem('userRole', 'User');

const _configure = TestBed.configureTestingModule.bind(TestBed);
(TestBed as any).configureTestingModule = (moduleDef: any) =>
  _configure({
    ...moduleDef,
    providers: [...(moduleDef.providers ?? []), provideHttpClientTesting(), provideRouter([])],
  });
