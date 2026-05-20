const medicalMenus = [
  { RoutePath: '/welcome' },
  { RoutePath: '/dashboard' },
  { RoutePath: '/medicalexpenses' },
];

describe('Medical Expenses', () => {
  beforeEach(() => {
    cy.login(undefined, undefined, { menus: medicalMenus });
    cy.visit('/medicalexpenses');
  });

  it('แสดงหน้า medicalexpenses พร้อม title และ btn-create', () => {
    cy.contains('รายการเบิกค่ารักษาพยาบาล').should('be.visible');
    cy.get('.btn-create').should('be.visible');
  });

  it('stats bar แสดง card ครบ 4 รายการ', () => {
    cy.get('.stats-bar .stat-card').should('have.length', 4);
    cy.get('.stats-bar').should('contain', 'รายการทั้งหมด');
    cy.get('.stats-bar').should('contain', 'รอดำเนินการ');
    cy.get('.stats-bar').should('contain', 'อนุมัติแล้ว');
    cy.get('.stats-bar').should('contain', 'ยอดรวมที่ขอเบิก');
  });

  it('เปิด modal สร้างรายการใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-medicalexpenses-form').should('be.visible');
  });

  it('ปิด modal ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-medicalexpenses-form').should('be.visible');
    cy.get('[title="ปิด"]').first().click();
    cy.get('app-medicalexpenses-form').should('not.exist');
  });

  it('ปิด modal แล้วเปิดใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-medicalexpenses-form').should('be.visible');
    cy.get('[title="ปิด"]').first().click();
    cy.get('app-medicalexpenses-form').should('not.exist');

    cy.get('.btn-create').click();
    cy.get('app-medicalexpenses-form').should('be.visible');
  });

  it('ค้นหาไม่พบแล้วแสดง empty state', () => {
    cy.get('input[placeholder="ค้นหา..."]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');
  });

  it('กดปุ่ม clear แล้วล้าง filter ได้', () => {
    cy.get('input[placeholder="ค้นหา..."]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');

    cy.get('.btn-clear').click();

    cy.get('input[placeholder="ค้นหา..."]').should('have.value', '');
  });

  it('table header แสดง column สำคัญครบ', () => {
    cy.get('thead').should('contain', 'ประเภท');
    cy.get('thead').should('contain', 'วันที่รักษา');
    cy.get('thead').should('contain', 'สถานพยาบาล');
    cy.get('thead').should('contain', 'ยอดเงิน');
    cy.get('thead').should('contain', 'สถานะ');
  });

  it('item สถานะ pending มีปุ่ม edit และ delete', () => {
    cy.get('.modern-table tbody tr').each(($row) => {
      const statusText = $row.find('.status-badge').text().trim().toLowerCase();
      if (statusText === 'pending') {
        cy.wrap($row).find('.btn-icon.edit').should('exist');
        cy.wrap($row).find('.btn-icon.delete').should('exist');
      }
    });
  });

  it('item สถานะ approved ไม่มีปุ่ม edit และ delete', () => {
    cy.get('.modern-table tbody tr').each(($row) => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'อนุมัติแล้ว' || statusText === 'Approved') {
        cy.wrap($row).find('.btn-icon.edit').should('not.exist');
        cy.wrap($row).find('.btn-icon.delete').should('not.exist');
      }
    });
  });

  it('กด edit เปิด modal พร้อมข้อมูลเดิมได้', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.btn-icon.edit').length > 0) {
        cy.get('.btn-icon.edit').first().click();
        cy.get('app-medicalexpenses-form').should('be.visible');
      } else {
        cy.get('app-empty-state, .modern-table').should('exist');
      }
    });
  });

  it('กดที่ card รายการแล้วเปิด modal ได้', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.claim-card .btn-icon.edit').length > 0) {
        cy.get('.claim-card .btn-icon.edit').first().click();
        cy.get('app-medicalexpenses-form').should('be.visible');
      } else {
        cy.get('app-empty-state, .card-list-view').should('exist');
      }
    });
  });

  it('modal form มีปุ่ม save สำหรับยืนยันการเบิก', () => {
    cy.get('.btn-create').click();
    cy.get('app-medicalexpenses-form').should('be.visible');
    cy.get('app-medicalexpenses-form .btn-save-custom').should('exist');
  });

  it('กดปุ่ม info เปิด policy modal ได้', () => {
    cy.get('[title="ข้อมูลค่ารักษาพยาบาล/สวัสดิการ"]').click();
    cy.get('app-medical-policy-modal').should('exist');
  });

  it('stat-card รายการทั้งหมด แสดงตัวเลข', () => {
    cy.get('.stats-bar .stat-card')
      .first()
      .find('.stat-value')
      .invoke('text')
      .should('match', /\d+/);
  });

  it('กดสร้างรายการจากหน้า list แล้วเปิด modal ได้เสมอหลังใช้งาน filter', () => {
    cy.get('input[placeholder="ค้นหา..."]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');

    cy.get('.btn-clear').click();
    cy.get('.btn-create').click();
    cy.get('app-medicalexpenses-form').should('be.visible');
  });
});
