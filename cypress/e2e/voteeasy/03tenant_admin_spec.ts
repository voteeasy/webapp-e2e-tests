import { login, voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Tenant administration workflow as tenant admin user', () => {
    voteEasyIt('Perform tenant administration workflow as tenant admin user',
        ['app_url', 'tenant_admin_tenant', 'tenant_admin_user', 'tenant_admin_pw', 'tenant_admin_tenant_name'], (env) => {
        const tenantPw = 'enemenepopel'
        const tenantName = ('' + new Date().toLocaleString('en-us')).slice(0, 90).trim()
        const newPassword = (tenantPw + tenantPw).slice(0, 18).trim()
        const loginAsTenantAdmin = () => login(env.app_url, env.tenant_admin_tenant, env.tenant_admin_user, env.tenant_admin_pw)

        // 1. Login and verify superadmin role
        loginAsTenantAdmin()
        cy.contains('Admin')
        cy.get('i[style="color:firebrick;"][class="fas fa-blind"]').should('exist')

        // 2. Create a new tenant
        cy.visit(env.app_url + '/settings/tenant/?lang=de')
        cy.contains('Organisationen verwalten')
        cy.contains('Neue Organisation')
        cy.get('a[href*="/settings/tenant/add"]').click()
        cy.contains('Neue Organisation anlegen')
        cy.get('#name').type(tenantName).should('have.value', tenantName).click()
        cy.get('#password').type(tenantPw, { log: false }).click()
        cy.get('input[type="submit"]').click()
        cy.contains('Die neue Organisation mit Adminnutzer wurde erfolgreich initialisiert.')
        cy.url().should('include', '/settings/tenant/')
        cy.get('#logout').click()

        // 3. Login as the newly created tenant's admin
        login(env.app_url, tenantName, tenantName + '-admin', tenantPw)
        cy.wait(2000)

        // 4. Change display name and password
        cy.visit(env.app_url + '/settings/changeName?lang=de')
        cy.contains('Änderung Ihres Benutzers')
        cy.contains('Ändere Deinen Anzeigenamen')
        cy.get('#name').clear().type('tenantName').click()
        cy.get('input[type="submit"]').click()
        cy.contains('tenantName')
        cy.contains('Ihr Benutzername wurde angepasst.')
        cy.visit(env.app_url + '?lang=de')
        cy.contains('Eingeloggt als: ' + tenantName + '-admin / tenantName')
        cy.visit(env.app_url + '/settings/changePassword?lang=de')
        cy.contains('Änderung Ihres Benutzers')
        cy.contains('Passwort ändern')
        cy.get('#password').clear().type(newPassword, { log: false }).click()
        cy.get('#passwordAgain').clear().type(newPassword, { log: false }).click()
        cy.get('input').first().focus()
        cy.get('input[type="submit"]').click()
        cy.contains('Sie haben Ihr Passwort erfolgreich verändert und können dies beim nächsten Login verwenden.')

        // Verify the changed password in a new login, not just the existing session.
        cy.get('#logout').click()
        cy.get('#login').should('be.visible')
        login(env.app_url, tenantName, tenantName + '-admin', newPassword)
        cy.get('#logout').should('be.visible')
        cy.contains('Eingeloggt als: ' + tenantName + '-admin / tenantName').should('be.visible')

        // 5. Generate and redeem an invitation token
        cy.visit(env.app_url + '/settings/invitation/?lang=de')
        cy.contains('Neue Benutzernamen wurden angelegt.')
        cy.get('span[data-cy="tkn"]').first().invoke('text').then((tokenForTenant) => {
            cy.get('#logout').click()
            cy.visit(env.app_url + '/register?lang=de')
            cy.get('#token').type(tokenForTenant).should('have.value', tokenForTenant).click()
            cy.get('#password').type(tenantPw, { log: false }).click()
            cy.get('#passwordAgain').type(tenantPw, { log: false }).click()
            cy.get('input').first().focus()
            cy.get('#register').click()
            cy.contains('Dein Benutzerzugang wurde erfolgreich angelegt.')

            // Token cannot be redeemed twice
            cy.visit(env.app_url + '/register?lang=de')
            cy.get('#token').type(tokenForTenant).should('have.value', tokenForTenant).click()
            cy.get('#password').type(tenantPw, { log: false }).click()
            cy.get('#passwordAgain').type(tenantPw, { log: false }).click()
            cy.get('input').first().focus()
            cy.get('button[type="submit"]').click()
            cy.contains('Der Benutzername ist ungültig oder wurde bereits eingelöst.')
            cy.contains('Es konnte keine Registrierung durchgeführt werden. Bitte überprüfen Sie Ihre Eingaben')

            cy.visit(env.app_url + '/login?lang=de')
            cy.get('#organisation').type(tenantName).click()
            cy.get('#username').type(tokenForTenant).click()
            cy.get('#password').type(tenantPw, { log: false }).click()
            cy.get('#login').click()
            cy.contains(' Eingeloggt als: ' + tokenForTenant + ' / n/a')
            cy.get('#logout').click()
        })

        // 6. Deactivate the created tenant
        loginAsTenantAdmin()
        cy.contains('Admin')
        cy.get('i[style="color:firebrick;"][class="fas fa-blind"]').should('exist')
        cy.visit(env.app_url + '/settings/tenant/?lang=de')
        cy.url().should('include', '/settings/tenant/')
        cy.get('tr[data-cy="' + tenantName + '"]').within(() => {
            cy.get('button[class="btn btn-outline-secondary border-0"]').click({ force: true })
        })
        cy.contains('Die Organisation wurde deaktiviert.')

        // 7. The configured master tenant is protected
        cy.get('tr[data-cy="' + env.tenant_admin_tenant_name + '"]').within(() => {
            cy.get('button[class="btn btn-outline-secondary border-0"]').click({ force: true })
        })
        cy.contains('Diese Organisation ist geschützt. Operation nicht erlaubt.')

        // 8. Login to a deactivated tenant fails even with the valid new password
        cy.get('#logout').click()
        login(env.app_url, tenantName, tenantName + '-admin', newPassword)
        cy.url().should('contain', '/login?error')
        cy.contains('Invalide Zugangsdaten')

        // 9. Remove the newly created tenant
        loginAsTenantAdmin()
        cy.contains('Admin')
        cy.get('i[style="color:firebrick;"][class="fas fa-blind"]').should('exist')
        cy.visit(env.app_url + '/settings/tenant/?lang=de')
        cy.url().should('include', '/settings/tenant/')
        cy.get('tr[data-cy="' + tenantName + '"]').within(() => {
            cy.get('button[class="btn btn-outline-danger"]').click({ force: true })
            cy.wait(500)
            cy.contains('Ja, sofort löschen').click({ force: true })
        })
        cy.contains('Die Organisation wurde unwiderbringlich entfernt.')
        cy.url().should('include', '/settings/tenant/')
        cy.contains(tenantName).should('not.exist')

        // 10. Overdue menu has no entries
        cy.visit(env.app_url + '/settings/tenant/overdue?lang=de')
        cy.contains('Es existieren derzeit keine Organisationen.')
        cy.get('#logout').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login')
    })
})
