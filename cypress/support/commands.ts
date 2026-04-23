export {};

const defaultLoginResponse = {
  adUser: 'NoppornEam',
  accessToken: 'fake-access-token',
  permission: {
    Role: 'Employee',
  },
  employee: {
    CODEMPID: 'OTD01072',
    USR_MOBILE: '0812345678',
  },
  menus: [
    { RoutePath: '/welcome' },
    { RoutePath: '/dashboard' },
    { RoutePath: '/allowance' },
    { RoutePath: '/it-dashboard' },
  ],
};

Cypress.Commands.add('mockLoginApi', (overrides = {}) => {
  cy.intercept('POST', '**/auth/login', {
    statusCode: 200,
    body: {
      ...defaultLoginResponse,
      ...overrides,
    },
  }).as('loginRequest');
});

Cypress.Commands.add(
  'login',
  (username?: string, password?: string, overrides: Record<string, unknown> = {}) => {
    cy.mockLoginApi(overrides);
    cy.visit('/login');
    cy.get('#username').type(username ?? String(Cypress.env('username')));
    cy.get('#password').type(password ?? String(Cypress.env('password')));
    cy.get('.login-button').click();
    cy.wait('@loginRequest');
    cy.url().should('not.include', '/login');
  },
);

declare global {
  namespace Cypress {
    interface Chainable {
      mockLoginApi(overrides?: Record<string, unknown>): Chainable<void>;
      login(
        username?: string,
        password?: string,
        overrides?: Record<string, unknown>,
      ): Chainable<void>;
    }
  }
}
