import { voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Register by token form', () => {
    voteEasyIt('can be controlled and prefilled by URL parameter', ['app_url'], (env) => {
        // Deliberately invalid token/password: this checks form prefilling,
        // not registration of a configured account.
        cy.visit(env.app_url + '/register?lang=de&pp=insecurepassword&uu=mytesttoken')

        cy.get('input[id="token"]').should('have.value', 'mytesttoken')
        cy.get('input[id="token"]').click()
        // does not work due to double-password entry form
        // cy.get('input[id="password"]').should('have.value', 'insecurepassword')
        // cy.get('input[id="password"]').click()

        // sometimes the register button is disabled
        cy.get('#register').click({ force: true });
    })
})