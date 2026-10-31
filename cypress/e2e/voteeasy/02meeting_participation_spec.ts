import { login, voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Meeting participation workflow as regular user', () => {
    voteEasyIt('Perform meeting participation flow as regular user',
        ['app_url', 'tenant', 'regular_user', 'regular_pw'], (env) => {
        login(env.app_url, env.tenant, env.regular_user, env.regular_pw)
        cy.url().should('contain', '/?lang=de')

        // 1. Participation overview may contain entries from previous runs.
        cy.visit(env.app_url + '/participation/?lang=de')
        cy.get('body').then(($body) => {
            if (!$body.text().includes('Sie haben bisher noch an keinem Meeting teilgenommen.')) {
                cy.contains('Übersicht Deiner Meetingteilnahmen')
            }
        })

        // 2. No current meeting participation
        cy.visit(env.app_url + '/?lang=de')
        cy.contains('Meeting verlassen').should('not.exist')
        cy.contains('Zeige Beschlussvorschläge').should('not.exist')
        cy.get('a[href*="/gatherings/"]').its('length').should('be.gte', 2)
        cy.get('a[href*="/gatherings/"]').last().click()
        cy.url().should('include', '/gatherings/')
        cy.contains('Neu').should('not.exist')
        cy.get('form[action*="/participation/participate/"]').its('length').should('be.gte', 2)

        // 3. Enter first meeting
        cy.get('form[action*="/participation/participate/"]').find('button').first().click()
        cy.contains('Sie nehmen jetzt am Meeting teil.')
        cy.url().should('include', '/gatherings/participate')
        cy.contains('Angemeldet im Meeting')
        cy.visit(env.app_url + '/?lang=de')
        cy.get('a[href*="/gatherings/"]').should('have.length', 3)
        cy.get('a[href*="/gatherings/participate"]').should('have.length', 1)

        // 4. Overview reflects participation
        cy.visit(env.app_url + '/gatherings/?lang=de')
        cy.contains('Meeting verlassen')
        cy.contains('Zeige Beschlussvorschläge')

        // 5. Enter a different meeting and leave it
        cy.visit(env.app_url + '/gatherings/?lang=de')
        cy.get('form[action*="/participation/participate/"]').find('button').last().click()
        cy.url().should('include', '/gatherings/participate')
        cy.visit(env.app_url + '/gatherings/?lang=de')
        cy.get('form[action*="/participation/leave/"]').find('button').click()
        cy.contains('Angemeldet im Meeting').should('not.exist')
        cy.get('form[action*="/participation/leave/"]').should('not.exist')
        cy.contains('Sie haben das Meeting verlassen.')
        cy.contains('Zeige Beschlussvorschläge').should('not.exist')

        // 6. Participation history contains both meetings
        cy.visit(env.app_url + '/participation/?lang=de')
        cy.contains('Sie haben bisher noch an keinem Meeting teilgenommen.').should('not.exist')
        cy.get('tbody>tr').should(($tr) => {
            if ($tr.length < 2) {
                throw new Error('Not enough participations found, expected at least 2')
            }
        })

        cy.get('#logout').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login')
    })
})
