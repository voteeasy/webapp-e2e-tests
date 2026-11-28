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

        // 5. Open settings and verify that the new tenant has no settings yet
        cy.visit(env.app_url + '/tsettings/properties/?lang=de')
        cy.contains('Organisationseinstellungen')
        cy.contains('Spezifische Einstellungen')
        cy.contains('Derzeit gibt es keine spezifischen Einstellungen.')
        // no action can be taken here, therefore just checking for empty state

        // 6. Switch to organisation admin area and create a particular setting
        cy.visit(env.app_url + '/tsettings/tenant/?lang=de')
            // select the currently created organisation
            // hit the "Neue Einstellung" button to open the settings form
            // URL contains /tsettings/properties/add

            // "Einstellung abspeichern"





    })
    // TODO: create uuid, numeric and alphanumeric settings, verify duplicate
    // keys and usage, delete uuid setting and check property count, then
    // verify a regular user cannot access tenant settings.
})
