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

  it('illustration container และ emoji แสดงขึ้น', () => {
    cy.get('.illustration-container').should('be.visible');
    cy.get('.emoji').should('be.visible').and('contain', '💼');
  });

  it('divider แสดงระหว่าง subtitle และ instruction', () => {
    cy.get('.divider').should('exist');
  });

  it('sidebar หรือ nav menu แสดงขึ้นหลัง login', () => {
    cy.get('.sidebar, nav, app-sidenav, .sidenav').should('be.visible');
  });

  it('URL เป็น /welcome และไม่ redirect ไปที่อื่น', () => {
    cy.url().should('include', '/welcome');
  });

  it('unauthenticated user เข้า /welcome แล้ว redirect ไปหน้า login', () => {
    cy.clearLocalStorage();
    cy.visit('/welcome');
    cy.url().should('include', '/login');
  });
});
