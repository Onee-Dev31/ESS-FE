describe('Timeoff', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/timeoff');
  });

  it('แสดงหน้า timeoff พร้อม toolbar และรายการ', () => {
    cy.contains('รายการลาของฉัน').should('be.visible');
    cy.get('.btn-create').should('be.visible');
    cy.get('.search-input-group .form-control').should('be.visible');
  });

  it('เปิดฟอร์มสร้างรายการลาใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-time-off-form').should('be.visible');
  });

  it('ค้นหาไม่เจอแล้วแสดง empty state ได้', () => {
    cy.get('.search-input-group .form-control').type('ไม่พบแน่นอน_xyz');
    cy.get('app-empty-state').should('be.visible');
  });

  it('กดคืนค่าแล้วล้าง search และ status filter ได้', () => {
    cy.get('.search-input-group .form-control').type('ไม่พบแน่นอน_xyz');
    cy.get('.select-status').select('APPROVED');
    cy.get('app-empty-state').should('be.visible');

    cy.get('.btn-clear').click();

    cy.get('.search-input-group .form-control').should('have.value', '');
    cy.get('.select-status').should('have.value', '');
    cy.get('.modern-table tbody').should('have.length.at.least', 1);
  });

  it('เปิด preview เอกสารแนบได้', () => {
    cy.get('button[title="ดูเอกสารแนบ"], .action-btn.folder').first().click({ force: true });
    cy.get('.file-preview-modal-overlay').should('be.visible');
    cy.contains('.preview-card h3', 'รายการไฟล์แนบ').should('be.visible');
  });

  it('เปิดฟอร์มจากปุ่ม action ของรายการได้', () => {
    cy.get('.modern-table tbody').each(($tbody): false | void => {
      const hasEdit = $tbody.find('.btn-icon.edit').length > 0;
      const hasDetailView = $tbody.find('button[title="ดูรายละเอียด"]').length > 0;

      if (hasEdit) {
        cy.wrap($tbody).find('.btn-icon.edit').first().click({ force: true });
        cy.get('app-time-off-form').should('be.visible');
        return false;
      }

      if (hasDetailView) {
        cy.wrap($tbody).find('button[title="ดูรายละเอียด"]').first().click({ force: true });
        cy.get('app-time-off-form').should('be.visible');
        return false;
      }
    });
  });
});
