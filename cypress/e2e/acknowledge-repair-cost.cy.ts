const repairTicket = {
  id: 999,
  ticket_number: '#IT-00999',
  subject: 'Laptop screen cracked',
  ticket_type_id: 1,
  ticket_type_name_th: 'แจ้งซ่อม',
  created_at: '2026-05-01T08:00:00.000Z',
  requester_code: 'EMP099',
  requester_name: 'Tester Repair',
  requester_aduser: 'tester.repair',
  requester_email: 'tester.repair@example.com',
  requester_dept: 'IT',
  requester_companyCode: 'ONEE',
  requester_companyName: 'Onee',
  contact_phone: '0999999999',
  IT_Status: 'Open',
  approval_status: 'approved',
  priority: 'high',
  source: 'web',
};

const setupApi = () => {
  cy.intercept('GET', /\/tickets\?/, {
    data: [repairTicket],
    summary: { open: 1, assigned: 0, closed: 0, hold: 0, denied: 0, all: 1 },
    serviceTypes: [],
    topDepartments: [],
    topCompanies: [],
  }).as('getAllTickets');

  cy.intercept('GET', /\/tickets\/unread(\?.*)?$/, []).as('getUnreadTickets');
  cy.intercept('GET', /\/tickets\/unread-count(\?.*)?$/, { unreadCount: 0 }).as('getUnreadCount');
  cy.intercept('POST', '**/tickets/*/read', { success: true }).as('markTicketRead');

  cy.intercept('GET', '**/tickets/999', {
    ticket: repairTicket,
    attachments: [],
    replies: [],
    services: [],
    assignGroups: [],
    assignments: [],
    timeline: [],
    timelineAssignees: [],
    requester: null,
    requestFor: {},
  }).as('getTicket999');

  cy.intercept('PATCH', '**/tickets/999/approve', { success: true, message: 'บันทึกสำเร็จ' }).as(
    'approveTicket',
  );

  cy.intercept('GET', '**/Master/assign-dropdown*', { data: [] }).as('getAssignDropdown');
  cy.intercept('GET', '**/Master/companies', []).as('getCompanies');
  cy.intercept('GET', '**/Master/company-costcent', []).as('getDepartments');
};

const openAcknowledgeModal = () => {
  cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
  cy.wait('@getTicket999');
  cy.wait('@markTicketRead');
  cy.get('.btn.btn-accept').click();
};

describe('Acknowledge Modal — repairCostType (แจ้งซ่อม)', () => {
  beforeEach(() => {
    setupApi();
    cy.login();
    cy.visit('/it-dashboard');
    cy.wait('@getAllTickets');
    cy.wait('@getUnreadTickets');
    cy.wait('@getAssignDropdown');
    cy.wait('@getCompanies');
    cy.wait('@getDepartments');
  });

  it('เลือก "แจ้งซ่อม" แล้วแสดง radio ค่าใช้จ่าย', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.contains('app-acknowledge-modal p', 'ประเภทค่าใช้จ่าย').should('be.visible');
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').should('be.visible');
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').should('be.visible');
  });

  it('เลือก "แจ้งปัญหา" แล้วไม่แสดง radio ค่าใช้จ่าย', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.contains('app-acknowledge-modal p', 'ประเภทค่าใช้จ่าย').should('not.exist');
  });

  it('เลือก "ขอใช้บริการ" แล้วไม่แสดง radio ค่าใช้จ่าย', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ขอใช้บริการ').click();
    cy.contains('app-acknowledge-modal p', 'ประเภทค่าใช้จ่าย').should('not.exist');
  });

  it('เลือก "แจ้งซ่อม" แต่ยังไม่เลือกค่าใช้จ่าย → ปุ่มยืนยัน disabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  it('เลือก "ขออนุมัติ Budget ต้นสังกัด" แล้วปุ่มยืนยัน enabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"][value="paid"]').click({ force: true });
    cy.get('app-acknowledge-modal button[type="submit"]').should('not.be.disabled');
  });

  it('เลือก "ดำเนินการตามปกติ" แล้วปุ่มยืนยัน enabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"][value="free"]').click({ force: true });
    cy.get('app-acknowledge-modal button[type="submit"]').should('not.be.disabled');
  });

  it('submit แจ้งซ่อม + paid → PATCH ส่ง repairCostType=paid', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"][value="paid"]').click({ force: true });
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket').its('request.body').should('include', 'repairCostType').and('include', 'paid');
  });

  it('submit แจ้งซ่อม + free → PATCH ส่ง repairCostType=free', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"][value="free"]').click({ force: true });
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket').its('request.body').should('include', 'repairCostType').and('include', 'free');
  });

  it('submit แจ้งปัญหา → PATCH ไม่มี repairCostType', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.get('app-acknowledge-modal textarea').type('มีปัญหาเรื่องอินเตอร์เน็ต');
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket').its('request.body').should('not.include', 'repairCostType');
  });

  it('เปลี่ยน tag จาก แจ้งซ่อม → แจ้งปัญหา → กลับ แจ้งซ่อม → repairCostType reset', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"][value="paid"]').click({ force: true });

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.contains('app-acknowledge-modal p', 'ประเภทค่าใช้จ่าย').should('not.exist');

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"]').should('not.be.checked');
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });
});
