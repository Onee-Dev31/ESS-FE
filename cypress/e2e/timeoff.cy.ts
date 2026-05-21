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

  it('table header แสดง column สำคัญครบ', () => {
    cy.get('thead').should('contain', 'รหัสคำขอ');
    cy.get('thead').should('contain', 'ประเภทการลา');
    cy.get('thead').should('contain', 'สถานะ');
    cy.get('thead').should('contain', 'Actions');
  });

  it('คลิก column header sort แล้ว sort icon เปลี่ยนเป็น asc', () => {
    cy.viewport(1800, 900);
    cy.get('thead .sortable-header').first().find('.fa-sort').should('exist');
    cy.get('thead .sortable-header').first().click();
    cy.get('thead .sortable-header')
      .first()
      .find('.fa-sort-amount-up, .fa-sort-amount-down-alt')
      .should('exist');
    cy.get('thead .sortable-header').first().find('.fa-sort').should('not.exist');
  });

  it('pagination wrapper แสดงขึ้นในหน้า timeoff', () => {
    cy.get('.pagination-wrapper').should('exist');
  });

  it('ปิด form modal แล้วเปิดใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-time-off-form').should('be.visible');

    cy.get('app-time-off-form .btn-close-modal').click();
    cy.get('app-time-off-form').should('not.exist');

    cy.get('.btn-create').click();
    cy.get('app-time-off-form').should('be.visible');
  });

  it('status filter dropdown มี option สถานะที่ถูกต้อง', () => {
    cy.get('.select-status').should('contain', 'คำขอใหม่');
    cy.get('.select-status').should('contain', 'อนุมัติแล้ว');
    cy.get('.select-status').should('contain', 'อยู่ระหว่างการอนุมัติ');
  });

  it('date filter แสดง 2 input ช่อง สำหรับเลือกวันที่', () => {
    cy.get('.date-input-group .form-control').should('have.length', 2);
    cy.get('.date-input-group .form-control').first().should('have.attr', 'type', 'date');
    cy.get('.date-input-group .form-control').last().should('have.attr', 'type', 'date');
  });

  it('click sort column header สองครั้งแล้ว sort icon เปลี่ยนเป็น desc', () => {
    cy.viewport(1800, 900);
    cy.get('thead .sortable-header').first().click();
    cy.get('thead .sortable-header').first().click();
    cy.get('thead .sortable-header').first().find('.fa-sort-amount-down-alt').should('exist');
    cy.get('thead .sortable-header').first().find('.fa-sort').should('not.exist');
  });

  it('form มีปุ่ม ส่งใบลา สำหรับยืนยันการลา', () => {
    cy.get('.btn-create').click();
    cy.get('app-time-off-form .btn-save-custom').should('exist');
  });

  it('form แสดง section heading "เลือกประเภทการลา" เมื่อเปิด modal', () => {
    cy.get('.btn-create').click();
    cy.get('app-time-off-form').should('be.visible');
    cy.get('app-time-off-form .section-heading').first().should('contain', 'เลือกประเภทการลา');
  });

  it('filter ตามสถานะ APPROVED แล้วแสดงเฉพาะรายการที่อนุมัติแล้ว', () => {
    cy.get('.select-status').select('APPROVED');
    cy.wait(500);
    cy.get('body').then(($body) => {
      if ($body.find('.status-badge').length > 0) {
        cy.get('.status-badge').each(($badge) => {
          cy.wrap($badge).invoke('text').invoke('trim').should('match', /อนุมัติแล้ว|Approved/);
        });
      } else {
        cy.get('app-empty-state').should('be.visible');
      }
    });
  });

  it('date filter สามารถกรอก start และ end date ได้', () => {
    cy.get('.date-input-group .form-control')
      .first()
      .invoke('val', '2025-01-01')
      .trigger('change')
      .should('have.value', '2025-01-01');
    cy.get('.date-input-group .form-control')
      .last()
      .invoke('val', '2025-12-31')
      .trigger('change')
      .should('have.value', '2025-12-31');
  });

  it('filter ตามสถานะ NEW แล้วแสดงเฉพาะรายการใหม่', () => {
    cy.get('.select-status').select('NEW');
    cy.wait(500);
    cy.get('body').then(($body) => {
      if ($body.find('.status-badge').length > 0) {
        cy.get('.status-badge').each(($badge) => {
          cy.wrap($badge).invoke('text').invoke('trim').should('match', /คำขอใหม่|New/);
        });
      } else {
        cy.get('app-empty-state').should('be.visible');
      }
    });
  });

  it('filter ตามสถานะ PENDING_APPROVAL แล้วแสดงเฉพาะรายการที่รออนุมัติ', () => {
    cy.get('.select-status').select('PENDING_APPROVAL');
    cy.wait(500);
    cy.get('body').then(($body) => {
      if ($body.find('.status-badge').length > 0) {
        cy.get('.status-badge').each(($badge) => {
          cy.wrap($badge).invoke('text').invoke('trim').should('match', /อยู่ระหว่างการอนุมัติ|Pending/);
        });
      } else {
        cy.get('app-empty-state').should('be.visible');
      }
    });
  });

  it('ลบรายการสถานะ New แล้ว confirm dialog ปรากฏ', () => {
    cy.get('.modern-table tbody tr').each(($row): false | void => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'คำขอใหม่' || statusText === 'New') {
        cy.wrap($row).find('.btn-icon.delete').click({ force: true });
        cy.get('.dialog-overlay').should('be.visible');
        cy.get('.btn-cancel').click();
        return false;
      }
    });
  });

  it('mobile viewport ยังแสดง btn-create', () => {
    cy.viewport('iphone-6');
    cy.get('.btn-create').should('exist');
  });

  it('ค้นหาแล้วกด clear แล้วค้นหาใหม่ได้', () => {
    cy.get('.search-input-group .form-control').type('ไม่พบ_xyz');
    cy.get('app-empty-state').should('be.visible');
    cy.get('.btn-clear').click();
    cy.get('.search-input-group .form-control').should('have.value', '');
    cy.get('.search-input-group .form-control').type('ไม่พบอีกครั้ง_abc');
    cy.get('app-empty-state').should('be.visible');
  });

  it('timeoff page ไม่แสดง app-error-state เมื่อโหลดหน้าปกติ', () => {
    cy.get('app-error-state').should('not.exist');
  });

  it('form มี section heading อย่างน้อย 1 รายการ เมื่อเปิด modal', () => {
    cy.get('.btn-create').click();
    cy.get('app-time-off-form').should('be.visible');
    cy.get('app-time-off-form .section-heading').should('have.length.at.least', 1);
  });
});
