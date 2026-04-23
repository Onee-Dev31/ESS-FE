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

  it('toggle แสดง/ซ่อน password ได้', () => {
    cy.get('#password').should('have.attr', 'type', 'password');
    cy.get('.password-toggle').click();
    cy.get('#password').should('have.attr', 'type', 'text');
    cy.get('.password-toggle').click();
    cy.get('#password').should('have.attr', 'type', 'password');
  });

  it('สลับไป QR login แล้วกลับมาได้', () => {
    cy.get('.qr-toggle-button').click();
    cy.get('.qr-section').should('be.visible');
    cy.get('.qr-back-button').click();
    cy.get('#username').should('be.visible');
  });
});
