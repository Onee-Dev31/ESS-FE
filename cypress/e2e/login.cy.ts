describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('แสดงหน้า login ครบถ้วน', () => {
    cy.get('#username').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('.login-button').should('be.visible').and('contain', 'Login');
  });

  it('ปุ่ม Login disabled เมื่อยังไม่กรอกข้อมูล', () => {
    cy.get('.login-button').should('be.disabled');
  });

  it('login สำเร็จแล้ว redirect ออกจากหน้า login', () => {
    cy.mockLoginApi();
    cy.get('#username').type(Cypress.env('username'));
    cy.get('#password').type(Cypress.env('password'));
    cy.get('.login-button').click();
    cy.wait('@loginRequest');
    cy.url().should('not.include', '/login');
  });

  it('login ผิด password ต้องไม่ redirect ออกจากหน้า login', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('loginFailure');
    cy.get('#username').type(Cypress.env('username'));
    cy.get('#password').type('wrong_password_xyz');
    cy.get('.login-button').click();
    cy.wait('@loginFailure');
    cy.url().should('include', '/login');
  });

  it('login สำเร็จแล้ว redirect ไป returnUrl เมื่อมี query param', () => {
    cy.mockLoginApi();
    cy.visit('/login?returnUrl=%2Fallowance');
    cy.get('#username').type(Cypress.env('username'));
    cy.get('#password').type(Cypress.env('password'));
    cy.get('.login-button').click();
    cy.wait('@loginRequest');
    cy.url().should('include', '/allowance');
  });

  it('toggle แสดง/ซ่อน password ได้', () => {
    cy.get('#password').should('have.attr', 'type', 'password');
    cy.get('.password-toggle').click();
    cy.get('#password').should('have.attr', 'type', 'text');
    cy.get('.password-toggle').click();
    cy.get('#password').should('have.attr', 'type', 'password');
  });

  it('สลับไป QR login แล้วกลับมาได้', () => {
    cy.intercept('GET', '**/auth/qr/generate', {
      qrToken: 'qr-token-1',
      qrImage: 'data:image/png;base64,fake-qr',
      expiresAt: '2026-04-24T09:00:00.000Z',
    }).as('generateQr');

    cy.get('.qr-toggle-button').click();
    cy.wait('@generateQr');
    cy.get('.qr-section').should('be.visible');
    cy.get('.qr-image').should('be.visible');
    cy.get('.qr-back-button').click();
    cy.get('#username').should('be.visible');
  });

  it('QR หมดอายุแล้วสามารถกดรีเฟรชเพื่อโหลด QR ใหม่ได้', () => {
    let qrLoadCount = 0;

    cy.intercept('GET', '**/auth/qr/generate', () => {
      qrLoadCount += 1;
      return {
        qrToken: `qr-token-${qrLoadCount}`,
        qrImage: `data:image/png;base64,fake-qr-${qrLoadCount}`,
        expiresAt: '2026-04-24T09:00:00.000Z',
      };
    }).as('generateQr');

    cy.intercept('GET', '**/auth/qr/status/*', {
      status: 'expired',
    }).as('qrStatusExpired');

    cy.clock();
    cy.get('.qr-toggle-button').click();
    cy.wait('@generateQr');
    cy.get('.qr-image').should('be.visible').invoke('attr', 'src').as('firstQrSrc');

    cy.tick(3000);
    cy.wait('@qrStatusExpired');
    cy.contains('.qr-expired', 'QR หมดอายุแล้ว').should('be.visible');

    cy.contains('.qr-refresh-button', 'รีเฟรช QR').click();
    cy.wait('@generateQr');
    cy.get('@firstQrSrc').then((firstQrSrc) => {
      cy.get('.qr-image')
        .should('be.visible')
        .invoke('attr', 'src')
        .should((refreshedSrc) => {
          expect(refreshedSrc).to.be.a('string').and.not.equal(firstQrSrc);
        });
    });
  });
});
