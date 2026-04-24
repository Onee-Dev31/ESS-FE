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
    IT_Status: 'Assigned',
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
  cy.intercept('GET', '**/tickets?page=*', (req) => {
    const myTicket = req.query.myTicket;
    const filteredTickets =
      myTicket === 'tester.two'
        ? tickets.filter((ticket) => ticket.requester_aduser === 'tester.two')
        : tickets;

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
  cy.intercept('GET', '**/Master/companies', { data: [] }).as('getCompanies');
  cy.intercept('GET', '**/Master/company-costcent', { data: [] }).as('getDepartments');
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
    cy.contains('nz-option-item', 'Assigned').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00202').should('be.visible');
    cy.contains('.ticket-item .ticket-status-inline', 'Assigned').should('be.visible');

    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'Closed').click();

    cy.get('.ticket-item').should('have.length', 1);
    cy.contains('.ticket-item .ticket-number', '#IT-00303').should('be.visible');
    cy.contains('.ticket-item .ticket-status-inline', 'Closed').should('be.visible');
  });

  it('ใช้ status filter ร่วมกับ search แล้วเหลือเฉพาะรายการที่ตรงทั้งสองเงื่อนไข', () => {
    cy.get('.tk-left__select').click();
    cy.contains('nz-option-item', 'Assigned').click();

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
    cy.contains('nz-option-item', 'Assigned').click();

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
});
