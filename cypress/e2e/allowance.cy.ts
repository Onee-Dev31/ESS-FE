describe('Allowance', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/allowance');
  });

  it('แสดงหน้า allowance พร้อม toolbar และ list', () => {
    cy.contains('รายการเบิกเบี้ยเลี้ยง').should('be.visible');
    cy.get('.btn-create').should('be.visible');
  });

  it('เปิด modal สร้างรายการใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-allowance-form').should('be.visible');
  });

  it('ปิด modal ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-allowance-form').should('be.visible');
    cy.get('.btn-close, .close-btn, [title="ปิด"]').first().click();
    cy.get('app-allowance-form').should('not.exist');
  });

  it('item สถานะ New มีปุ่ม edit และ delete', () => {
    cy.get('.modern-table tbody tr').each(($row) => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'คำขอใหม่' || statusText === 'New') {
        cy.wrap($row).find('.btn-icon.edit').should('exist');
        cy.wrap($row).find('.btn-icon.delete').should('exist');
      }
    });
  });

  it('item สถานะ Approved ไม่มีปุ่ม edit และ delete', () => {
    cy.get('.modern-table tbody tr').each(($row) => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'อนุมัติแล้ว' || statusText === 'Approved') {
        cy.wrap($row).find('.btn-icon.edit').should('not.exist');
        cy.wrap($row).find('.btn-icon.delete').should('not.exist');
      }
    });
  });

  it('กด edit เปิด modal พร้อมข้อมูลเดิม', () => {
    cy.get('.modern-table tbody tr').each(($row): false | void => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'คำขอใหม่' || statusText === 'New') {
        cy.wrap($row).find('.btn-icon.edit').click();
        cy.get('app-allowance-form').should('be.visible');
        return false;
      }
    });
  });

  it('filter ตามสถานะได้', () => {
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').contains('อนุมัติแล้ว').click();
    cy.get('.btn-search').click();
    cy.wait(1000);
    // ถ้ามีข้อมูล ต้องเป็นสถานะ Approved ทั้งหมด / ถ้าไม่มีข้อมูลให้แสดง empty state
    cy.get('body').then(($body) => {
      if ($body.find('.status-badge').length > 0) {
        cy.get('.status-badge').each(($badge) => {
          cy.wrap($badge)
            .invoke('text')
            .invoke('trim')
            .should('match', /อนุมัติแล้ว|Approved/);
        });
      } else {
        cy.get('app-empty-state').should('be.visible');
      }
    });
  });

  it('ค้นหาแล้ว list เปลี่ยนได้', () => {
    cy.get('input[placeholder="Order No, Description"]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');
  });

  it('กดปุ่ม clear แล้วล้าง status และ search filter ได้', () => {
    cy.get('input[placeholder="Order No, Description"]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').contains('อนุมัติแล้ว').click();
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');

    cy.get('.btn-clear').click();

    cy.get('input[placeholder="Order No, Description"]').should('have.value', '');
    cy.get('.select-status').should('contain.text', 'ทั้งหมด');
    cy.get('body').then(($body) => {
      const visibleRows = $body
        .find('.modern-table tbody tr')
        .filter((_, el) => Cypress.$(el).is(':visible'));

      if (visibleRows.length > 0) {
        cy.wrap(visibleRows).should('have.length.at.least', 1);
      } else {
        cy.get('app-empty-state:visible').should('exist');
      }
    });
  });

  it('กดปุ่มสร้างรายการจากหน้า list แล้วเปิด modal ได้เสมอหลังใช้งาน filter', () => {
    cy.get('input[placeholder="Order No, Description"]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');

    cy.get('.btn-clear').click();
    cy.get('.btn-create').click();

    cy.get('app-allowance-form').should('be.visible');
  });

  it('เปิด modal แก้ไขจากรายการสถานะ New ได้ต่อเนื่องหลัง filter แล้ว clear', () => {
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').contains('คำขอใหม่').click();
    cy.get('.btn-search').click();

    cy.get('.btn-clear').click();

    cy.get('.modern-table tbody tr').each(($row): false | void => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'คำขอใหม่' || statusText === 'New') {
        cy.wrap($row).find('.btn-icon.edit').click({ force: true });
        cy.get('app-allowance-form').should('be.visible');
        return false;
      }
    });
  });

  it('table header แสดง column สำคัญครบ', () => {
    cy.get('thead').should('contain', 'รายการ');
    cy.get('thead').should('contain', 'ยอดเงิน');
    cy.get('thead').should('contain', 'สถานะ');
    cy.get('thead').should('contain', 'วันที่สร้างรายการ');
  });

  it('pagination wrapper แสดงขึ้นในหน้า allowance', () => {
    cy.get('.pagination-wrapper').should('exist');
  });

  it('ปิด modal แล้วเปิดใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-allowance-form').should('be.visible');

    cy.get('app-allowance-form .btn-close-modal').click();
    cy.get('app-allowance-form').should('not.exist');

    cy.get('.btn-create').click();
    cy.get('app-allowance-form').should('be.visible');
  });

  it('modal form แสดง label ประจำเดือน เมื่อเปิดขึ้นมา', () => {
    cy.get('.btn-create').click();
    cy.get('app-allowance-form').should('be.visible');
    cy.contains('app-allowance-form', 'ประจำเดือน').should('be.visible');
  });

  it('กดที่ card รายการแล้วเปิด modal รายละเอียดได้', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.claim-card').length > 0) {
        cy.get('.claim-card').first().click();
        cy.get('app-allowance-form').should('be.visible');
      } else {
        cy.get('app-empty-state, .card-list-view').should('exist');
      }
    });
  });

  it('status nz-select dropdown มี option "ทั้งหมด", "คำขอใหม่", "อนุมัติแล้ว"', () => {
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').should('contain', 'ทั้งหมด');
    cy.get('nz-option-item').should('contain', 'คำขอใหม่');
    cy.get('nz-option-item').should('contain', 'อนุมัติแล้ว');
    cy.get('nz-select').first().click();
  });

  it('modal form สร้างใหม่มีปุ่ม btn-submit สำหรับยืนยันการเบิก', () => {
    cy.get('.btn-create').click();
    cy.get('app-allowance-form').should('be.visible');
    cy.get('app-allowance-form .btn-submit').should('exist');
  });

  it('modal form แสดง column header วันที่ และ จำนวนเงิน', () => {
    cy.get('.btn-create').click();
    cy.get('app-allowance-form').should('be.visible');
    cy.contains('app-allowance-form', 'วันที่').should('be.visible');
    cy.contains('app-allowance-form', 'จำนวนเงิน').should('be.visible');
  });
});
