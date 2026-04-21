import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY } from 'rxjs';

const emptyParamMap = {
  get: () => null,
  getAll: () => [],
  has: () => false,
  keys: [],
};

const mockRouter = {
  url: '/',
  navigate: () => Promise.resolve(true),
  navigateByUrl: () => Promise.resolve(true),
  createUrlTree: () => ({}),
  serializeUrl: () => '/',
  events: EMPTY,
  routerState: { root: {} },
};

const mockActivatedRoute = {
  root: {},
  snapshot: {
    root: {},
    paramMap: emptyParamMap,
    queryParamMap: emptyParamMap,
    params: {},
    queryParams: {},
    data: {},
  },
  paramMap: EMPTY,
  queryParamMap: EMPTY,
  params: EMPTY,
  queryParams: EMPTY,
  data: EMPTY,
};

// Mock localStorage
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
    AD_USER: 'testuser',
  }),
);
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('currentUser', 'testuser');
localStorage.setItem('userRole', 'User');
localStorage.setItem(
  'allData',
  JSON.stringify({
    accessToken: 'mock-token',
    menus: [
      {
        MenuID: 1,
        ParentMenuID: null,
        Label: 'Home',
        Icon: 'fa-home',
        RoutePath: '/dashboard',
      },
      {
        MenuID: 2,
        ParentMenuID: 1,
        Label: 'Dashboard',
        Icon: '',
        RoutePath: '/dashboard',
      },
    ],
  }),
);

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver (not available in jsdom, required by ngx-echarts)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get: () => 1024,
});

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get: () => 768,
});

HTMLElement.prototype.getBoundingClientRect = () =>
  ({
    width: 1024,
    height: 768,
    top: 0,
    left: 0,
    right: 1024,
    bottom: 768,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

window.requestAnimationFrame = (callback: FrameRequestCallback) => {
  callback(0);
  return 0;
};
window.cancelAnimationFrame = () => {};

// Ignore known router rejections from components that redirect to /login in tests.
window.addEventListener('unhandledrejection', (event) => {
  if (String(event.reason).includes('NG04002')) {
    event.preventDefault();
  }
});

const hasProvider = (providers: any[], token: unknown): boolean =>
  providers.some((provider) => {
    if (!provider) return false;
    if (Array.isArray(provider)) return hasProvider(provider, token);
    if (provider.provide === token) return true;
    if (Array.isArray(provider.ɵproviders)) return hasProvider(provider.ɵproviders, token);
    return false;
  });

const originalConfigureTestingModule = TestBed.configureTestingModule.bind(TestBed);

(TestBed as any).configureTestingModule = (moduleDef: any = {}) => {
  const providers = [...(moduleDef.providers ?? [])];
  const hasRouteProvider = hasProvider(providers, ActivatedRoute);

  if (!hasRouteProvider && !hasProvider(providers, Router)) {
    providers.push({ provide: Router, useValue: mockRouter });
  }

  if (!hasRouteProvider) {
    providers.push({ provide: ActivatedRoute, useValue: mockActivatedRoute });
  }

  return originalConfigureTestingModule({
    ...moduleDef,
    providers,
  });
};

// Mock canvas (not available in jsdom)
HTMLCanvasElement.prototype.getContext = () =>
  ({
    lineWidth: 1,
    strokeStyle: '',
    lineCap: '',
    lineJoin: '',
    fillStyle: '',
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    arc: () => {},
    closePath: () => {},
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => {},
    drawImage: () => {},
    scale: () => {},
  }) as any;
