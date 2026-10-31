import { login, voteEasyIt } from '../../support/voteeasy'

const regularKeys = ['app_url', 'tenant', 'regular_user', 'regular_pw'] as const
const adminKeys = ['app_url', 'tenant', 'admin_user', 'admin_pw'] as const

describe('VoteEasy Login as regular user test', () => {
    voteEasyIt('Perform login/logout as regular user', [...regularKeys], (env) => {
        login(env.app_url, env.tenant, env.regular_user, env.regular_pw)
        cy.url().should('contain', '/?lang=de')
        cy.get('#adminmenu').should('not.exist')
        cy.get('#logout').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login?success')
    })

    voteEasyIt('Ensure regular user cannot call superadmin menu items', [...regularKeys], (env) => {
        login(env.app_url, env.tenant, env.regular_user, env.regular_pw)
        cy.request({
            url: env.app_url + '/settings/tenant/overdue?lang=de',
            followRedirect: false,
            failOnStatusCode: false,
        }).then((resp) => {
            expect(resp.status).to.eq(403)
            expect(resp.redirectedToUrl).to.eq(undefined)
        })
    })
})

describe('VoteEasy Logout message', () => {
    voteEasyIt('Show login page with success message after logout', ['app_url'], (env) => {
        cy.visit(env.app_url + '/login?lang=de&success')
        cy.get('.alert').contains('Sie haben sich erfolgreich abgemeldet')
    })
})

describe('VoteEasy Login error with wrong credentials', () => {
    voteEasyIt('Show login page with credentials error message', ['app_url'], (env) => {
        cy.visit(env.app_url + '/login?lang=de&error')
        cy.get('.alert').contains('Invalide Zugangsdaten')
    })
})

describe('VoteEasy Login as admin test', () => {
    voteEasyIt('Perform login/logout as admin user', [...adminKeys], (env) => {
        login(env.app_url, env.tenant, env.admin_user, env.admin_pw)
        cy.url().should('contain', '/?lang=de')
        cy.log('footer has roles')
        cy.get('#footerroles').should('exist')
        cy.log('admin menu exists')
        cy.get('#adminmenu').should('exist')
        cy.get('#logout').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login?success')
    })
})

describe('VoteEasy external links on login form', () => {
    voteEasyIt('Verify formal links on login page', ['app_url'], (env) => {
        cy.visit(env.app_url + '?lang=de')
        cy.url().should('include', '/login')
        cy.contains('Zurück zur Webseite')
        cy.get('a').first().should('have.attr', 'href', 'https://einfach-abstimmen.de/')
        cy.contains('Impressum/ Datenschutz')
        cy.get('a').last()
            .should('have.attr', 'href', 'https://einfach-abstimmen.de/impressum-datenschutz/')
            .and('have.attr', 'target', '_blank')
    })
})

describe('VoteEasy external links as admin after login', () => {
    voteEasyIt('Verify formal links as admin user', [...adminKeys], (env) => {
        login(env.app_url, env.tenant, env.admin_user, env.admin_pw)
        cy.url().should('contain', '/?lang=de')
        cy.get('a[class^="navbar-brand"]')
            .should('have.attr', 'href', 'https://einfach-abstimmen.de/')
            .and('have.attr', 'target', '_blank')
        cy.contains('© 2020')
        cy.get('a').last()
            .should('have.attr', 'href', 'https://einfach-abstimmen.de/impressum-datenschutz/')
            .and('have.attr', 'target', '_blank')
    })
})
