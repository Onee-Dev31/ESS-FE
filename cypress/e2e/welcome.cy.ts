describe('Welcome', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/welcome');
  });

  it('แสดงหน้า welcome ครบถ้วน', () => {
    cy.get('.welcome-title').should('be.visible').and('contain', 'Welcome to ESS');
    cy.contains('.subtitle', 'ระบบจัดการข้อมูลพนักงาน').should('be.visible');
    cy.contains('.instruction', 'กรุณาเลือกเมนูจากแถบด้านซ้ายเพื่อเริ่มต้นใช้งาน').should(
      'be.visible',
    );
    cy.get('.arrow-indicator').should('be.visible');
  });

  it('กดลูกศรแล้วนำทางไปหน้า dashboard', () => {
    cy.get('.arrow-indicator').click();
    cy.url().should('include', '/dashboard');
  });
});
