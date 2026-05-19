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

  cy.intercept('GET', /\/notification\/unread-count/, { success: true, unreadCount: 0 }).as(
    'getNotifUnreadCount',
  );
  cy.intercept('GET', /\/notification\/my/, {
    success: true,
    data: [],
    totalRecords: 0,
    page: 1,
    pageSize: 8,
  }).as('getNotifications');
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

  it('เลือก paid และแนบไฟล์ → ปุ่มยืนยัน enabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.get('app-acknowledge-modal button[type="submit"]').should('not.be.disabled');
  });

  it('เลือก "ดำเนินการตามปกติ" แล้วปุ่มยืนยัน enabled', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal input[name="repairCost"][value="free"]')
      .then(($el) => {
        ($el[0] as HTMLInputElement).checked = true;
        $el[0].dispatchEvent(new Event('change', { bubbles: true }));
      });
    cy.get('app-acknowledge-modal button[type="submit"]').should('not.be.disabled');
  });

  it('submit แจ้งซ่อม + paid + แนบไฟล์ → PATCH ส่ง repairCostType=paid', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket').its('request.body').should('include', 'repairCostType').and('include', 'paid');
  });

  it('submit แจ้งซ่อม + free → PATCH ส่ง repairCostType=free', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal input[name="repairCost"][value="free"]')
      .then(($el) => {
        ($el[0] as HTMLInputElement).checked = true;
        $el[0].dispatchEvent(new Event('change', { bubbles: true }));
      });
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

    cy.get('app-acknowledge-modal input[name="repairCost"][value="paid"]')
      .then(($el) => {
        ($el[0] as HTMLInputElement).checked = true;
        $el[0].dispatchEvent(new Event('change', { bubbles: true }));
      });

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.contains('app-acknowledge-modal p', 'ประเภทค่าใช้จ่าย').should('not.exist');

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"]').should('not.be.checked');
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  // ─── pre-select tag ───────────────────────────────────────────────────────

  it('modal เปิดขึ้นมา pre-select tag แจ้งซ่อม ตามประเภท ticket (ticket_type_id=1)', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal label.tag', 'แจ้งซ่อม')
      .find('input[name="tag"]')
      .should('be.checked');
  });

  it('radio ค่าใช้จ่ายแสดงทันทีเมื่อ modal เปิด โดยไม่ต้อง click tag ใหม่', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal p', 'ประเภทค่าใช้จ่าย').should('be.visible');
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').should('be.visible');
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').should('be.visible');
  });

  // ─── submit button disabled / enabled logic ────────────────────────────────

  it('เปลี่ยน tag ไป แจ้งปัญหา แต่ยังไม่ใส่ message → ปุ่มยืนยัน disabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  it('เปลี่ยน tag ไป แจ้งปัญหา แล้วใส่ message → ปุ่มยืนยัน enabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.get('app-acknowledge-modal textarea').type('รายละเอียดปัญหา');
    cy.get('app-acknowledge-modal button[type="submit"]').should('not.be.disabled');
  });

  it('เปลี่ยน tag ไป ขอใช้บริการ แต่ยังไม่ใส่ message → ปุ่มยืนยัน disabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ขอใช้บริการ').click();
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  // ─── PATCH payload ────────────────────────────────────────────────────────

  it('submit แจ้งปัญหา + message → PATCH ส่ง newTicketTypeId=2', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.get('app-acknowledge-modal textarea').type('รายละเอียดปัญหา');
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket')
      .its('request.body')
      .should('include', 'newTicketTypeId')
      .and('include', '2');
  });

  it('submit ขอใช้บริการ + message → PATCH ส่ง newTicketTypeId=3', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ขอใช้บริการ').click();
    cy.get('app-acknowledge-modal textarea').type('รายละเอียดการขอใช้บริการ');
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket')
      .its('request.body')
      .should('include', 'newTicketTypeId')
      .and('include', '3');
  });

  // ─── cancel modal ────────────────────────────────────────────────────────

  it('กด ยกเลิก → modal ปิด', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal .btn-back-custom').click();
    cy.get('app-acknowledge-modal').should('not.exist');
  });

  // ─── message clear on tag switch ──────────────────────────────────────────

  it('message ถูก clear เมื่อสลับ tag', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.get('app-acknowledge-modal textarea').type('ข้อความทดสอบ');
    cy.get('app-acknowledge-modal textarea').should('have.value', 'ข้อความทดสอบ');

    cy.contains('app-acknowledge-modal span', 'ขอใช้บริการ').click();
    cy.get('app-acknowledge-modal textarea').should('have.value', '');
  });

  // ─── initial modal state ──────────────────────────────────────────────────

  it('modal เปิดแล้ว ปุ่มยืนยัน disabled ทันที (repairCostType ยังไม่เลือก)', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  it('modal เปิดแล้ว header แสดง "รับเรื่อง"', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal h2').should('contain', 'รับเรื่อง');
  });

  it('modal มี tag ครบ 3 ตัว (แจ้งปัญหา / แจ้งซ่อม / ขอใช้บริการ)', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').should('be.visible');
    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').should('be.visible');
    cy.contains('app-acknowledge-modal span', 'ขอใช้บริการ').should('be.visible');
  });

  it('textarea ไม่ปรากฏตอน modal เปิดแรก (isTagChanged=false)', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal textarea').should('not.exist');
  });

  it('ปุ่มแนบไฟล์ไม่แสดงตอน modal เปิดแรก (isTagChanged=false)', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal .attach-btn').should('not.exist');
  });

  // ─── textarea visibility on tag change ────────────────────────────────────

  it('สลับ tag จาก แจ้งซ่อม → แจ้งปัญหา → textarea ปรากฏ', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.get('app-acknowledge-modal textarea').should('be.visible');
  });

  it('สลับ tag จาก แจ้งซ่อม → ขอใช้บริการ → textarea ปรากฏ', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ขอใช้บริการ').click();
    cy.get('app-acknowledge-modal textarea').should('be.visible');
  });

  // ─── repairCostType reset (additional combination) ────────────────────────

  it('เปลี่ยน tag แจ้งซ่อม + free → ขอใช้บริการ → แจ้งซ่อม → repairCostType reset', () => {
    openAcknowledgeModal();

    cy.get('app-acknowledge-modal input[name="repairCost"][value="free"]')
      .then(($el) => {
        ($el[0] as HTMLInputElement).checked = true;
        $el[0].dispatchEvent(new Event('change', { bubbles: true }));
      });

    cy.contains('app-acknowledge-modal span', 'ขอใช้บริการ').click();
    cy.contains('app-acknowledge-modal p', 'ประเภทค่าใช้จ่าย').should('not.exist');

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal input[name="repairCost"]').should('not.be.checked');
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  // ─── different ticket_type_id fixtures ────────────────────────────────────

  it('ticket_type_id=2 → modal pre-select tag แจ้งปัญหา', () => {
    cy.intercept('GET', '**/tickets/999', {
      ticket: { ...repairTicket, ticket_type_id: 2 },
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

    cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
    cy.wait('@getTicket999');
    cy.wait('@markTicketRead');
    cy.get('.btn.btn-accept').click();

    cy.contains('app-acknowledge-modal label.tag', 'แจ้งปัญหา')
      .find('input[name="tag"]')
      .should('be.checked');
  });

  it('ticket_type_id=3 → modal pre-select tag ขอใช้บริการ', () => {
    cy.intercept('GET', '**/tickets/999', {
      ticket: { ...repairTicket, ticket_type_id: 3 },
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

    cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
    cy.wait('@getTicket999');
    cy.wait('@markTicketRead');
    cy.get('.btn.btn-accept').click();

    cy.contains('app-acknowledge-modal label.tag', 'ขอใช้บริการ')
      .find('input[name="tag"]')
      .should('be.checked');
  });

  it('ticket_type_id=2 → switch to แจ้งซ่อม → ปุ่มแนบไฟล์แสดงขึ้น (isTagChanged=true)', () => {
    cy.intercept('GET', '**/tickets/999', {
      ticket: { ...repairTicket, ticket_type_id: 2 },
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

    cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
    cy.wait('@getTicket999');
    cy.wait('@markTicketRead');
    cy.get('.btn.btn-accept').click();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.get('app-acknowledge-modal .attach-btn').should('be.visible');
  });

  // ─── template fix: paid + no tag change ──────────────────────────────────

  it('เลือก paid → attach btn แสดงทันที แม้ไม่เปลี่ยน tag (isTagChanged=false)', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal .attach-btn').should('be.visible');
  });

  it('เลือก paid → warning "กรุณาแนบไฟล์" แสดงก่อนแนบไฟล์', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.contains('app-acknowledge-modal p', 'กรุณาแนบไฟล์ใบเสนอราคา').should('be.visible');
  });

  it('เลือก paid → แนบไฟล์ → warning หาย', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.contains('app-acknowledge-modal p', 'กรุณาแนบไฟล์ใบเสนอราคา').should('not.exist');
  });

  it('เลือก paid → แนบไฟล์ → ลบไฟล์ → ปุ่มยืนยัน disabled อีกครั้ง', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.get('app-acknowledge-modal .chip-remove').click();
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  it('เลือก paid → สลับ free → file section หาย', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal .attach-btn').should('be.visible');

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.get('app-acknowledge-modal .attach-btn').should('not.exist');
  });

  it('เลือก paid → textarea ไม่ปรากฏ (isTagChanged=false)', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal textarea').should('not.exist');
  });

  // ─── file chip display ────────────────────────────────────────────────────

  it('แนบไฟล์ → chip แสดงชื่อไฟล์', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('fake'),
        fileName: 'budget-quote.pdf',
        mimeType: 'application/pdf',
      },
      { force: true },
    );
    cy.get('app-acknowledge-modal .file-chip .file-name').should('contain', 'budget-quote.pdf');
  });

  it('แนบไฟล์ → ลบ chip → file chips ว่าง', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.get('app-acknowledge-modal .chip-remove').click();
    cy.get('app-acknowledge-modal .file-chip').should('not.exist');
  });

  // ─── multiple file attachments ────────────────────────────────────────────

  it('แนบ 2 ไฟล์ → 2 chips แสดง', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      [
        { contents: Cypress.Buffer.from('f1'), fileName: 'quote1.pdf', mimeType: 'application/pdf' },
        { contents: Cypress.Buffer.from('f2'), fileName: 'quote2.pdf', mimeType: 'application/pdf' },
      ],
      { force: true },
    );
    cy.get('app-acknowledge-modal .file-chip').should('have.length', 2);
  });

  it('แนบ 2 ไฟล์ → ลบ 1 → เหลือ 1 chip', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      [
        { contents: Cypress.Buffer.from('f1'), fileName: 'quote1.pdf', mimeType: 'application/pdf' },
        { contents: Cypress.Buffer.from('f2'), fileName: 'quote2.pdf', mimeType: 'application/pdf' },
      ],
      { force: true },
    );
    cy.get('app-acknowledge-modal .chip-remove').first().click();
    cy.get('app-acknowledge-modal .file-chip').should('have.length', 1);
  });

  // ─── warning reappears after file removal ────────────────────────────────

  it('เลือก paid → แนบไฟล์ → ลบไฟล์ → warning กลับมา', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.contains('app-acknowledge-modal p', 'กรุณาแนบไฟล์ใบเสนอราคา').should('not.exist');
    cy.get('app-acknowledge-modal .chip-remove').click();
    cy.contains('app-acknowledge-modal p', 'กรุณาแนบไฟล์ใบเสนอราคา').should('be.visible');
  });

  // ─── attachments persist on repairCostType toggle ────────────────────────

  it('แนบไฟล์ (paid) → สลับ free → กลับ paid → ไฟล์ยังคงอยู่', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal .file-chip').should('have.length', 1);
  });

  // ─── isTagChanged=true + paid ─────────────────────────────────────────────

  it('ticket_type_id=2 → switch แจ้งซ่อม + paid → warning "กรุณาแนบไฟล์" แสดง (isTagChanged=true)', () => {
    cy.intercept('GET', '**/tickets/999', {
      ticket: { ...repairTicket, ticket_type_id: 2 },
      attachments: [], replies: [], services: [], assignGroups: [],
      assignments: [], timeline: [], timelineAssignees: [], requester: null, requestFor: {},
    }).as('getTicket999');

    cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
    cy.wait('@getTicket999');
    cy.wait('@markTicketRead');
    cy.get('.btn.btn-accept').click();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.contains('app-acknowledge-modal p', 'กรุณาแนบไฟล์ใบเสนอราคา').should('be.visible');
  });

  it('ticket_type_id=2 → switch แจ้งซ่อม + paid + message → ยังไม่แนบไฟล์ → ปุ่ม disabled', () => {
    cy.intercept('GET', '**/tickets/999', {
      ticket: { ...repairTicket, ticket_type_id: 2 },
      attachments: [], replies: [], services: [], assignGroups: [],
      assignments: [], timeline: [], timelineAssignees: [], requester: null, requestFor: {},
    }).as('getTicket999');

    cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
    cy.wait('@getTicket999');
    cy.wait('@markTicketRead');
    cy.get('.btn.btn-accept').click();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal textarea').type('ต้องขออนุมัติ');
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  // ─── ticket_type_id=3 submit flow ────────────────────────────────────────

  it('ticket_type_id=3 → switch แจ้งซ่อม + free + message → PATCH ส่ง repairCostType=free + newTicketTypeId=1', () => {
    cy.intercept('GET', '**/tickets/999', {
      ticket: { ...repairTicket, ticket_type_id: 3 },
      attachments: [], replies: [], services: [], assignGroups: [],
      assignments: [], timeline: [], timelineAssignees: [], requester: null, requestFor: {},
    }).as('getTicket999');

    cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
    cy.wait('@getTicket999');
    cy.wait('@markTicketRead');
    cy.get('.btn.btn-accept').click();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.get('app-acknowledge-modal textarea').type('เปลี่ยนเป็นแจ้งซ่อม');
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket')
      .its('request.body')
      .should('include', 'repairCostType')
      .and('include', 'free')
      .and('include', 'newTicketTypeId')
      .and('include', '1');
  });

  // ─── onTagChange clears attachments ──────────────────────────────────────

  it('paid + แนบไฟล์ → เปลี่ยน tag → กลับ แจ้งซ่อม + paid → attachments ถูก clear', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.get('app-acknowledge-modal .file-chip').should('have.length', 1);

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal .file-chip').should('not.exist');
  });

  // ─── file preview modal ───────────────────────────────────────────────────

  it('แนบไฟล์ → click chip → file preview modal เปิด', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.get('app-acknowledge-modal .file-chip .file-name').click();
    cy.get('app-file-preview-modal').should('exist');
  });

  // ─── message whitespace trim ──────────────────────────────────────────────

  it('เปลี่ยน tag ไป แจ้งปัญหา → ใส่ message เป็น whitespace เท่านั้น → ปุ่มยืนยัน disabled', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'แจ้งปัญหา').click();
    cy.get('app-acknowledge-modal textarea').type('   ');
    cy.get('app-acknowledge-modal button[type="submit"]').should('be.disabled');
  });

  // ─── PATCH payload completeness ───────────────────────────────────────────

  it('submit free (no tag change) → PATCH ส่ง newTicketTypeId=1', () => {
    openAcknowledgeModal();

    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket')
      .its('request.body')
      .should('include', 'newTicketTypeId')
      .and('include', '1');
  });

  it('ticket_type_id=2 → แจ้งซ่อม + paid + message + file → PATCH ส่ง repairCostType=paid + newTicketTypeId=1', () => {
    cy.intercept('GET', '**/tickets/999', {
      ticket: { ...repairTicket, ticket_type_id: 2 },
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

    cy.contains('.ticket-item .ticket-number', '#IT-00999').closest('.ticket-item').click();
    cy.wait('@getTicket999');
    cy.wait('@markTicketRead');
    cy.get('.btn.btn-accept').click();

    cy.contains('app-acknowledge-modal span', 'แจ้งซ่อม').click();
    cy.contains('app-acknowledge-modal span', 'ดำเนินการตามปกติ').click();
    cy.contains('app-acknowledge-modal span', 'ขออนุมัติ Budget ต้นสังกัด').click();
    cy.get('app-acknowledge-modal textarea').type('ต้องขออนุมัติค่าซ่อม');
    cy.get('app-acknowledge-modal input[type="file"]').selectFile(
      { contents: Cypress.Buffer.from('fake'), fileName: 'quote.pdf', mimeType: 'application/pdf' },
      { force: true },
    );
    cy.get('app-acknowledge-modal button[type="submit"]').click();

    cy.wait('@approveTicket')
      .its('request.body')
      .should('include', 'repairCostType')
      .and('include', 'paid')
      .and('include', 'newTicketTypeId')
      .and('include', '1');
  });
});
