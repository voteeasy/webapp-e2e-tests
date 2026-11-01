import { login, voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy SelfService registration', () => {
    voteEasyIt('can be called without auth', ['app_url'], (env) => {
        cy.visit(env.app_url + '/registerselfservice?lang=de')
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/registerselfservice')
    })

    voteEasyIt('can create a new organisation with initial accounts', ['app_url', 'regular_user'], (env) => {
        const orgName = env.regular_user + Date.now()
        cy.visit(env.app_url + '/registerselfservice?lang=de')
        cy.get('#tenantname').type(orgName).should('have.value', orgName)
        cy.get('#inlineRadio2').check()
        cy.get('#register').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/registerselfservice?regsuccess')
        cy.url().should('contain', 'initpw')
        cy.url().should('contain', 'initapw')
        cy.url().should('contain', 'inittenant')
        cy.url().should('contain', 'inittime')
        cy.log('QR codes are properly generated')
        cy.wait(2000) // rendering of lazily loaded images
        cy.get('#BARCODE').should('exist')
        cy.get('#BARCODE-Admin').should('exist')
    })

    voteEasyIt('is unable to register an already existing org', ['app_url', 'tenant'], (env) => {
        // Use the configured existing tenant and check case-insensitive matching.
        const existingDefaultOrg = env.tenant.toLowerCase()
        cy.visit(env.app_url + '/registerselfservice?lang=de')
        cy.get('#tenantname').type(existingDefaultOrg).should('have.value', existingDefaultOrg)
        cy.get('#inlineRadio2').check()
        cy.get('#register').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/registerselfservice?error')
        cy.get('.alert-primary').contains('Es konnte keine Registrierung durchgeführt werden. Bitte überprüfen Sie Ihre Eingaben.')
        cy.get('.alert-info').contains(' Eine Organisation mit diesem Namen existiert schon - zu spät.')
    })

    voteEasyIt('is unable to submit without mandatory org name input', ['app_url'], (env) => {
        cy.visit(env.app_url + '/registerselfservice?lang=de')
        cy.get('#inlineRadio2').check()
        cy.get('#register').click()
        cy.get('#tenantname').invoke('prop', 'validationMessage')
            .should('equal', 'Please fill out this field.') // in Chrome: Fülle dieses Feld aus.
    })

    voteEasyIt('is unable to submit without correct Captcha clicked', ['app_url'], (env) => {
        cy.visit(env.app_url + '/registerselfservice?lang=de')
        cy.get('#tenantname').type('CaptchaNotClickedCorrectly')
        cy.get('#inlineRadio3').check()
        cy.get('#register').click()
        cy.contains('Zur Zustimmung bitte das STERN-Symbol auswählen. Please choose the STAR symbol to continue.')
    })

    voteEasyIt('is unable to submit without any Captcha selected', ['app_url'], (env) => {
        cy.visit(env.app_url + '/registerselfservice?lang=de')
        cy.get('#tenantname').type('CaptchaNotClickedAtAll')
        cy.get('#register').click()
        cy.contains('Sie müssen zur kostenfreien Nutzung von VoteEasy den Nutzungs- und Datenschutzbestimmungen zustimmen.')
        cy.contains('Zur Zustimmung bitte das STERN-Symbol auswählen. Please choose the STAR symbol to continue.')
    })

    voteEasyIt('shows hint if logged in already and a new tenant is registered',
        ['app_url', 'tenant', 'regular_user', 'regular_pw'], (env) => {
        login(env.app_url, env.tenant, env.regular_user, env.regular_pw)
        cy.url().should('contain', '/?lang=de')
        const dummyOrg = 'dOrg' + Date.now()
        cy.visit(env.app_url + '/registerselfservice?lang=de')
        cy.get('#tenantname').type(dummyOrg).should('have.value', dummyOrg)
        cy.get('#inlineRadio2').check()
        cy.get('#register').click()
        cy.url().should('contain', '/registerselfservice?regsuccess')
        cy.url().should('contain', 'logoutHint')
        cy.get('#logoutHint').should('exist')
        cy.get('#show-creds').should('exist')
        cy.get('#show-creds-details').should('exist')
    })
})
