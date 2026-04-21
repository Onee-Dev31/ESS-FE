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
    arc: () => {},
    closePath: () => {},
  }) as any;
