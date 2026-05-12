type DashboardTicketRecord = {
  id: number;
  ticket_number: string;
  subject: string;
  ticket_type_name_th: string;
  created_at: string;
  requester_code: string;
  requester_name: string;
  requester_aduser: string;
  requester_email: string;
  requester_dept: string;
  requester_companyCode: string;
  requester_companyName: string;
  contact_phone: string;
  IT_Status: string;
  approval_status: string;
  priority: string;
  source: string;
};

const tickets: DashboardTicketRecord[] = [
  {
    id: 101,
    ticket_number: '#IT-00101',
    subject: 'Reset VPN access',
    ticket_type_name_th: 'Service Request',
    created_at: '2026-04-23T08:00:00.000Z',
    requester_code: 'EMP001',
    requester_name: 'Tester One',
    requester_aduser: 'tester.one',
    requester_email: 'tester.one@example.com',
    requester_dept: 'IT',
    requester_companyCode: 'ONEE',
    requester_companyName: 'Onee',
    contact_phone: '0000000000',
    IT_Status: 'Open',
    approval_status: 'approved',
    priority: 'medium',
    source: 'web',
  },
  {
    id: 202,
    ticket_number: '#IT-00202',
    subject: 'Replace broken keyboard',
    ticket_type_name_th: 'Repair',
    created_at: '2026-04-22T03:00:00.000Z',
    requester_code: 'EMP002',
    requester_name: 'Tester Two',
    requester_aduser: 'tester.two',
    requester_email: 'tester.two@example.com',
    requester_dept: 'Finance',
    requester_companyCode: 'ONEE',
    requester_companyName: 'Onee',
    contact_phone: '1111111111',
    IT_Status: 'In Progress',
    approval_status: 'approved',
    priority: 'high',
    source: 'web',
  },
  {
    id: 303,
    ticket_number: '#IT-00303',
    subject: 'Archive old mailbox',
    ticket_type_name_th: 'Service Request',
    created_at: '2026-04-21T02:00:00.000Z',
    requester_code: 'EMP003',
    requester_name: 'Tester Three',
    requester_aduser: 'tester.three',
    requester_email: 'tester.three@example.com',
    requester_dept: 'HR',
    requester_companyCode: 'ONEE',
    requester_companyName: 'Onee',
    contact_phone: '2222222222',
    IT_Status: 'Closed',
    approval_status: 'approved',
    priority: 'low',
    source: 'web',
  },
];

const setupDashboardApi = () => {
  cy.intercept('GET', /\/tickets\?/, (req) => {
    const myTicket = req.query['myTicket'];
    const searchText = ((req.query['searchText'] as string) ?? '').toLowerCase();

    let filteredTickets =
      myTicket === 'tester.two'
        ? tickets.filter((ticket) => ticket.requester_aduser === 'tester.two')
        : tickets;

    if (searchText) {
      filteredTickets = filteredTickets.filter(
        (ticket) =>
          ticket.ticket_number.toLowerCase().includes(searchText) ||
          ticket.subject.toLowerCase().includes(searchText),
      );
    }

    req.reply({
      data: filteredTickets,
      summary: {
        open: filteredTickets.filter((ticket) => ticket.IT_Status === 'Open').length,
        assigned: filteredTickets.filter((ticket) => ticket.IT_Status === 'Assigned').length,
        closed: filteredTickets.filter((ticket) => ticket.IT_Status === 'Closed').length,
        hold: filteredTickets.filter((ticket) => ticket.IT_Status === 'Hold').length,
        denied: filteredTickets.filter((ticket) => ticket.IT_Status === 'Denied').length,
        all: filteredTickets.length,
      },
      serviceTypes: [],
      topDepartments: [],
      topCompanies: [],
    });
  }).as('getAllTickets');

  cy.intercept('GET', /\/tickets\/unread(\?.*)?$/, []).as('getUnreadTickets');
  cy.intercept('GET', /\/tickets\/unread-count(\?.*)?$/, { unreadCount: 0 }).as('getUnreadCount');
  cy.intercept('POST', '**/tickets/*/read', { success: true }).as('markTicketRead');
  cy.intercept('GET', '**/tickets/101', {
    ticket: tickets[0],
    attachments: [],
    replies: [],
    services: [],
    assignGroups: [],
    assignments: [],
    timeline: [],
    timelineAssignees: [],
    requester: null,
    requestFor: {},
  }).as('getTicket101');

  cy.intercept('GET', '**/tickets/202', {
    ticket: tickets[1],
    attachments: [],
    replies: [],
    services: [],
    assignGroups: [],
    assignments: [],
    timeline: [],
    timelineAssignees: [],
    requester: null,
    requestFor: {},
  }).as('getTicket202');

  cy.intercept('GET', '**/tickets/303', {
    ticket: tickets[2],
    attachments: [],
    replies: [],
    services: [],
    assignGroups: [],
    assignments: [],
    timeline: [],
    timelineAssignees: [],
    requester: null,
    requestFor: {},
  }).as('getTicket303');
  cy.intercept('GET', '**/Master/assign-dropdown*', { data: [] }).as('getAssignDropdown');
  cy.intercept('GET', '**/Master/companies', []).as('getCompanies');
  cy.intercept('GET', '**/Master/company-costcent', []).as('getDepartments');
};

describe('Dashboard IT filters', () => {
  beforeEach(() => {
    setupDashboardApi();
    cy.login();
    cy.visit('/it-dashboard');

    cy.wait('@getAllTickets');
    cy.wait('@getUnreadTickets');
    cy.wait('@getAssignDropdown');
    cy.wait('@getCompanies');
    cy.wait('@getDepartments');
  });

  it('ค้นหาด้วย ticket number หรือ subject แล้ว list เหลือเฉพาะรายการที่ตรง', () => {
    cy.get('.ticket-item').should('have.length', 3);

    cy.get('input[placeholder="Search by Ticket Number and Name"]').type('keyboard');
    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');

    cy.get('input[placeholder="Search by Ticket Number and Name"]').clear().type('#IT-00303');
    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00303').should('be.visible');
  });

  it('filter status แล้วแสดงเฉพาะ ticket ของสถานะนั้น', () => {
    cy.get('.ticket-item').should('have.length', 3);

    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'In Progress').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');
    cy.contains('.ticket-item .ticket-status-inline', 'In Progress').should('be.visible');

    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'Closed').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00303').should('be.visible');
    cy.contains('.ticket-item .ticket-status-inline', 'Closed').should('be.visible');
  });

  it('ใช้ status filter ร่วมกับ search แล้วเหลือเฉพาะรายการที่ตรงทั้งสองเงื่อนไข', () => {
    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'In Progress').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');

    cy.get('input[placeholder="Search by Ticket Number and Name"]').type('KEYBOARD');
    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');

    cy.get('input[placeholder="Search by Ticket Number and Name"]').clear().type('vpn');
    cy.get('.ticket-item').should('have.length', 0);
  });

  it('เปลี่ยนกลับ All Tickets แล้วรายการกลับมาครบหลังจากเคย filter status', () => {
    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'In Progress').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');

    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'All Tickets').click();

    cy.get('.ticket-item').should('have.length', 3);
    cy.contains('.ticket-item .ticket-number', '#IT-00101').should('be.visible');
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');
    cy.contains('.ticket-item .ticket-number', '#IT-00303').should('be.visible');
  });

  it('ค้นหาไม่เจอแล้วไม่แสดง ticket item', () => {
    cy.get('.ticket-item').should('have.length', 3);

    cy.get('input[placeholder="Search by Ticket Number and Name"]').type('printer offline');

    cy.get('.ticket-item').should('have.length', 0);
    cy.contains('.ticket-number', '#IT-00101').should('not.exist');
    cy.contains('.ticket-number', '#IT-00202').should('not.exist');
    cy.contains('.ticket-number', '#IT-00303').should('not.exist');
  });

  it('เปิด My Ticket แล้ว toggle checkbox และ refresh ticket list ได้', () => {
    cy.login(undefined, undefined, {
      adUser: 'tester.two',
      employee: {
        CODEMPID: 'OTD01072',
        USR_MOBILE: '0812345678',
        AD_USER: 'tester.two',
      },
    });

    cy.visit('/it-dashboard');

    cy.wait('@getAllTickets');
    cy.wait('@getUnreadTickets');
    cy.wait('@getAssignDropdown');
    cy.wait('@getCompanies');
    cy.wait('@getDepartments');

    cy.get('.ticket-item').should('have.length', 3);

    cy.contains('.checkbox-my-ticket', 'My Ticket').click();
    cy.wait('@getAllTickets');

    cy.get('.checkbox-my-ticket .ant-checkbox').should('have.class', 'ant-checkbox-checked');
    cy.get('.ticket-item').should('have.length.at.least', 1);
  });

  it('คลิก ticket แล้วเปิด detail ของรายการที่เลือกและเปลี่ยน active item', () => {
    cy.contains('.ticket-item .ticket-number', '#IT-00202')
      .closest('.ticket-item')
      .as('secondTicket');

    cy.get('@secondTicket').click();

    cy.wait('@getTicket202');
    cy.wait('@markTicketRead');

    cy.get('@secondTicket').should('have.class', 'active');
    cy.get('.tk-hero__title').should('contain', 'Replace broken keyboard');
    cy.contains('.tk-hero__sub b.mono', '##IT-00202').should('be.visible');
  });

  it('แสดง empty state เมื่อยังไม่ได้เลือก ticket', () => {
    cy.get('.empty-selection-placeholder')
      .should('be.visible')
      .and('contain.text', 'กรุณาเลือก Ticket');
  });

  it('filter status: New แสดงเฉพาะ ticket ที่มีสถานะ Open', () => {
    cy.get('.ticket-item').should('have.length', 3);

    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'New').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00101').should('be.visible');
    cy.contains('.ticket-item .ticket-status-inline', 'New').should('be.visible');
  });

  it('filter status: Hold และ Denied ที่ไม่มีข้อมูลแล้วไม่แสดง ticket item', () => {
    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'Hold').click();
    cy.get('.ticket-item').should('have.length', 0);

    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'Denied').click();
    cy.get('.ticket-item').should('have.length', 0);
  });

  it('แสดง ticket type badge ถูกต้องใน ticket list', () => {
    cy.get('.ticket-item')
      .eq(0)
      .find('.badge-outline.ticket-type')
      .should('contain', 'Service Request');
    cy.get('.ticket-item').eq(1).find('.badge-outline.ticket-type').should('contain', 'Repair');
    cy.get('.ticket-item')
      .eq(2)
      .find('.badge-outline.ticket-type')
      .should('contain', 'Service Request');
  });

  it('แสดง status badge ถูกต้องในแต่ละ ticket ใน list', () => {
    cy.get('.ticket-item').eq(0).find('.ticket-status-inline').should('contain', 'New');
    cy.get('.ticket-item').eq(1).find('.ticket-status-inline').should('contain', 'In Progress');
    cy.get('.ticket-item').eq(2).find('.ticket-status-inline').should('contain', 'Closed');
  });

  it('ล้าง search text แล้ว ticket list กลับมาครบ', () => {
    cy.get('input[placeholder="Search by Ticket Number and Name"]').type('keyboard');
    cy.wait('@getAllTickets');
    cy.get('.ticket-item').should('have.length', 1);

    cy.get('input[placeholder="Search by Ticket Number and Name"]').clear();
    cy.wait('@getAllTickets');
    cy.get('.ticket-item').should('have.length', 3);
  });

  it('ค้นหาด้วย keyword บางส่วนแล้วแสดง ticket ที่ตรงทั้งหมด', () => {
    cy.get('input[placeholder="Search by Ticket Number and Name"]').type('00');
    cy.wait('@getAllTickets');
    cy.get('.ticket-item').should('have.length', 3);
  });

  it('summary KPI แสดง count All Tickets ถูกต้องจาก mock data (3)', () => {
    cy.contains('.kpi .kpi-title', 'All Tickets')
      .closest('.kpi')
      .find('.kpi-value')
      .should('contain', '3');
  });

  it('กด KPI card In Progress แล้ว ticket list filter เหลือ 1 รายการ', () => {
    cy.get('.ticket-item').should('have.length', 3);

    cy.contains('.kpi .kpi-title', 'In Progress Ticket').closest('.kpi').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');
  });

  it('กด KPI card All Tickets หลัง filter แล้ว ticket list กลับมาครบ', () => {
    cy.contains('.kpi .kpi-title', 'In Progress Ticket').closest('.kpi').click();
    cy.get('.ticket-item').should('have.length', 1);

    cy.contains('.kpi .kpi-title', 'All Tickets').closest('.kpi').click({ force: true });
    cy.get('.ticket-item').should('have.length', 3);
  });

  it('ticket item แสดง subject ของแต่ละ ticket ใน list', () => {
    cy.get('.ticket-item').eq(0).should('contain.text', 'Reset VPN access');
    cy.get('.ticket-item').eq(1).should('contain.text', 'Replace broken keyboard');
    cy.get('.ticket-item').eq(2).should('contain.text', 'Archive old mailbox');
  });

  it('active class เปลี่ยนไปที่ ticket ใหม่เมื่อคลิก ticket อื่น', () => {
    cy.contains('.ticket-item .ticket-number', '#IT-00101').closest('.ticket-item').click();
    cy.wait('@getTicket101');
    cy.wait('@markTicketRead');

    cy.contains('.ticket-item .ticket-number', '#IT-00101')
      .closest('.ticket-item')
      .should('have.class', 'active');
    cy.contains('.ticket-item .ticket-number', '#IT-00202')
      .closest('.ticket-item')
      .should('not.have.class', 'active');

    cy.contains('.ticket-item .ticket-number', '#IT-00202').closest('.ticket-item').click();
    cy.wait('@getTicket202');
    cy.wait('@markTicketRead');

    cy.contains('.ticket-item .ticket-number', '#IT-00202')
      .closest('.ticket-item')
      .should('have.class', 'active');
    cy.contains('.ticket-item .ticket-number', '#IT-00101')
      .closest('.ticket-item')
      .should('not.have.class', 'active');
  });

  it('KPI Closed count = 1 และกดแล้ว ticket list filter เหลือเฉพาะ Closed', () => {
    cy.contains('.kpi .kpi-title', 'Closed Tickets')
      .closest('.kpi')
      .find('.kpi-value')
      .should('contain', '1');

    cy.contains('.kpi .kpi-title', 'Closed Tickets').closest('.kpi').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00303').should('be.visible');
    cy.contains('.ticket-item .ticket-status-inline', 'Closed').should('be.visible');
  });

  it('search case-insensitive: "KEYBOARD" match รายการ "Replace broken keyboard"', () => {
    cy.get('input[placeholder="Search by Ticket Number and Name"]').type('KEYBOARD');
    cy.wait('@getAllTickets');
    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');
  });

  it('My Ticket toggle ปิด → ticket list กลับมาครบ', () => {
    cy.login(undefined, undefined, {
      adUser: 'tester.two',
      employee: {
        CODEMPID: 'OTD01072',
        USR_MOBILE: '0812345678',
        AD_USER: 'tester.two',
      },
    });

    cy.visit('/it-dashboard');

    cy.wait('@getAllTickets');
    cy.wait('@getUnreadTickets');
    cy.wait('@getAssignDropdown');
    cy.wait('@getCompanies');
    cy.wait('@getDepartments');

    cy.contains('.checkbox-my-ticket', 'My Ticket').click();
    cy.wait('@getAllTickets');
    cy.get('.checkbox-my-ticket .ant-checkbox').should('have.class', 'ant-checkbox-checked');
    cy.get('.ticket-item').should('have.length', 1);

    cy.contains('.checkbox-my-ticket', 'My Ticket').click();
    cy.wait('@getAllTickets');
    cy.get('.checkbox-my-ticket .ant-checkbox').should('not.have.class', 'ant-checkbox-checked');
    cy.get('.ticket-item').should('have.length', 3);
  });

  it('คลิก ticket แล้ว detail panel แสดง subject และ status ถูกต้อง', () => {
    cy.contains('.ticket-item .ticket-number', '#IT-00202').closest('.ticket-item').click();

    cy.wait('@getTicket202');
    cy.wait('@markTicketRead');

    cy.get('.tk-hero__title').should('contain', 'Replace broken keyboard');
    cy.get('.tk-hero .tk-pill').should('be.visible');
    cy.get('.tk-hero__sub').should('contain', '#IT-00202');
  });

  it('กด KPI Closed แล้ว search "vpn" → 0 results', () => {
    cy.contains('.kpi .kpi-title', 'Closed Tickets').closest('.kpi').click();
    cy.get('.ticket-item').should('have.length', 1);
    cy.get('.log-close-btn').click();

    cy.get('input[placeholder="Search by Ticket Number and Name"]').type('vpn');
    cy.wait('@getAllTickets');
    cy.get('.ticket-item').should('have.length', 0);
  });
});
