import { beforeEach, vi } from 'vitest';

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn().mockReturnValue({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    configureLogging: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({
      start: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      onreconnected: vi.fn(),
      invoke: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    }),
  }),
  LogLevel: { None: 0 },
  HttpTransportType: { WebSockets: 1 },
}));

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

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const mockContext = {
  lineWidth: 0,
  lineCap: '',
  strokeStyle: '',
  fillStyle: '',
  clearRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fillRect: () => {},
  getImageData: () => ({ data: new Uint8ClampedArray() }),
  putImageData: () => {},
  canvas: {},
};
HTMLCanvasElement.prototype.getContext = () => mockContext as any;

const mockEmployee = {
  CODEMPID: 'TEST001',
  AD_USER: 'testuser',
  NAMEFIRST: 'Test',
  NAMELAST: 'User',
  NAMEFIRSTENG: 'Test',
  NAMELASTENG: 'User',
  DEPID: 'DEP001',
  DEPNAME: 'Test Dept',
  DEPARTMENT: 'Test Dept',
  POSID: 'POS001',
  POSNAME: 'Tester',
};

const mockAllData = {
  accessToken: 'mock-token',
  adUser: 'testuser',
  permission: { Role: 'User' },
  employee: mockEmployee,
  menus: [],
};

beforeEach(() => {
  localStorage.setItem('employee', JSON.stringify(mockEmployee));
  localStorage.setItem('allData', JSON.stringify(mockAllData));
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('currentUser', 'TEST001');
  localStorage.setItem('userRole', 'User');
  localStorage.setItem('authToken', 'mock-token');
});
