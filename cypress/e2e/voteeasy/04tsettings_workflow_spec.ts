import { login, voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Tenant-specific settings administration workflow as tenant admin user', () => {
    // Test-specific tenant; these credentials are created by the test itself.
    const tenantPw = 'arealpasswordmaybemoresecure'.slice(0, 19)
    const tenantName = ('tsettings' + Date.now()).slice(0, 75)
    const newPassword = ('pw' + Date.now()).slice(0, 19)
    // Settings data for the not-yet-implemented settings checks
    const adminSettingKey = ('AdminTenantsMustNotHaveSettings' + Date.now()).slice(0, 75)
    const uuidSetting = '79cedd94-a301-4a4b-a169-d34b4bb72f34'
    const uuidKey = ('tsettings.property.uuid' + tenantName).slice(0, 99)
    const numericSetting = 4712
    const numericKey = ('tsettings.property.numeric' + tenantName).slice(0, 99)
    const alphanumericSetting = 'a setting may contain spaces'
    const alphanumericKey = ('tsettings.property.alphanumeric' + tenantName).slice(0, 99)

    voteEasyIt('Perform tenant settings workflow for ' + tenantName,
        ['app_url', 'tenant_admin_tenant', 'tenant_admin_user', 'tenant_admin_pw', 'tenant_admin_tenant_name'], (env) => {
        const loginAsTenantAdmin = () => login(env.app_url, env.tenant_admin_tenant, env.tenant_admin_user, env.tenant_admin_pw)

        // 1. Login as superadmin
        loginAsTenantAdmin()
        cy.url().should('contain', '/?lang=de')
        cy.contains('Admin')
        cy.get('i[style="color:firebrick;"][class="fas fa-blind"]').should('exist')

        // 2. Superadmin tenant must not have settings
        cy.visit(env.app_url + '/tsettings/properties/?lang=de')
        cy.contains('Derzeit gibt es keine spezifischen Einstellungen.')
        cy.contains('Organisationseinstellungen')
        cy.contains('Spezifische Einstellungen')
        cy.contains('Name')
        cy.contains('gesetzter Wert')
        cy.contains('Gültigkeitsbereich')
        cy.contains('Datentyp')
        cy.contains('Erstellt am')
        // TODO: create uuid, numeric and alphanumeric settings, verify duplicate
        // keys and usage, delete uuid setting and check property count, then
        // verify a regular user cannot access tenant settings.

        // 3. Create new tenant
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
        cy.log('Settling after logout to prevent local test failures on fast machines.')
        cy.wait(1000)

        // 4. Login as newly created tenant admin
        cy.log('Login as new tenant admin')
        login(env.app_url, tenantName, tenantName + '-admin', tenantPw)

        // 5. Change display name and password
        cy.visit(env.app_url + '/settings/changeName?lang=de')
        cy.contains('Änderung Ihres Benutzers')
        cy.contains('Ändere Deinen Anzeigenamen')
        cy.get('#name').clear().type('tenantName').click()
        cy.get('input[type="submit"]').click()
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

        // 6. Generate and redeem invitation token
        cy.visit(env.app_url + '/settings/invitation/?lang=de')
        cy.contains('Neue Benutzernamen wurden angelegt.')
        cy.get('span[data-cy="tkn"]').first().invoke('text').then((tokenForTenant) => {
            cy.get('#logout').click()
            cy.log('Open register form and use new credentials')
            cy.visit(env.app_url + '/register?lang=de')
            cy.get('#token').type(tokenForTenant).should('have.value', tokenForTenant).click()
            cy.get('#password').type(tenantPw, { log: false }).click()
            cy.get('#passwordAgain').type(tenantPw, { log: false }).click()
            cy.get('input').first().focus()
            cy.get('#register').click()
            cy.contains('Dein Benutzerzugang wurde erfolgreich angelegt.')

            // Invitation token cannot be used twice
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

        // 7. Deactivate newly created tenant
        loginAsTenantAdmin()
        cy.contains('Admin')
        cy.get('i[style="color:firebrick;"][class="fas fa-blind"]').should('exist')
        cy.visit(env.app_url + '/settings/tenant/?lang=de')
        cy.url().should('include', '/settings/tenant/')
        cy.get('tr[data-cy="' + tenantName + '"]').within(() => {
            cy.get('button[class="btn btn-outline-secondary border-0"]').click({ force: true })
        })
        cy.contains('Die Organisation wurde deaktiviert.')

        // 8. Master tenant is protected
        cy.get('tr[data-cy="' + env.tenant_admin_tenant_name + '"]').within(() => {
            cy.get('button[class="btn btn-outline-secondary border-0"]').click({ force: true })
        })
        cy.contains('Diese Organisation ist geschützt. Operation nicht erlaubt.')

        // 9. Deactivated tenant cannot login even with the valid new password
        cy.log('Logout and check that login is impossible')
        cy.get('#logout').click()
        login(env.app_url, tenantName, tenantName + '-admin', newPassword)
        cy.url().should('contain', '/login?error')
        cy.contains('Invalide Zugangsdaten')

        // 10. Remove newly created tenant
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
        cy.get('#logout').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login')
    })
})
