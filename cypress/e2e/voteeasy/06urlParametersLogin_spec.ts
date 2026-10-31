import { voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Login as regular user via URL parameters test', () => {
    voteEasyIt('Perform login/logout as regular user via URL parameters',
        ['app_url', 'tenant', 'regular_user', 'regular_pw'], (env) => {
        const params = new URLSearchParams({
            lang: 'de',
            pp: env.regular_pw,
            uu: env.regular_user,
            tt: env.tenant,
        })
        cy.visit(env.app_url + '/login?' + params.toString(), { log: false })
        cy.get('#organisation').should('have.value', env.tenant).click()
        cy.get('#username').should('have.value', env.regular_user).click()
        // Check the prefilled password without including it in assertion output.
        cy.get('#password', { log: false }).should(($input) => {
            expect($input.val() === env.regular_pw, 'password is prefilled').to.eq(true)
        }).click()
        cy.get('#login').click()
        cy.url().should('contain', env.app_url)
        // Successful login may drop the language query parameter on redirect.
        const homePath = new URL(env.app_url.replace(/\/$/, '') + '/').pathname
        cy.location('pathname').should('eq', homePath)
        cy.get('#logout').click()
        cy.url().should('contain', '/login?success')
    })

    // Deliberately invalid data is required for this negative test.
    voteEasyIt('Reject nonexistent user supplied via URL parameters', ['app_url'], (env) => {
        cy.visit(env.app_url + '/login?lang=de&pp=insecurepassword&uu=insecureuser&tt=insecuretenant')
        cy.get('#organisation').should('have.value', 'insecuretenant').click()
        cy.get('#username').should('have.value', 'insecureuser').click()
        cy.get('#password').should('have.value', 'insecurepassword').click()
        cy.get('#login').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login?error')
    })
})
