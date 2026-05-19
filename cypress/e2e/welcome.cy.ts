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
  });

  it('แสดง divider และ illustration ครบถ้วน', () => {
    cy.get('.illustration-container').should('be.visible');
    cy.get('.divider').should('exist');
  });

  it('illustration container และ emoji แสดงขึ้น', () => {
    cy.get('.illustration-container').should('be.visible');
    cy.get('.emoji').should('be.visible').and('contain', '💼');
  });

  it('divider แสดงระหว่าง subtitle และ instruction', () => {
    cy.get('.divider').should('exist');
  });
});
