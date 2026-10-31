import { login, voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Gathering+VoteProposal+Vote workflow as admin user', () => {
    voteEasyIt('Perform gathering and voting workflow as admin user',
        ['app_url', 'tenant', 'admin_user', 'admin_pw'], (env) => {
        // 1. Login as admin user
        login(env.app_url, env.tenant, env.admin_user, env.admin_pw)
        cy.url().should('contain', '/?lang=de')

        // 2. Create gathering; start with a fresh database without participation.
        const gatheringTitle = '' + new Date()
        cy.visit(env.app_url + '/gatherings/?lang=de')
        cy.get('a[href*="gatherings/new"]').click()
        cy.url().should('eq', env.app_url + '/gatherings/new')
        cy.get('#name').type(gatheringTitle).should('have.value', gatheringTitle).click()
        cy.get('#newGathering').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/gatherings/')

        // 3. Add VoteProposal to created gathering
        const voteProposalName = 'VP1' + Date.now()
        cy.get('a[class^="btn btn-success"]').last().click()
        cy.url().should('include', '/votings/proposals/add/')
        cy.get('#itemofagenda').type('Top1').should('have.value', 'Top1').click()
        cy.get('#name').type(voteProposalName).should('have.value', voteProposalName).click()
        cy.get('input[id="options[0]"]').type('J').should('have.value', 'J').click()
        cy.get('input[id="options[1]"]').type('N').should('have.value', 'N').click()
        cy.get('input[id="options[2]"]').type('Enthaltung').should('have.value', 'Enthaltung').click()
        cy.get("input[class='btn btn-primary ml-2']").click()
        cy.url().should('include', '/gatherings/participate/')
        cy.contains('Beschlussvorschlag wurde angelegt.')

        // 4. Show voting options
        cy.contains('Zeige Beschlussvorschläge')
        cy.get('a[class^="btn btn-primary"][href*="votings/proposals/"]').click()
        cy.contains('J')
        cy.contains('N')
        cy.contains('Enthaltung')
        cy.url().should('include', '/votings/proposals/')

        // 5. Start vote
        cy.contains('Starte Abstimmung')
        cy.contains('Beende Abstimmung').should('not.exist')
        cy.get('a[class^="btn btn-warning"][href*="votings/proposals/startVoting"]').last().click({ force: true })
        cy.contains('Die Abstimmung hat begonnen')

        // 6. Voting requires participation
        cy.contains('Stimm ab')
        cy.get('a[class^="btn btn-primary"][href*="votings/vote"]').last().click()
        cy.contains('Bevor abgestimmt werden kann, muss einem Meeting beigetreten werden.')
        cy.url().should('include', '/gatherings/')

        // 7. Participate and vote
        cy.get('button[class^="btn btn-secondary"]').last().click()
        cy.contains('Sie nehmen jetzt am Meeting teil.')
        cy.url().should('include', '/gatherings/participate/')
        cy.get('a[class^="btn btn-primary"][href*="votings/proposals"]').first().click()
        cy.url().should('include', '/votings/proposals')
        cy.contains('Stimm ab')
        // TODO: select the correct meeting rather than the last one.
        cy.get('a[class^="btn btn-primary"][href*="votings/vote"]').last().click()
        cy.url().should('include', '/votings/vote/')

        // 8. Browser validation prevents an empty vote
        cy.get("input[class='btn btn-primary ml-2']").click()
        cy.log('Verifying browser validation prevents empty submit')
        cy.get('input:invalid').should('have.length', 3)
        cy.url().should('include', '/votings/vote/')
        cy.get('input[type="radio"][value="Enthaltung"]').check()
        cy.get("input[class='btn btn-primary ml-2']").click()
        cy.contains('Ihre Stimme wurde erfolgreich abgegeben.')
        cy.url().should('include', '/votings/proposals/')

        // 9. End vote and show results
        cy.contains('Beende Abstimmung')
        cy.get('a[class^="btn btn-warning"][href*="votings/proposals/endVoting"]').last().click({ force: true })
        cy.contains('Die Abstimmung wurde beendet')
        cy.get('a[class^="btn btn-info"][href*="votes/proposal"]').last().click()
        cy.url().should('include', '/votes/proposal/')
        cy.contains('Abgegebene Stimmen für VP1')
        cy.contains('Enthaltung')
        cy.get('a[class^="nav-link"][href*="/votes/"]').click()
        cy.url().should('include', '/votes/')
        cy.contains('Enthaltung')
        cy.contains('VP1')

        // 10. Remove gathering and logout
        cy.visit(env.app_url + '/gatherings/?lang=de')
        cy.get('button[class^="btn btn-danger"]').last().click()
        cy.get('#logout').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login')
    })
})
