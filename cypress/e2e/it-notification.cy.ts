type TicketRecord = {
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

const baseTickets: TicketRecord[] = [
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
];

const createTicketDetailResponse = (ticket: TicketRecord) => ({
  ticket,
  attachments: [],
  replies: [],
  services: [],
  assignGroups: [],
  assignments: [],
  timeline: [],
  timelineAssignees: [],
  requester: null,
  requestFor: {},
});

const setupItNotificationApi = (initialUnreadIds: number[]) => {
  let unreadIds = [...initialUnreadIds];
  const tickets = Cypress._.cloneDeep(baseTickets);

  const unreadPayload = () =>
    tickets
      .filter((ticket) => unreadIds.includes(ticket.id))
      .map((ticket) => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.IT_Status,
        created_at: ticket.created_at,
      }));

  cy.intercept('GET', /\/tickets\/unread-count(\?.*)?$/, (req) => {
    req.reply({ unreadCount: unreadIds.length });
  }).as('getUnreadCount');

  cy.intercept('GET', /\/tickets\/unread(\?.*)?$/, (req) => {
    req.reply(unreadPayload());
  }).as('getUnreadTickets');

  cy.intercept('POST', '**/tickets/*/read', (req) => {
    const ticketId = Number(String(req.url).match(/\/tickets\/(\d+)\/read/)?.[1]);
    unreadIds = unreadIds.filter((id) => id !== ticketId);
    req.reply({ success: true });
  }).as('markTicketRead');

  cy.intercept('GET', '**/tickets?page=*', (req) => {
    const pageSize = Number(req.query.pageSize ?? 50);
    req.reply({
      data: tickets.slice(0, pageSize),
      summary: {
        open: 1,
        assigned: 1,
        closed: 0,
        hold: 0,
        denied: 0,
        all: tickets.length,
      },
      serviceTypes: [],
      topDepartments: [],
      topCompanies: [],
    });
  }).as('getAllTickets');

  cy.intercept('GET', '**/tickets/101', createTicketDetailResponse(tickets[0])).as('getTicket101');

  cy.intercept('GET', '**/Master/assign-dropdown*', { data: [] }).as('getAssignDropdown');
  cy.intercept('GET', '**/Master/companies', { data: [] }).as('getCompanies');
  cy.intercept('GET', '**/Master/company-costcent', { data: [] }).as('getDepartments');
};

const forceItStaffRole = () => {
  cy.window().then((win) => {
    win.localStorage.setItem('userRole', 'it-staff');

    const allDataRaw = win.localStorage.getItem('allData');
    if (!allDataRaw) return;

    const allData = JSON.parse(allDataRaw);
    allData.permission = {
      ...(allData.permission ?? {}),
      Role: 'it-staff',
    };
    win.localStorage.setItem('allData', JSON.stringify(allData));
  });
};

describe('IT unread notifications', () => {
  it('แสดง badge และ notification unread ticket ใน navbar', () => {
    setupItNotificationApi([101]);

    cy.login(undefined, undefined, {
      permission: { Role: 'it-staff' },
    });
    forceItStaffRole();
    cy.visit('/allowance');

    cy.wait('@getUnreadCount');
    cy.wait('@getUnreadTickets');

    cy.get('.notification-dropdown .badge').should('contain', '1');
    cy.get('.notification-dropdown .icon-btn').click();
    cy.get('.dropdown-menu').should('be.visible');
    cy.get('.dropdown-item').should('have.length', 1);
    cy.get('.dropdown-item .title').first().should('contain', '#IT-00101');
    cy.get('.dropdown-item .message').first().should('contain', 'Reset VPN access');
  });

  it('กด notification แล้ว mark read, redirect และ icon ซองจดหมายอัปเดตได้', () => {
    setupItNotificationApi([101]);

    cy.login(undefined, undefined, {
      permission: { Role: 'it-staff' },
    });
    forceItStaffRole();
    cy.visit('/allowance');

    cy.wait('@getUnreadCount');
    cy.wait('@getUnreadTickets');

    cy.get('.notification-dropdown .icon-btn').click();
    cy.get('.dropdown-item').first().click();

    cy.wait('@markTicketRead').its('request.url').should('contain', '/tickets/101/read');
    cy.url().should('include', '/it-dashboard');
    cy.wait('@getAllTickets');
    cy.wait('@getAssignDropdown');
    cy.wait('@getCompanies');
    cy.wait('@getDepartments');

    cy.contains('.ticket-item .ticket-number', '#IT-00101')
      .closest('.ticket-item')
      .find('.text-icon')
      .should('have.class', 'fa-envelope-open');

    cy.contains('.ticket-item .ticket-number', '#IT-00202')
      .closest('.ticket-item')
      .find('.text-icon')
      .should('have.class', 'fa-envelope-open');

    cy.get('.notification-dropdown .badge').should('not.exist');
  });

  it('กด ticket unread ใน dashboard แล้วเรียก mark read และเปลี่ยนเป็น envelope-open', () => {
    setupItNotificationApi([101]);

    cy.login(undefined, undefined, {
      permission: { Role: 'it-staff' },
    });
    forceItStaffRole();
    cy.visit('/it-dashboard');

    cy.wait('@getAllTickets');
    cy.wait('@getUnreadTickets');

    cy.contains('.ticket-item .ticket-number', '#IT-00101')
      .closest('.ticket-item')
      .find('.text-icon')
      .should('have.class', 'fa-envelope');

    cy.contains('.ticket-item .ticket-number', '#IT-00101').click();

    cy.wait('@getTicket101');
    cy.wait('@markTicketRead').its('request.url').should('contain', '/tickets/101/read');

    cy.contains('.ticket-item .ticket-number', '#IT-00101')
      .closest('.ticket-item')
      .find('.text-icon')
      .should('have.class', 'fa-envelope-open');
  });
});
