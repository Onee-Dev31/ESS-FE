const mockDeptHeads = [
  {
    cost_cent: '10806',
    name_cost_cent: 'IT Department',
    company_code: 'OTD',
    company_name: 'บริษัท เดอะ วัน เอ็นเตอร์ไพรส์ จำกัด (มหาชน)',
    heads: [{ level: 1, code: 'OTD01128', name: 'นายธราดล แก้วอนันต์', num_lvl: 8 }],
    employees: [
      { emp_code: 'OTD01128', emp_name: 'นายธราดล แก้วอนันต์', nickname: 'ธราดล', numlvl: 8 },
      { emp_code: 'FONE0015', emp_name: 'ปัณณพร จึงเปี่ยมสุข', nickname: 'เพียว', numlvl: 5 },
    ],
  },
  {
    cost_cent: '10807',
    name_cost_cent: 'HR Department',
    company_code: 'OTD',
    company_name: 'บริษัท เดอะ วัน เอ็นเตอร์ไพรส์ จำกัด (มหาชน)',
    heads: [{ level: 1, code: 'OTD00100', name: 'นางสาวสมหญิง ใจดี', num_lvl: 7 }],
    employees: [
      { emp_code: 'OTD00100', emp_name: 'นางสาวสมหญิง ใจดี', nickname: 'หญิง', numlvl: 7 },
    ],
  },
];

const mockOverrides = [
  {
    cost_cent: '10806',
    level: 1,
    codeempid: 'FONE0015',
    emp_name: 'ปัณณพร จึงเปี่ยมสุข',
    num_lvl: 5,
    reason: 'รักษาการแทน',
    created_by: 'OTD00001',
    created_at: '2026-05-14T10:00:00',
    updated_at: '2026-05-14T10:00:00',
  },
  {
    cost_cent: '10806',
    level: 2,
    codeempid: 'OTD01128',
    emp_name: 'นายธราดล แก้วอนันต์',
    num_lvl: 8,
    reason: 'รักษาการแทน',
    created_by: 'OTD00001',
    created_at: '2026-05-14T10:00:00',
    updated_at: '2026-05-14T10:00:00',
  },
];

const successDelete = { success: true, message: 'ลบ override สำเร็จ' };
const successSave = { success: true, message: 'บันทึก override สำเร็จ' };

describe('Dept Heads - Override Management', () => {
  beforeEach(() => {
    cy.intercept('GET', /localhost:7081.*\/dept-heads$/, {
      statusCode: 200,
      body: { success: true, data: mockDeptHeads },
    }).as('getDeptHeads');

    cy.intercept('GET', /localhost:7081.*\/dept-heads\/overrides/, {
      statusCode: 200,
      body: { success: true, data: mockOverrides },
    }).as('getOverrides');

    cy.login(undefined, undefined, {
      menus: [{ RoutePath: '/dept-heads' }, { RoutePath: '/dashboard' }],
    });
    cy.visit('/dept-heads');
    cy.wait('@getDeptHeads');
    cy.wait('@getOverrides');
  });

  // ==================== TAB NAVIGATION ====================

  it('แสดงหน้า dept-heads พร้อม tab bar', () => {
    cy.contains('หัวหน้าแผนก').should('be.visible');
    cy.get('.tab-bar').should('be.visible');
  });

  it('แสดง 3 tab ครบและถูกต้อง', () => {
    cy.get('.tab-btn').should('have.length', 3);
    cy.get('.tab-btn').eq(0).should('contain', 'รายชื่อหัวหน้าแผนก');
    cy.get('.tab-btn').eq(1).should('contain', 'Override รายแผนก');
    cy.get('.tab-btn').eq(2).should('contain', 'Override รายบุคคล');
  });

  it('tab รายชื่อหัวหน้าแผนก active เป็น default', () => {
    cy.get('.tab-btn').first().should('have.class', 'active');
    cy.get('.tab-btn').eq(1).should('not.have.class', 'active');
  });

  it('tab Override ไม่แสดง badge เมื่อ feature ปิดอยู่', () => {
    cy.get('.tab-badge').should('not.exist');
  });

  it('สลับไปแท็บ Override รายแผนก ได้', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.tab-btn').eq(1).should('have.class', 'active');
    cy.get('.content-card').should('be.visible');
  });

  it('สลับกลับแท็บ รายชื่อ ได้', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.tab-btn').first().click();
    cy.get('.tab-btn').first().should('have.class', 'active');
    cy.get('.override-modal-card').should('not.exist');
  });

  // ==================== LIST TAB ====================

  it('tab รายชื่อ แสดง column ตารางครบ', () => {
    cy.get('thead').should('contain', 'บริษัท');
    cy.get('thead').should('contain', 'แผนก');
    cy.get('thead').should('contain', 'หัวหน้าแผนก');
    cy.get('thead').should('contain', 'พนักงาน');
  });

  it('tab รายชื่อ แสดงข้อมูลแผนกจาก API', () => {
    cy.contains('IT Department').should('be.visible');
    cy.contains('HR Department').should('be.visible');
  });

  it('ค้นหาข้อความที่ไม่มีในระบบแล้ว empty state ปรากฏ', () => {
    cy.get('input[placeholder*="ชื่อ-นามสกุล"]').type('zzz_ไม่มีคนนี้แน่นอน');
    cy.get('.btn-search').first().click();
    cy.get('app-empty-state').should('be.visible');
  });

  it('กด clear แล้ว search input ล้างและข้อมูลกลับมา', () => {
    cy.get('input[placeholder*="ชื่อ-นามสกุล"]').type('zzz_ไม่มี');
    cy.get('.btn-search').first().click();
    cy.get('.btn-clear').first().click();
    cy.get('input[placeholder*="ชื่อ-นามสกุล"]').should('have.value', '');
    cy.contains('IT Department').should('be.visible');
  });

  it('pagination wrapper แสดงในแท็บ รายชื่อ', () => {
    cy.get('.pagination-wrapper').should('be.visible');
  });

  // ==================== OVERRIDE FORM (MODAL) ====================

  it('แท็บ Override แสดง content card พร้อม title ตาราง', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.content-card').should('be.visible');
    cy.get('.card-header-title').should('contain', 'Override ที่ตั้งไว้');
  });

  it('modal title แสดง "เพิ่ม Override" เมื่อเปิดจากปุ่มเพิ่ม', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.btn-search.btn-header-action').click();
    cy.get('.modal-title').should('contain', 'เพิ่ม Override');
    cy.get('.override-modal-card .btn-close').click();
  });

  it('กดบันทึกโดยไม่เลือกแผนกและพนักงาน แสดง Swal warning', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.btn-search.btn-header-action').click();
    cy.get('.override-modal-card .form-actions .btn-search').click();
    cy.get('.swal2-title').should('contain', 'กรุณากรอกข้อมูลให้ครบ');
    cy.get('.swal2-confirm').click();
    cy.get('.override-modal-card .btn-close').click();
  });

  it('เลือกแผนกที่มี override → form rows pre-fill ทุกระดับ', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.btn-search.btn-header-action').click();
    cy.get('.override-modal-card nz-select').first().click();
    cy.get('nz-option-item').contains('OTD').click();
    cy.get('.override-modal-card nz-select').last().click();
    cy.get('nz-option-item').contains('IT Department').click();
    cy.get('.form-rows .form-row-item').should('have.length', 2);
    cy.get('.level-num').eq(0).should('contain', 'ระดับ 1');
    cy.get('.level-num').eq(1).should('contain', 'ระดับ 2');
    cy.get('.override-modal-card .btn-close').click();
  });

  it('modal title เปลี่ยนเป็น "แก้ไข Override" เมื่อกด แก้ไขแผนกนี้', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.group-footer-row .btn-group-edit').first().click();
    cy.get('.modal-title').should('contain', 'แก้ไข Override');
    cy.get('.override-modal-card .btn-close').click();
  });

  it('กด + เพิ่มระดับ → row ใหม่ปรากฏพร้อม level ถัดไป', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.btn-search.btn-header-action').click();
    cy.get('.override-modal-card nz-select').first().click();
    cy.get('nz-option-item').contains('OTD').click();
    cy.get('.override-modal-card nz-select').last().click();
    cy.get('nz-option-item').contains('IT Department').click();
    cy.get('.form-row-item').should('have.length', 2);
    cy.get('.btn-add-row').click();
    cy.get('.form-row-item').should('have.length', 3);
    cy.get('.level-num').last().should('contain', 'ระดับ 3');
    cy.get('.override-modal-card .btn-close').click();
  });

  it('กด ยกเลิก → modal ปิดและ rows หาย', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.btn-search.btn-header-action').click();
    cy.get('.override-modal-card nz-select').first().click();
    cy.get('nz-option-item').contains('OTD').click();
    cy.get('.override-modal-card nz-select').last().click();
    cy.get('nz-option-item').contains('IT Department').click();
    cy.get('.form-row-item').should('have.length', 2);
    cy.get('.override-modal-card .form-actions .btn-clear').click();
    cy.get('.override-modal-card').should('not.exist');
  });

  // ==================== OVERRIDE TABLE ====================

  it('ตาราง override แสดง column ครบ', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.table-responsive thead')
      .should('contain', 'แผนก')
      .and('contain', 'ระดับ')
      .and('contain', 'หัวหน้างาน')
      .and('contain', 'อัปเดตล่าสุด');
  });

  it('ตาราง override group ตามแผนก แสดงทั้ง 2 ระดับ', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.override-group').should('have.length', 1);
    cy.contains('.override-group', 'IT Department').should('exist');
    cy.get('.level-badge').should('contain', 'ระดับ 1');
    cy.get('.level-badge').should('contain', 'ระดับ 2');
  });

  it('แต่ละ group มีปุ่ม แก้ไขแผนกนี้ และ ลบทั้งหมด', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.group-footer-row .btn-group-edit').first().scrollIntoView().should('contain', 'แก้ไขแผนกนี้');
    cy.get('.group-footer-row .btn-group-delete').first().scrollIntoView().should('contain', 'ลบทั้งหมด');
  });

  it('แต่ละ data row ในตารางมีปุ่มลบระดับ', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.override-group .btn-icon-delete').should('have.length.at.least', 2);
  });

  it('กด แก้ไขแผนกนี้ → modal เปิดพร้อม pre-fill rows', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.group-footer-row .btn-group-edit').first().click();
    cy.get('.form-row-item').should('have.length', 2);
    cy.get('.modal-title').should('contain', 'แก้ไข Override');
    cy.get('.override-modal-card .btn-close').click();
  });

  it('header-title แสดงจำนวนแผนกที่ override ถูกต้อง', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.card-header-title').should('contain', '1 แผนก');
  });

  // ==================== DELETE ====================

  it('ลบระดับ → confirm → DELETE /{costCent}/{level} ถูกเรียก', () => {
    cy.intercept('DELETE', '**/dept-heads/overrides/10806/1', {
      statusCode: 200,
      body: successDelete,
    }).as('deleteLevel');

    cy.get('.tab-btn').eq(1).click();
    cy.get('.override-group .btn-icon-delete').first().click();
    cy.get('.swal2-confirm').click();
    cy.wait('@deleteLevel');
  });

  it('ลบระดับ → cancel → Swal ปิดและข้อมูลยังคงอยู่', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.override-group .btn-icon-delete').first().click();
    cy.get('.swal2-container').should('be.visible');
    cy.get('.swal2-cancel').click();
    cy.get('.swal2-container').should('not.exist');
    cy.get('.override-group').should('exist');
  });

  it('ลบทั้งหมดของแผนก → confirm → DELETE /{costCent} ถูกเรียก', () => {
    cy.intercept('DELETE', '**/dept-heads/overrides/10806', {
      statusCode: 200,
      body: successDelete,
    }).as('deleteAll');

    cy.get('.tab-btn').eq(1).click();
    cy.get('.group-footer-row .btn-group-delete').click();
    cy.get('.swal2-confirm').click();
    cy.wait('@deleteAll');
  });

  it('ลบทั้งหมด → cancel → ข้อมูลในตารางยังคงอยู่', () => {
    cy.get('.tab-btn').eq(1).click();
    cy.get('.group-footer-row .btn-group-delete').click();
    cy.get('.swal2-cancel').click();
    cy.get('.swal2-container').should('not.exist');
    cy.get('.override-group').should('have.length', 1);
  });

  // ==================== SAVE ====================

  it('บันทึก override → PUT API ถูกเรียกพร้อม costCent และ level ถูกต้อง', () => {
    cy.intercept('PUT', '**/dept-heads/overrides', {
      statusCode: 200,
      body: successSave,
    }).as('saveOverride');

    cy.get('.tab-btn').eq(1).click();
    cy.get('.group-footer-row .btn-group-edit').first().click();
    cy.get('.override-modal-card .form-actions .btn-search').click();
    cy.wait('@saveOverride').then((interception) => {
      expect(interception.request.body.costCent).to.eq('10806');
      expect(interception.request.body.level).to.be.a('number');
      expect(interception.request.body.codeempid).to.be.a('string').and.not.be.empty;
    });
  });

  it('บันทึกสำเร็จ → Swal success ปรากฏ', () => {
    cy.intercept('PUT', '**/dept-heads/overrides', {
      statusCode: 200,
      body: successSave,
    }).as('saveOverride');

    cy.get('.tab-btn').eq(1).click();
    cy.get('.group-footer-row .btn-group-edit').first().click();
    cy.get('.override-modal-card .form-actions .btn-search').click();
    cy.wait('@saveOverride');
    cy.get('.swal2-title').should('contain', 'บันทึกสำเร็จ');
    cy.get('.swal2-confirm').click();
  });

  // ==================== EMPTY STATE ====================

  it('เมื่อไม่มี override เลย แสดง empty state ในตาราง', () => {
    cy.intercept('GET', /localhost:7081.*\/dept-heads\/overrides/, {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as('getEmptyOverrides');

    cy.visit('/dept-heads');
    cy.wait('@getDeptHeads');
    cy.wait('@getEmptyOverrides');

    cy.get('.tab-btn').eq(1).click();
    cy.get('app-empty-state').should('be.visible');
    cy.get('.tab-badge').should('not.exist');
  });
});
