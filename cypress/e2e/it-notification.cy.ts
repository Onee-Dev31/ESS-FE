// ─── helpers ─────────────────────────────────────────────────────────────────

const makeNotif = (
  id: number,
  overrides: Partial<{
    isRead: boolean;
    notificationType: string;
    recipientRole: string;
    ticketNumber: string;
  }> = {},
) => ({
  recipient_id: id,
  notification_id: id * 10,
  notification_key: `notif-${id}`,
  notification_type: overrides.notificationType ?? 'ticket_assigned',
  title: `แจ้งเตือน ${id}`,
  message: `รายละเอียดการแจ้งเตือน ${id}`,
  channel: 'inbox',
  ticket_id: 100 + id,
  ticket_number: overrides.ticketNumber ?? `T-00${id}`,
  actor_name: 'Admin',
  target_type: 'ticket',
  recipient_role: overrides.recipientRole ?? 'it-staff',
  is_read: overrides.isRead ?? false,
  read_at: overrides.isRead ? new Date().toISOString() : null,
  notification_created_at: new Date(Date.now() - id * 3600000).toISOString(),
});

const setupNotificationApi = (
  unreadCount: number,
  notifications: ReturnType<typeof makeNotif>[],
  options: { totalRecords?: number } = {},
) => {
  cy.intercept('GET', /\/notification\/unread-count/, (req) => {
    req.reply({ success: true, unreadCount });
  }).as('getUnreadCount');

  cy.intercept('GET', /\/notification\/my\?.*page=1/, (req) => {
    req.reply({
      success: true,
      data: notifications,
      totalRecords: options.totalRecords ?? notifications.length,
      page: 1,
      pageSize: 8,
    });
  }).as('getNotifications');

  cy.intercept('GET', /\/notification\/my\?.*page=2/, (req) => {
    req.reply({
      success: true,
      data: [makeNotif(99, { isRead: true })],
      totalRecords: options.totalRecords ?? notifications.length,
      page: 2,
      pageSize: 8,
    });
  }).as('getNotificationsPage2');

  cy.intercept('POST', /\/notification\/read$/, (req) => {
    req.reply({ success: true, affectedRows: 1 });
  }).as('markRead');

  cy.intercept('POST', /\/notification\/read-all/, (req) => {
    req.reply({ success: true, affectedRows: unreadCount });
  }).as('markAllRead');
};

const openPanel = () => cy.get('.notification-dropdown .notification-trigger').click();

// ─── specs ───────────────────────────────────────────────────────────────────

describe('Notification Inbox', () => {
  // ── badge ─────────────────────────────────────────────────────────────────

  describe('badge', () => {
    it('ไม่แสดง badge เมื่อไม่มี unread', () => {
      setupNotificationApi(0, []);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      cy.get('.notification-dropdown .badge').should('not.exist');
    });

    it('แสดง badge ตัวเลขเมื่อมี unread', () => {
      setupNotificationApi(3, [makeNotif(1), makeNotif(2), makeNotif(3)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      cy.get('.notification-dropdown .badge').should('contain', '3');
    });

    it('badge แสดง 99+ เมื่อ unread มากกว่า 99', () => {
      setupNotificationApi(150, []);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      cy.get('.notification-dropdown .badge').invoke('text').invoke('trim').should('eq', '99+');
    });

    it('subtitle แสดงจำนวน unread ที่ถูกต้อง', () => {
      setupNotificationApi(2, [makeNotif(1), makeNotif(2)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.header-subtitle').should('contain', '2');
    });
  });

  // ── panel open / close ────────────────────────────────────────────────────

  describe('panel toggle', () => {
    beforeEach(() => {
      setupNotificationApi(1, [makeNotif(1)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
    });

    it('คลิก bell เปิด panel ได้', () => {
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-menu').should('be.visible');
    });

    it('คลิก bell ซ้ำปิด panel ได้', () => {
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-menu').should('be.visible');
      openPanel();
      cy.get('.dropdown-menu').should('not.exist');
    });

    it('คลิกนอก panel แล้ว panel ปิด', () => {
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-menu').should('be.visible');
      // คลิกที่ page content ซึ่งอยู่นอก navbar element
      cy.get('.allowance-page').click({ force: true });
      cy.get('.dropdown-menu').should('not.exist');
    });

    it('header แสดง "Notification Inbox"', () => {
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.header-title').should('contain', 'Notification Inbox');
    });

    it('panel ว่างแสดง empty state เมื่อไม่มี notification', () => {
      setupNotificationApi(0, []);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.notification-empty').should('be.visible');
    });
  });

  // ── notification list ─────────────────────────────────────────────────────

  describe('notification list', () => {
    beforeEach(() => {
      setupNotificationApi(2, [makeNotif(1), makeNotif(2, { isRead: true })]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
    });

    it('แสดง notification items ครบตามจำนวน', () => {
      cy.get('.dropdown-item').should('have.length', 2);
    });

    it('item ที่ยังไม่อ่านมี class .unread', () => {
      cy.get('.dropdown-item').first().should('have.class', 'unread');
    });

    it('item ที่อ่านแล้วไม่มี class .unread', () => {
      cy.get('.dropdown-item').last().should('not.have.class', 'unread');
    });

    it('แสดง title และ message ถูกต้อง', () => {
      cy.get('.dropdown-item').first().find('.title').should('contain', 'แจ้งเตือน 1');
      cy.get('.dropdown-item').first().find('.message').should('contain', 'รายละเอียดการแจ้งเตือน 1');
    });

    it('แสดง ticket-chip พร้อม ticket number', () => {
      cy.get('.dropdown-item').first().find('.ticket-chip').should('contain', 'T-001');
    });

    it('แสดง .time element ทุก item', () => {
      cy.get('.dropdown-item').each(($item) => {
        cy.wrap($item).find('.time').should('exist').and('not.be.empty');
      });
    });
  });

  // ── all roles ─────────────────────────────────────────────────────────────

  describe('all roles เห็น notification', () => {
    ['Employee', 'it-staff', 'hr', 'supervisor'].forEach((role) => {
      it(`role "${role}" เห็น notification bell`, () => {
        setupNotificationApi(0, []);
        cy.login(undefined, undefined, { permission: { Role: role } });
        cy.visit('/allowance');
        cy.wait('@getUnreadCount');
        cy.get('.notification-dropdown .notification-trigger').should('be.visible');
      });
    });
  });

  // ── mark as read ──────────────────────────────────────────────────────────

  describe('mark as read', () => {
    it('คลิก notification → POST /notification/read พร้อม notificationRecipientId', () => {
      setupNotificationApi(1, [makeNotif(1)]);
      cy.intercept('GET', /\/it-dashboard/, { statusCode: 200 }).as('itDashboard');

      cy.login(undefined, undefined, { permission: { Role: 'it-staff' } });
      cy.window().then((win) => {
        win.localStorage.setItem('userRole', 'it-staff');
        const raw = win.localStorage.getItem('allData');
        if (raw) {
          const d = JSON.parse(raw);
          d.permission = { Role: 'it-staff' };
          win.localStorage.setItem('allData', JSON.stringify(d));
        }
      });
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');

      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().click();

      cy.wait('@markRead').its('request.body').should('have.property', 'notificationRecipientId', 1);
    });

    it('role it-staff คลิก notification แล้วไป /it-dashboard พร้อม ticketId', () => {
      setupNotificationApi(1, [makeNotif(1)]);

      cy.login(undefined, undefined, { permission: { Role: 'it-staff' } });
      cy.window().then((win) => {
        win.localStorage.setItem('userRole', 'it-staff');
        const raw = win.localStorage.getItem('allData');
        if (raw) {
          const d = JSON.parse(raw);
          d.permission = { Role: 'it-staff' };
          win.localStorage.setItem('allData', JSON.stringify(d));
        }
      });
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');

      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().click();
      cy.wait('@markRead');

      cy.location('pathname').should('eq', '/it-dashboard');
      cy.location('search').should('include', 'ticketId=101');
      cy.location('search').should('include', 'focusZone=tickets');
    });

    it('role Employee คลิก notification แล้วไป /it-service-list พร้อม ticketId', () => {
      setupNotificationApi(1, [makeNotif(1, { recipientRole: 'Employee' })]);

      cy.login(undefined, undefined, {
        permission: { Role: 'Employee' },
        menus: [
          { RoutePath: '/welcome' },
          { RoutePath: '/dashboard' },
          { RoutePath: '/allowance' },
          { RoutePath: '/timeoff' },
          { RoutePath: '/it-dashboard' },
          { RoutePath: '/it-service-list' },
        ],
      });
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');

      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().click();
      cy.wait('@markRead');

      cy.location('pathname').should('eq', '/it-service-list');
      cy.location('search').should('include', 'ticketId=101');
    });

    it('role supervisor + approval notification คลิกแล้วไป /approval-it-request', () => {
      setupNotificationApi(1, [
        makeNotif(1, {
          recipientRole: 'supervisor',
          notificationType: 'approval_pending',
        }),
      ]);

      cy.login(undefined, undefined, {
        permission: { Role: 'supervisor' },
        menus: [
          { RoutePath: '/welcome' },
          { RoutePath: '/dashboard' },
          { RoutePath: '/allowance' },
          { RoutePath: '/approval-it-request' },
        ],
      });
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');

      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().click();
      cy.wait('@markRead');

      cy.location('pathname').should('eq', '/approval-it-request');
      cy.location('search').should('include', 'ticketId=101');
      cy.location('search').should('include', 'ticketNumber=T-001');
    });

    it('badge หายหลัง mark as read รายการสุดท้าย', () => {
      setupNotificationApi(1, [makeNotif(1)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');

      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().click();
      cy.wait('@markRead');

      cy.get('.notification-dropdown .badge').should('not.exist');
    });
  });

  // ── mark all as read ──────────────────────────────────────────────────────

  describe('mark all as read', () => {
    beforeEach(() => {
      setupNotificationApi(3, [makeNotif(1), makeNotif(2), makeNotif(3)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
    });

    it('กด Mark all → POST /notification/read-all พร้อม recipientAduser', () => {
      cy.get('.mark-all-btn').click();
      cy.wait('@markAllRead')
        .its('request.body')
        .should('have.property', 'recipientAduser');
    });

    it('badge หายหลัง mark all', () => {
      // หลัง mark-all service เรียก refreshAll() อีกรอบ — ต้องให้ intercept ตอบ 0 ด้วย
      let markedAll = false;

      cy.intercept('GET', /\/notification\/unread-count/, (req) => {
        req.reply({ success: true, unreadCount: markedAll ? 0 : 3 });
      }).as('getUnreadCountRefresh');

      cy.intercept('GET', /\/notification\/my/, (req) => {
        req.reply({ success: true, data: [], totalRecords: 0 });
      }).as('getNotificationsRefresh');

      cy.intercept('POST', /\/notification\/read-all/, (req) => {
        markedAll = true;
        req.reply({ success: true, affectedRows: 3 });
      }).as('markAllReadFresh');

      cy.get('.mark-all-btn').click();
      cy.wait('@markAllReadFresh');
      // รอ refreshAll ที่ service ยิงตาม complete()
      cy.wait('@getUnreadCountRefresh');
      cy.get('.notification-dropdown .badge').should('not.exist');
    });

    it('ปุ่ม Mark all disable เมื่อไม่มี unread', () => {
      setupNotificationApi(0, [makeNotif(1, { isRead: true })]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.mark-all-btn').should('be.disabled');
    });
  });

  // ── unread only filter ────────────────────────────────────────────────────

  describe('unread only filter', () => {
    it('toggle unread only → reload พร้อม unreadOnly=true ใน query', () => {
      setupNotificationApi(2, [makeNotif(1), makeNotif(2)]);

      cy.intercept('GET', /\/notification\/my\?.*unreadOnly=true/, (req) => {
        req.reply({ success: true, data: [makeNotif(1)], totalRecords: 1 });
      }).as('getUnreadOnly');

      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');

      cy.get('.filter-toggle input[type="checkbox"]').check();
      cy.wait('@getUnreadOnly');
      cy.get('.dropdown-item').should('have.length', 1);
    });

    it('toggle unread only แล้วไม่มีรายการค้างอ่าน → แสดง empty state ของ unread only', () => {
      setupNotificationApi(2, [makeNotif(1), makeNotif(2, { isRead: true })]);

      cy.intercept('GET', /\/notification\/my\?.*unreadOnly=true/, (req) => {
        req.reply({ success: true, data: [], totalRecords: 0 });
      }).as('getUnreadOnlyEmpty');

      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');

      cy.get('.filter-toggle input[type="checkbox"]').check();
      cy.wait('@getUnreadOnlyEmpty');
      cy.get('.notification-empty').should('be.visible');
      cy.contains('.notification-empty', 'ไม่มีรายการที่ยังไม่อ่าน').should('be.visible');
    });
  });

  // ── load more ─────────────────────────────────────────────────────────────

  describe('load more', () => {
    it('แสดงปุ่ม Load more เมื่อมี notification มากกว่า pageSize', () => {
      const page1 = Array.from({ length: 8 }, (_, i) => makeNotif(i + 1));
      setupNotificationApi(10, page1, { totalRecords: 10 });
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.load-more-btn').should('be.visible');
    });

    it('กด Load more → GET /notification/my?page=2', () => {
      const page1 = Array.from({ length: 8 }, (_, i) => makeNotif(i + 1));
      setupNotificationApi(9, page1, { totalRecords: 9 });
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');

      cy.get('.load-more-btn').click();
      cy.wait('@getNotificationsPage2');
      cy.get('.dropdown-item').should('have.length', 9);
    });

    it('ไม่แสดงปุ่ม Load more เมื่อ items ครบแล้ว (totalRecords = items ที่โหลด)', () => {
      setupNotificationApi(3, [makeNotif(1), makeNotif(2), makeNotif(3)], { totalRecords: 3 });
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.load-more-btn').should('not.exist');
    });
  });

  // ── subtitle text ─────────────────────────────────────────────────────────

  describe('subtitle text', () => {
    it('subtitle แสดง "Inbox พร้อมใช้งาน" เมื่อ unread = 0', () => {
      setupNotificationApi(0, []);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.header-subtitle').should('contain', 'Inbox พร้อมใช้งาน');
    });

    it('subtitle แสดง "มี 1 รายการที่ยังไม่อ่าน" เมื่อ unread = 1', () => {
      setupNotificationApi(1, [makeNotif(1)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.header-subtitle').should('contain', 'มี 1 รายการที่ยังไม่อ่าน');
    });
  });

  // ── refresh button ────────────────────────────────────────────────────────

  describe('refresh button', () => {
    it('กดปุ่ม refresh → ยิง GET /notification/my ใหม่', () => {
      setupNotificationApi(1, [makeNotif(1)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');

      cy.get('.refresh-btn').click();
      cy.wait('@getNotifications');
    });
  });

  // ── error state ───────────────────────────────────────────────────────────

  describe('error state', () => {
    it('แสดง error state เมื่อ GET /my ตอบ 500', () => {
      cy.intercept('GET', /\/notification\/unread-count/, { unreadCount: 0 }).as('getUnreadCount');
      cy.intercept('GET', /\/notification\/my/, { statusCode: 500 }).as('getNotificationsError');

      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotificationsError');
      cy.get('.notification-error').should('be.visible');
    });

    it('กดปุ่ม Retry ใน error state → ยิง GET /my อีกรอบ', () => {
      // Start with a successful load so items are populated
      setupNotificationApi(1, [makeNotif(1)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').should('have.length', 1);

      // Override intercept to simulate error on next request (refresh)
      cy.intercept('GET', /\/notification\/my/, { statusCode: 500 }).as('getNotificationsError');
      cy.get('.refresh-btn').click();
      cy.wait('@getNotificationsError');
      cy.get('.notification-error').should('be.visible');

      // Override intercept to return success for the retry
      cy.intercept('GET', /\/notification\/my/, (req) => {
        req.reply({ success: true, data: [makeNotif(1)], totalRecords: 1 });
      }).as('getNotificationsRetry');
      cy.get('.notification-error button').click();
      cy.wait('@getNotificationsRetry');
      cy.get('.dropdown-item').should('have.length', 1);
    });
  });

  // ── unread dot ────────────────────────────────────────────────────────────

  describe('unread dot', () => {
    it('item ที่อ่านแล้วไม่มี .unread-dot', () => {
      setupNotificationApi(0, [makeNotif(1, { isRead: true })]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().find('.unread-dot').should('not.exist');
    });

    it('user_status แสดงใน notification item เมื่อมีค่า', () => {
      const notifWithStatus = { ...makeNotif(1), user_status: 'Pending' };
      setupNotificationApi(1, [notifWithStatus]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().find('.user_status').should('contain', 'Pending');
    });

    it('ไม่มี ticket-chip เมื่อ notification ไม่มี ticketNumber', () => {
      const notifWithoutTicketNumber = { ...makeNotif(1), ticket_number: null };
      setupNotificationApi(1, [notifWithoutTicketNumber]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').first().find('.ticket-chip').should('not.exist');
    });
  });

  // ── unread filter off ─────────────────────────────────────────────────────

  describe('unread filter off', () => {
    it('uncheck unread filter → reload ไม่มี unreadOnly param ใน query', () => {
      setupNotificationApi(2, [makeNotif(1), makeNotif(2)]);

      cy.intercept('GET', /\/notification\/my\?.*unreadOnly=true/, (req) => {
        req.reply({ success: true, data: [makeNotif(1)], totalRecords: 1 });
      }).as('getUnreadOnly');

      // @getAllAgain ต้องนิยามหลังจาก initial load เสร็จ
      // เพราะ Cypress ใช้ "last defined wins" — ถ้านิยามก่อน มันจะ override @getNotifications

      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');
      openPanel();
      cy.wait('@getNotifications');

      cy.get('.filter-toggle input[type="checkbox"]').check();
      cy.wait('@getUnreadOnly');
      cy.get('.dropdown-item').should('have.length', 1);

      // นิยาม getAllAgain หลัง initial load เพื่อให้จับเฉพาะ request จาก uncheck
      cy.intercept('GET', /\/notification\/my/, (req) => {
        req.reply({ success: true, data: [makeNotif(1), makeNotif(2)], totalRecords: 2 });
      }).as('getAllAgain');

      cy.get('.filter-toggle input[type="checkbox"]').uncheck();
      cy.wait('@getAllAgain');
      cy.get('.dropdown-item').should('have.length', 2);
    });
  });

  // ── no re-fetch ───────────────────────────────────────────────────────────

  describe('panel reopen', () => {
    it('เปิด panel ซ้ำ ไม่ยิง GET /my อีกครั้งถ้า items มีอยู่แล้ว', () => {
      setupNotificationApi(1, [makeNotif(1)]);
      cy.login();
      cy.visit('/allowance');
      cy.wait('@getUnreadCount');

      // เปิดครั้งแรก — รอ items แสดงใน DOM ก่อน เพื่อให้ items() signal มีค่าแน่นอน
      openPanel();
      cy.wait('@getNotifications');
      cy.get('.dropdown-item').should('have.length', 1);

      // จดจำจำนวน request ก่อนปิด/เปิดซ้ำ
      cy.get('@getNotifications.all').then((callsBefore) => {
        const countBefore = callsBefore.length;

        // ปิดแล้วเปิดใหม่ — ไม่ควรยิง /my อีก เพราะ items() ยังมีอยู่
        openPanel(); // close
        openPanel(); // reopen
        cy.get('.dropdown-item').should('have.length', 1);
        cy.get('@getNotifications.all').should('have.length', countBefore);
      });
    });
  });
});
