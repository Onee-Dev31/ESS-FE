const vehicleTaxiMenus = [
  { RoutePath: '/welcome' },
  { RoutePath: '/dashboard' },
  { RoutePath: '/allowance' },
  { RoutePath: '/vehicle' },
  { RoutePath: '/vehicle-taxi' },
];

describe('Vehicle Taxi', () => {
  beforeEach(() => {
    cy.login(undefined, undefined, { menus: vehicleTaxiMenus });
    cy.visit('/vehicle-taxi');
  });

  it('แสดงหน้า vehicle-taxi พร้อม toolbar และ list', () => {
    cy.contains('รายการเบิกค่าพาหนะ (Taxi)').should('be.visible');
    cy.get('.btn-create').should('be.visible');
  });

  it('เปิด modal สร้างรายการใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form').should('be.visible');
  });

  it('modal แสดง loading spinner หรือ content ขณะโหลดข้อมูล', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form').should('be.visible');
    cy.get('app-vehicle-taxi-form').then(($el) => {
      const hasLoader = $el.find('.loader').length > 0;
      const hasContent = $el.find('.content-card').length > 0;
      expect(hasLoader || hasContent).to.be.true;
    });
  });

  it('ปิด modal ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form').should('be.visible');
    cy.get('[title="ปิดหน้าต่าง"]').first().click();
    cy.get('app-vehicle-taxi-form').should('not.exist');
  });

  it('ปิด modal แล้วเปิดใหม่ได้', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form').should('be.visible');
    cy.get('[title="ปิดหน้าต่าง"]').first().click();
    cy.get('app-vehicle-taxi-form').should('not.exist');

    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form').should('be.visible');
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
    cy.get('thead').should('contain', 'จำนวนรายการ');
    cy.get('thead').should('contain', 'ยอดเงิน');
    cy.get('thead').should('contain', 'สถานะ');
    cy.get('thead').should('contain', 'วันที่สร้างรายการ');
  });

  it('pagination wrapper แสดงขึ้นในหน้า vehicle-taxi', () => {
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

  it('กดที่ row ใน table แล้วเปิด modal รายละเอียดได้', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.modern-table tbody tr').length > 0) {
        cy.get('.modern-table tbody tr').first().click();
        cy.get('app-vehicle-taxi-form').should('be.visible');
      } else {
        cy.get('app-empty-state').should('be.visible');
      }
    });
  });

  it('กดที่ card รายการแล้วเปิด modal รายละเอียดได้', () => {
    cy.get('body').then(($body) => {
      if ($body.find('.claim-card').length > 0) {
        cy.get('.claim-card').first().click();
        cy.get('app-vehicle-taxi-form').should('be.visible');
      } else {
        cy.get('app-empty-state, .card-list-view').should('exist');
      }
    });
  });

  it('modal form มีปุ่ม btn-submit สำหรับยืนยันการเบิก', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form .loader').should('not.exist', { timeout: 5000 });
    cy.get('app-vehicle-taxi-form .btn-submit').should('exist');
  });

  it('modal form แสดง label ประจำเดือน เมื่อโหลดเสร็จ', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form .loader').should('not.exist', { timeout: 5000 });
    cy.contains('app-vehicle-taxi-form', 'ประจำเดือน').should('be.visible');
  });

  it('กดสร้างรายการจากหน้า list แล้วเปิด modal ได้เสมอหลังใช้งาน filter', () => {
    cy.get('input[placeholder="Order No, Description"]').type('ไม่มีข้อมูลนี้แน่นอน_xyz');
    cy.get('.btn-search').click();
    cy.get('app-empty-state').should('be.visible');

    cy.get('.btn-clear').click();
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form').should('be.visible');
  });

  it('กด edit เปิด modal พร้อมข้อมูลเดิมได้', () => {
    cy.get('.modern-table tbody tr').each(($row): false | void => {
      const statusText = $row.find('.status-badge').text().trim();
      if (statusText === 'คำขอใหม่' || statusText === 'New') {
        cy.wrap($row).find('.btn-icon.edit').click();
        cy.get('app-vehicle-taxi-form').should('be.visible');
        return false;
      }
    });
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

  it('modal form แสดง label ประจำเดือน และมีปุ่ม btn-submit หลัง loader หาย', () => {
    cy.get('.btn-create').click();
    cy.get('app-vehicle-taxi-form .loader').should('not.exist', { timeout: 5000 });
    cy.contains('app-vehicle-taxi-form', 'ประจำเดือน').should('be.visible');
    cy.get('app-vehicle-taxi-form .btn-submit').should('exist');
  });
});
