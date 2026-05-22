import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { SignalrService } from './signalr.service';
import { ToastService } from './toast';

const API = 'https://localhost:7081/api/notification';

const notificationCreated$ = new Subject<unknown>();

const mockAuthService = {
  currentUser: () => null as string | null,
  userRole: () => null as string | null,
  userData: () => null,
};

const mockSignalrService = {
  on: vi.fn((event: string) => {
    if (event === 'NotificationCreated') return notificationCreated$.asObservable();
    return new Subject().asObservable();
  }),
};

const mockToastService = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

// ตัวอย่าง record จาก SP (snake_case)
const snakeCaseRecord = {
  recipient_id: 10,
  notification_id: 100,
  notification_key: 'ticket-assigned',
  notification_type: 'ticket_assigned',
  title: 'มอบหมายงาน',
  message: 'Ticket T-001 ถูกมอบหมายให้คุณ',
  channel: 'inbox',
  ticket_id: 55,
  ticket_number: 'T-001',
  actor_name: 'Admin',
  target_type: 'ticket',
  recipient_role: 'it-staff',
  is_read: false,
  read_at: null,
  notification_created_at: '2026-05-13T09:00:00Z',
};

// ตัวอย่าง record แบบ camelCase
const camelCaseRecord = {
  notificationRecipientId: 20,
  notificationId: 200,
  notificationKey: 'ticket-closed',
  notificationType: 'ticket_closed',
  title: 'ปิด Ticket',
  message: 'Ticket T-002 ถูกปิดแล้ว',
  channel: 'inbox',
  ticketId: 77,
  ticketNumber: 'T-002',
  actorName: 'IT Staff',
  targetType: 'ticket',
  recipientRole: 'employee',
  isRead: true,
  readAt: '2026-05-13T10:00:00Z',
  notificationCreatedAt: '2026-05-13T08:30:00Z',
};

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: SignalrService, useValue: mockSignalrService },
        { provide: ToastService, useValue: mockToastService },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotificationService);

    // flush effect — currentUser() คือ null → effect return early, ไม่มี HTTP call
    TestBed.flushEffects();
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** ตั้ง activeUserKey โดยตรง แทน effect ที่ต้องรอ signal */
  function activate(aduser = 'testuser') {
    service['activeUserKey'] = aduser;
  }

  // ─── initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('เริ่มต้นด้วย unreadCount = 0 และ items ว่าง', () => {
      expect(service.unreadCount()).toBe(0);
      expect(service.items()).toEqual([]);
      expect(service.hasUnread()).toBe(false);
      expect(service.isEmpty()).toBe(true);
    });

    it('subscribe SignalR event NotificationCreated', () => {
      expect(mockSignalrService.on).toHaveBeenCalledWith('NotificationCreated');
    });
  });

  // ─── refreshUnreadCount ───────────────────────────────────────────────────

  describe('refreshUnreadCount()', () => {
    it('ส่ง recipientAduser เป็น query param', () => {
      activate('testuser');
      service.refreshUnreadCount();

      const req = httpMock.expectOne(
        (r) => r.url === `${API}/unread-count` && r.params.get('recipientAduser') === 'testuser',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, unreadCount: 5 });
    });

    it('อัปเดต unreadCount จาก response.unreadCount', () => {
      activate();
      service.refreshUnreadCount();

      httpMock.expectOne(() => true).flush({ unreadCount: 7 });
      expect(service.unreadCount()).toBe(7);
    });

    it('รับ response ที่มี field count แทน unreadCount ได้', () => {
      activate();
      service.refreshUnreadCount();

      httpMock.expectOne(() => true).flush({ count: 3 });
      expect(service.unreadCount()).toBe(3);
    });

    it('ตั้ง countError เมื่อ HTTP error', () => {
      activate();
      service.refreshUnreadCount();

      httpMock.expectOne(() => true).flush(null, { status: 500, statusText: 'Server Error' });

      expect(service.countError()).toBe('ไม่สามารถโหลดจำนวนแจ้งเตือนใหม่ได้');
      expect(service.unreadCount()).toBe(0);
    });

    it('ไม่ call API ถ้า activeUserKey เป็น null', () => {
      service.refreshUnreadCount();
      httpMock.expectNone(() => true);
    });
  });

  // ─── loadFirstPage ────────────────────────────────────────────────────────

  describe('loadFirstPage()', () => {
    it('ส่ง recipientAduser, page=1, pageSize=8 เป็น query params', () => {
      activate('testuser');
      service.loadFirstPage();

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${API}/my` &&
          r.params.get('recipientAduser') === 'testuser' &&
          r.params.get('page') === '1' &&
          r.params.get('pageSize') === '8',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ data: [], totalRecords: 0 });
    });

    it('เพิ่ม unreadOnly=true ใน param เมื่อ filter เปิด', () => {
      activate();
      service['unreadOnly'].set(true);
      service.loadFirstPage();

      const req = httpMock.expectOne(
        (r) => r.url === `${API}/my` && r.params.get('unreadOnly') === 'true',
      );
      req.flush({ data: [], totalRecords: 0 });
    });

    it('map ข้อมูลจาก data array และอ่าน totalRecords (backend format)', () => {
      activate();
      service.loadFirstPage();

      httpMock
        .expectOne(() => true)
        .flush({
          success: true,
          data: [snakeCaseRecord],
          totalRecords: 1,
          page: 1,
          pageSize: 8,
        });

      expect(service.items()).toHaveLength(1);
      expect(service.items()[0].notificationType).toBe('ticket_assigned');
      expect(service.items()[0].title).toBe('มอบหมายงาน');
      expect(service.hasMore()).toBe(false);
    });

    it('hasMore = true เมื่อ items < totalRecords', () => {
      activate();
      service.loadFirstPage();

      httpMock
        .expectOne(() => true)
        .flush({
          data: [snakeCaseRecord],
          totalRecords: 50,
        });

      expect(service.hasMore()).toBe(true);
    });

    it('hasMore = true เมื่อ totalRecords ไม่มี และ items === pageSize', () => {
      activate();
      service.loadFirstPage();

      const eightRecords = Array.from({ length: 8 }, (_, i) => ({
        ...snakeCaseRecord,
        recipient_id: i + 1,
        notification_id: i + 1,
      }));

      httpMock.expectOne(() => true).flush({ data: eightRecords });

      expect(service.hasMore()).toBe(true);
    });

    it('ตั้ง listError เมื่อ HTTP error', () => {
      activate();
      service.loadFirstPage();

      httpMock.expectOne(() => true).flush(null, { status: 500, statusText: 'Error' });

      expect(service.listError()).toBe('โหลดรายการแจ้งเตือนไม่สำเร็จ');
      expect(service.items()).toEqual([]);
    });
  });

  // ─── loadMore ─────────────────────────────────────────────────────────────

  describe('loadMore()', () => {
    it('ส่ง page=2 ใน request ครั้งที่สอง', () => {
      activate();
      service['hasMore'].set(true);
      service['page'] = 1;

      service.loadMore();

      const req = httpMock.expectOne((r) => r.url === `${API}/my` && r.params.get('page') === '2');
      req.flush({ data: [], totalRecords: 1 });
    });

    it('dedup items ที่ซ้ำกัน', () => {
      activate();
      service['items'].set([
        { ...service['mapNotification'](snakeCaseRecord), notificationRecipientId: 10 } as any,
      ]);
      service['hasMore'].set(true);
      service['page'] = 1;

      service.loadMore();

      // ส่ง record ซ้ำ (recipient_id=10)
      httpMock.expectOne(() => true).flush({ data: [snakeCaseRecord], totalRecords: 2 });

      expect(service.items()).toHaveLength(1);
    });

    it('ไม่ call API เมื่อ hasMore = false', () => {
      activate();
      service['hasMore'].set(false);
      service.loadMore();
      httpMock.expectNone(() => true);
    });

    it('ไม่ call API เมื่อ isLoadingMore = true', () => {
      activate();
      service['hasMore'].set(true);
      service['isLoadingMore'].set(true);
      service.loadMore();
      httpMock.expectNone(() => true);
    });
  });

  // ─── markAsRead ───────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    const unreadItemWithRecipientId = {
      notificationRecipientId: 10,
      notificationId: 100,
      notificationKey: 'k',
      notificationType: 'ticket_assigned',
      title: 'T',
      message: 'M',
      channel: 'inbox',
      ticketId: null,
      ticketNumber: null,
      actorName: null,
      actorNickname: null,
      targetType: null,
      payload: null,
      recipientRole: null,
      isRead: false,
      readAt: null,
      createdAt: null,
      timeLabel: '',
      route: null,
      routeQueryParams: null,
      raw: {},
    } as const;

    it('ส่ง notificationRecipientId ใน body เมื่อมีค่า', () => {
      service.markAsRead({ ...unreadItemWithRecipientId });

      const req = httpMock.expectOne(`${API}/read`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toMatchObject({ notificationRecipientId: 10 });
      req.flush({ success: true });
    });

    it('fallback ส่ง notificationId + recipientAduser เมื่อไม่มี notificationRecipientId', () => {
      activate('testuser');
      service.markAsRead({
        ...unreadItemWithRecipientId,
        notificationRecipientId: null,
        notificationId: 200,
      } as any);

      const req = httpMock.expectOne(`${API}/read`);
      expect(req.request.body).toMatchObject({
        notificationId: 200,
        recipientAduser: 'testuser',
      });
      req.flush({ success: true });
    });

    it('อัปเดต isRead ใน local state และลด unreadCount', () => {
      service['items'].set([{ ...unreadItemWithRecipientId }]);
      service['unreadCount'].set(3);

      service.markAsRead({ ...unreadItemWithRecipientId });
      httpMock.expectOne(`${API}/read`).flush({ success: true });

      expect(service.items()[0].isRead).toBe(true);
      expect(service.unreadCount()).toBe(2);
    });

    it('ไม่ call API ถ้า item อ่านแล้ว', () => {
      service.markAsRead({ ...unreadItemWithRecipientId, isRead: true } as any);
      httpMock.expectNone(() => true);
    });

    it('เรียก onDone callback หลัง mark สำเร็จ', () => {
      const onDone = vi.fn();
      service.markAsRead({ ...unreadItemWithRecipientId }, onDone);

      httpMock.expectOne(`${API}/read`).flush({ success: true });
      expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('แสดง toast error เมื่อ HTTP error', () => {
      service.markAsRead({ ...unreadItemWithRecipientId });

      httpMock.expectOne(`${API}/read`).flush(null, { status: 500, statusText: 'Error' });

      expect(mockToastService.error).toHaveBeenCalledWith('ไม่สามารถอัปเดตสถานะอ่านแล้วได้');
    });
  });

  // ─── markAllAsRead ────────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    beforeEach(() => {
      activate('testuser');
      service['unreadCount'].set(5);
    });

    it('ส่ง recipientAduser ใน request body', () => {
      service.markAllAsRead();

      const req = httpMock.expectOne(`${API}/read-all`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ recipientAduser: 'testuser' });
      req.flush({ success: true, affectedRows: 5 });
      // flush refreshAll triggered in complete
      httpMock.expectOne((r) => r.url.includes('/unread-count')).flush({ unreadCount: 0 });
      httpMock.expectOne((r) => r.url.includes('/my')).flush({ data: [], totalRecords: 0 });
    });

    it('reset unreadCount เป็น 0 และ mark items ทั้งหมดว่า isRead', () => {
      service['items'].set([
        {
          notificationRecipientId: 1,
          notificationId: 1,
          notificationKey: 'k1',
          isRead: false,
        } as any,
        {
          notificationRecipientId: 2,
          notificationId: 2,
          notificationKey: 'k2',
          isRead: false,
        } as any,
      ]);

      service.markAllAsRead();
      httpMock.expectOne(`${API}/read-all`).flush({ success: true });

      expect(service.unreadCount()).toBe(0);
      service.items().forEach((item) => expect(item.isRead).toBe(true));

      // flush refreshAll
      httpMock.expectOne((r) => r.url.includes('/unread-count')).flush({ unreadCount: 0 });
      httpMock.expectOne((r) => r.url.includes('/my')).flush({ data: [], totalRecords: 0 });
    });

    it('ไม่ call API ถ้า hasUnread = false', () => {
      service['unreadCount'].set(0);
      service.markAllAsRead();
      httpMock.expectNone(() => true);
    });

    it('แสดง toast error เมื่อ HTTP error', () => {
      service.markAllAsRead();
      httpMock.expectOne(`${API}/read-all`).flush(null, { status: 500, statusText: 'Error' });

      expect(mockToastService.error).toHaveBeenCalledWith(
        'ไม่สามารถทำเครื่องหมายอ่านแล้วทั้งหมดได้',
      );
    });
  });

  // ─── extractListResponse ──────────────────────────────────────────────────

  describe('extractListResponse() — รูปแบบ response ต่างๆ', () => {
    it('รับ { data, totalRecords } — backend format', () => {
      activate();
      service.loadFirstPage();

      httpMock
        .expectOne(() => true)
        .flush({
          success: true,
          data: [snakeCaseRecord, camelCaseRecord],
          totalRecords: 2,
        });

      expect(service.items()).toHaveLength(2);
    });

    it('รับ { items, total } format', () => {
      activate();
      service.loadFirstPage();

      httpMock
        .expectOne(() => true)
        .flush({
          items: [snakeCaseRecord],
          total: 1,
        });

      expect(service.items()).toHaveLength(1);
    });

    it('รับ array โดยตรง', () => {
      activate();
      service.loadFirstPage();

      httpMock.expectOne(() => true).flush([snakeCaseRecord, camelCaseRecord]);

      expect(service.items()).toHaveLength(2);
    });
  });

  // ─── mapNotification ──────────────────────────────────────────────────────

  describe('mapNotification() — normalize fields', () => {
    function loadAndFlush(record: object) {
      activate();
      service.loadFirstPage();
      httpMock.expectOne(() => true).flush({ data: [record], totalRecords: 1 });
      return service.items()[0];
    }

    it('normalize snake_case fields จาก SP', () => {
      const item = loadAndFlush(snakeCaseRecord);
      expect(item.notificationRecipientId).toBe(10);
      expect(item.notificationId).toBe(100);
      expect(item.notificationType).toBe('ticket_assigned');
      expect(item.ticketId).toBe(55);
      expect(item.ticketNumber).toBe('T-001');
      expect(item.isRead).toBe(false);
    });

    it('normalize camelCase fields', () => {
      const item = loadAndFlush(camelCaseRecord);
      expect(item.notificationRecipientId).toBe(20);
      expect(item.notificationType).toBe('ticket_closed');
      expect(item.ticketId).toBe(77);
      expect(item.isRead).toBe(true);
    });

    it('timeLabel ไม่เป็น empty string', () => {
      const item = loadAndFlush(snakeCaseRecord);
      expect(item.timeLabel.length).toBeGreaterThan(0);
    });

    it('route ชี้ไปที่ /it-dashboard เมื่อ recipientRole = it-staff', () => {
      const item = loadAndFlush({ ...snakeCaseRecord, recipient_role: 'it-staff' });
      expect(item.route).toBe('/it-dashboard');
    });

    it('route ชี้ไปที่ /it-service-list เมื่อ recipientRole = employee', () => {
      const item = loadAndFlush({ ...snakeCaseRecord, recipient_role: 'employee' });
      expect(item.route).toBe('/it-service-list');
    });

    it('route เป็น null เมื่อไม่มี ticketId และ ticketNumber', () => {
      const item = loadAndFlush({
        ...snakeCaseRecord,
        ticket_id: null,
        ticket_number: null,
      });
      expect(item.route).toBeNull();
    });
  });

  // ─── SignalR NotificationCreated ──────────────────────────────────────────

  describe('SignalR — NotificationCreated', () => {
    function flushRealtimeRequests(unreadCount = 1) {
      httpMock.expectOne((r) => r.url.includes('/unread-count')).flush({ unreadCount });
      httpMock
        .expectOne((r) => r.url.includes('/my'))
        .flush({ data: [], totalRecords: 0 });
    }

    it('เพิ่ม realtimeTick และ refresh unread count', () => {
      activate();
      const beforeTick = service.realtimeTick();

      notificationCreated$.next({
        notificationRecipientId: 99,
        notificationId: 999,
        notificationKey: 'test',
        notificationType: 'ticket_created',
        title: 'Ticket ใหม่',
        message: 'มี ticket ใหม่',
        channel: 'inbox',
        is_read: false,
      });

      expect(service.realtimeTick()).toBe(beforeTick + 1);
      flushRealtimeRequests();
    });

    it('โหลด items ใหม่จาก API เมื่อได้รับ notification', () => {
      activate();

      notificationCreated$.next({
        notificationRecipientId: 99,
        notificationId: 999,
        notificationKey: 'new-key',
        notificationType: 'ticket_reply_added',
        title: 'Reply ใหม่',
        message: 'มี reply',
        is_read: false,
      });

      httpMock.expectOne((r) => r.url.includes('/unread-count')).flush({ unreadCount: 2 });
      httpMock
        .expectOne((r) => r.url.includes('/my'))
        .flush({ data: [{ ...snakeCaseRecord, notification_id: 999 }], totalRecords: 1 });

      expect(service.items()[0].notificationId).toBe(999);
    });

    it('แสดง toast info พร้อม title', () => {
      activate();

      notificationCreated$.next({
        notificationRecipientId: 50,
        notificationId: 500,
        notificationKey: 'k',
        notificationType: 'ticket_status_changed',
        title: 'สถานะเปลี่ยน',
        message: 'msg',
        is_read: false,
      });

      flushRealtimeRequests();
      expect(mockToastService.info).toHaveBeenCalled();
    });
  });

  // ─── setUnreadOnly ────────────────────────────────────────────────────────

  describe('setUnreadOnly()', () => {
    it('reload first page เมื่อ filter เปลี่ยน', () => {
      activate();
      service.setUnreadOnly(true);

      const req = httpMock.expectOne(
        (r) => r.url.includes('/my') && r.params.get('unreadOnly') === 'true',
      );
      req.flush({ data: [], totalRecords: 0 });
    });

    it('ไม่ reload เมื่อ filter ไม่เปลี่ยน', () => {
      activate();
      service['unreadOnly'].set(false);
      service.setUnreadOnly(false);
      httpMock.expectNone((r) => r.url.includes('/my'));
    });
  });
});
