Cypress.Commands.add('login', (username?: string, password?: string) => {
  cy.visit('/login');
  cy.get('#username').type(username ?? Cypress.env('username'));
  cy.get('#password').type(password ?? Cypress.env('password'));
  cy.get('.login-button').click();
  cy.url().should('not.include', '/login');
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>;
    }
  }
}
