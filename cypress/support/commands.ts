// ***********************************************
// This example namespace declaration will help
// with Intellisense and code completion in your
// IDE or Text Editor.
// ***********************************************
// declare namespace Cypress {
//   interface Chainable<Subject = any> {
//     customCommand(param: any): typeof customCommand;
//   }
// }
//
// function customCommand(param: any): void {
//   console.warn(param);
// }
//
// NOTE: You can use it like so:
// Cypress.Commands.add('customCommand', customCommand);
//
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

// Cypress.Commands.add('loginWithAPI', () => {
//     cy.request({
//         method: 'POST',
//         url: `${Cypress.env('API_URL')}/auth/login`,
//         body: {
//             username: Cypress.env('USERNAME'),
//             password: Cypress.env('PASSWORD')
//         }
//     }).then((response) => {
//         const res = response.body;

//         // เซ็ตค่าตรงกับที่ AuthService เก็บ
//         localStorage.setItem('ALL_DATA', JSON.stringify(res));
//         localStorage.setItem('IS_LOGGED_IN', 'true');
//         localStorage.setItem('CURRENT_USER', res.adUser || '');
//         localStorage.setItem('USER_ROLE', res.permission?.Role || '');
//         localStorage.setItem('USER_DATA', JSON.stringify(res.employee) || '');
//     });
// });

// cypress/support/commands.ts
Cypress.Commands.add('loginWithUI', () => {
    cy.visit('/login');

    cy.get('input#username')
        .should('be.visible')
        .type(Cypress.env('USERNAME'));

    cy.get('input#password')
        .should('be.visible')
        .type(Cypress.env('PASSWORD'));

    cy.get('button[type="submit"]').click();

    // รอจนกว่าจะ redirect ออกจากหน้า login สำเร็จ
    cy.url().should('not.include', '/login');
});