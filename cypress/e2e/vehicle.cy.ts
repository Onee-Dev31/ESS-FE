const vehicleMenus = [
  { RoutePath: '/welcome' },
  { RoutePath: '/dashboard' },
  { RoutePath: '/allowance' },
  { RoutePath: '/vehicle' },
  { RoutePath: '/vehicle-taxi' },
];

describe('Vehicle', () => {
  beforeEach(() => {
    cy.login(undefined, undefined, { menus: vehicleMenus });
    cy.visit('/vehicle');
  });

  it('แสดงหน้า vehicle พร้อม toolbar และ list', () => {
    cy.contains('รายการเบิกค่าพาหนะ').should('be.visible');
    cy.get('.btn-create').should('be.visible');
  });

  it('เปิด modal สร้างรายการใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form').should('be.visible');
  });

  it('modal แสดง loading spinner หรือ content ขณะโหลดข้อมูล', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form').should('be.visible');
    cy.get('app-vehicle-form').then(($el) => {
      const hasLoader = $el.find('.loader').length > 0;
      const hasContent = $el.find('.content-card').length > 0;
      expect(hasLoader || hasContent).to.be.true;
    });
  });

  it('ปิด modal ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form').should('be.visible');
    cy.get('[title="ปิด"]').first().click();
    cy.get('app-vehicle-form').should('not.exist');
  });

  it('ปิด modal แล้วเปิดใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form').should('be.visible');
    cy.get('[title="ปิด"]').first().click();
    cy.get('app-vehicle-form').should('not.exist');

    cy.get('.btn-create').click();
    cy.get('app-vehicle-form').should('be.visible');
  });

  it('status nz-select dropdown มี option "ทั้งหมด", "คำขอใหม่", "อนุมัติแล้ว"', () => {
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').should('contain', 'ทั้งหมด');
    cy.get('nz-option-item').should('contain', 'คำขอใหม่');
    cy.get('nz-option-item').should('contain', 'อนุมัติแล้ว');
    cy.get('nz-select').first().click();
  });

  it('filter ตามสถานะได้', () => {
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').contains('อนุมัติแล้ว').click();
    cy.get('.btn-search').click();
    cy.wait(1000);
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

  it('ค้นหาไม่พบแล้วแสดง empty state', () => {
    cy.get('input[placeholder="Order No, Description"]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');
  });

  it('กดปุ่ม clear แล้วล้าง filter ได้', () => {
    cy.get('input[placeholder="Order No, Description"]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').contains('อนุมัติแล้ว').click();
    cy.get('.btn-search').click();

    cy.get('.btn-clear').click();

    cy.get('input[placeholder="Order No, Description"]').should('have.value', '');
    cy.get('.select-status').should('contain.text', 'ทั้งหมด');
  });

  it('table header แสดง column สำคัญครบ', () => {
    cy.get('thead').should('contain', 'จำนวนวัน');
    cy.get('thead').should('contain', 'ยอดเงิน');
    cy.get('thead').should('contain', 'สถานะ');
    cy.get('thead').should('contain', 'วันที่สร้างรายการ');
  });

  it('pagination wrapper แสดงขึ้นในหน้า vehicle', () => {
    cy.get('.pagination-wrapper').should('exist');
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

  it('กด edit เปิด modal พร้อมข้อมูลเดิมได้', () => {
    cy.get('.modern-table tbody tr').each(($row): false | void => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'คำขอใหม่' || statusText === 'New') {
        cy.wrap($row).find('.btn-icon.edit').click();
        cy.get('app-vehicle-form').should('be.visible');
        return false;
      }
    });
  });

  it('กดที่ row ใน table แล้วเปิด modal รายละเอียดได้', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.modern-table tbody tr').length > 0) {
        cy.get('.modern-table tbody tr').first().click();
        cy.get('app-vehicle-form').should('be.visible');
      } else {
        cy.get('app-empty-state').should('be.visible');
      }
    });
  });

  it('กดที่ card รายการแล้วเปิด modal รายละเอียดได้', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.claim-card').length > 0) {
        cy.get('.claim-card').first().click();
        cy.get('app-vehicle-form').should('be.visible');
      } else {
        cy.get('app-empty-state, .card-list-view').should('exist');
      }
    });
  });

  it('modal form มีปุ่ม btn-submit สำหรับยืนยันการเบิก', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form .loader').should('not.exist', { timeout: 5000 });
    cy.get('app-vehicle-form .btn-submit').should('exist');
  });

  it('modal form แสดง label ประจำเดือน เมื่อโหลดเสร็จ', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form .loader').should('not.exist', { timeout: 5000 });
    cy.contains('app-vehicle-form', 'ประจำเดือน').should('be.visible');
  });

  it('กดสร้างรายการจากหน้า list แล้วเปิด modal ได้เสมอหลังใช้งาน filter', () => {
    cy.get('input[placeholder="Order No, Description"]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');

    cy.get('.btn-clear').click();
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form').should('be.visible');
  });

  it('filter ตามสถานะ "คำขอใหม่" แล้วแสดงผลถูกต้อง', () => {
    cy.get('nz-select').first().click();
    cy.get('nz-option-item').contains('คำขอใหม่').click();
    cy.get('.btn-search').click();
    cy.wait(1000);
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

  it('ลบรายการสถานะ New แล้ว confirm dialog ปรากฏ', () => {
    cy.get('.modern-table tbody tr').each(($row): false | void => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'คำขอใหม่' || statusText === 'New') {
        cy.wrap($row).find('.btn-icon.delete').click();
        cy.get('.swal2-container').should('be.visible');
        cy.get('.swal2-cancel').click();
        return false;
      }
    });
  });

  it('modal form แสดง label ประจำเดือน และมีปุ่ม btn-submit หลัง loader หาย', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-form .loader').should('not.exist', { timeout: 5000 });
    cy.contains('app-vehicle-form', 'ประจำเดือน').should('be.visible');
    cy.get('app-vehicle-form .btn-submit').should('exist');
  });

  it('claim card แสดง type badge "เบิกค่าพาหนะ"', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.claim-card').length > 0) {
        cy.get('.claim-card').first().find('.claim-card__type-badge').should('contain', 'เบิกค่าพาหนะ');
      } else {
        cy.get('app-empty-state, .modern-table').should('exist');
      }
    });
  });

  it('claim card แสดงจำนวนวันในรายการ', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.claim-card').length > 0) {
        cy.get('.claim-card').first().find('.claim-card__main').invoke('text').should('match', /\d+\s*วัน/);
      } else {
        cy.get('app-empty-state, .modern-table').should('exist');
      }
    });
  });

  it('mobile viewport แสดงหน้า vehicle ถูกต้อง', () => {
    cy.viewport('iphone-6');
    cy.contains('รายการเบิกค่าพาหนะ').should('be.visible');
    cy.get('.btn-create').should('exist');
  });

  it('sort column header สองครั้งแล้ว sort icon เปลี่ยนเป็น desc', () => {
    cy.viewport(1800, 900);
    cy.get('body').then(($body) => {
      if ($body.find('thead .sortable-header').length > 0) {
        cy.get('thead .sortable-header').first().click();
        cy.get('thead .sortable-header').first().click();
        cy.get('thead .sortable-header').first().find('.fa-sort-amount-down-alt').should('exist');
      }
    });
  });

  it('vehicle page ไม่แสดง app-error-state เมื่อโหลดหน้าปกติ', () => {
    cy.get('app-error-state').should('not.exist');
  });

  it('tablet viewport แสดงหน้า vehicle ถูกต้อง', () => {
    cy.viewport('ipad-2');
    cy.contains('รายการเบิกค่าพาหนะ').should('be.visible');
    cy.get('.btn-create').should('exist');
  });

  it('claim card แสดงยอดเงิน', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.claim-card').length > 0) {
        cy.get('.claim-card').first().find('.amount-value').invoke('text').should('match', /฿[\d,.]+/);
      } else {
        cy.get('app-empty-state, .modern-table').should('exist');
      }
    });
  });

  it('label ตัวกรองวันที่ "วันที่เริ่มต้น-วันที่สิ้นสุด" แสดงขึ้น', () => {
    cy.contains('label', 'วันที่เริ่มต้น-วันที่สิ้นสุด').should('be.visible');
  });
});
