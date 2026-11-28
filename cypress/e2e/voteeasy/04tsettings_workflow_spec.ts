import { login, voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Tenant-specific settings administration workflow as tenant admin user', () => {
    // Test-specific tenant; these credentials are created by the test itself.
    const tenantPw = 'arealpasswordmaybemoresecure'.slice(0, 19)
    const tenantName = ('tsettings' + Date.now()).slice(0, 75)
    // Unique keys keep the checks scoped to this test's organisation.
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
        // Organisation admins can view their settings, but mustn't manage them.
        cy.get('a[href*="/tsettings/properties/add/"]').should('not.exist')
        cy.get('#logout').click()

        // 6. Manage settings as the superadmin, selecting only the intended tenant.
        loginAsTenantAdmin()
        const openSettingsForm = (name: string) => {
            cy.visit(env.app_url + '/settings/tenant/?lang=de')
            cy.get(`tr[data-cy="${name}"]`).within(() => {
                cy.contains('button', 'Neue Einstellung').click()
            })
            cy.url().should('include', '/tsettings/properties/add/')
            cy.get('input[name="tenantName"]').should('have.value', name)
        }
        const saveSetting = (key: string, value: string, type: string) => {
            cy.get('#key').type(key).should('have.value', key)
            cy.get('#value').type(value).should('have.value', value)
            cy.get('#type').select(type)
            cy.get('#scope').select('TENANT')
            cy.get('input[type="submit"]').should('have.value', 'Einstellung abspeichern').click()
            cy.url().should('include', '/settings/tenant/')
        }
        const openTenantSettings = () => {
            cy.visit(env.app_url + '/settings/tenant/?lang=de')
            cy.get(`tr[data-cy="${tenantName}"]`).within(() => {
                cy.get('form[action*="/tsettings/properties/"]').not('[action*="/add/"]')
                    .find('button').click()
            })
            cy.url().should('include', '/tsettings/properties/')
        }
        const settings = [
            { key: uuidKey, value: uuidSetting, type: 'UUID', label: 'UUID' },
            { key: numericKey, value: String(numericSetting), type: 'NUMERIC', label: 'numerisch' },
            { key: alphanumericKey, value: alphanumericSetting, type: 'ALPHANUMERIC', label: 'alphanumerisch' },
        ]
        const verifySetting = (setting: typeof settings[number], readOnly = false) => {
            cy.get(`tr[data-cy="${setting.key}"]`).within(() => {
                cy.get('td').eq(0).should('have.text', setting.key)
                cy.get('td').eq(1).should('have.text', setting.value)
                // The read-only overview puts scope before datatype.
                cy.get('td').eq(readOnly ? 3 : 2).should('have.text', setting.label)
                cy.get('td').eq(readOnly ? 2 : 3).should('have.text', 'organisationsweit')
            })
        }

        // The protected master organisation must reject settings, not just be empty.
        openSettingsForm(env.tenant_admin_tenant_name)
        saveSetting(adminSettingKey, 'not allowed', 'ALPHANUMERIC')
        cy.contains('Diese Organisation ist geschützt. Operation nicht erlaubt.').should('be.visible')

        settings.forEach((setting) => {
            openSettingsForm(tenantName)
            saveSetting(setting.key, setting.value, setting.type)
            cy.contains('Die Einstellung wurde erfolgreich angelegt.').should('be.visible')
        })
        openTenantSettings()
        cy.get('tbody tr[data-cy]').should('have.length', 3)
        settings.forEach((setting) => verifySetting(setting))

        // 7. Duplicate keys are case-insensitive and must not change existing values.
        openSettingsForm(tenantName)
        saveSetting(uuidKey.toUpperCase(), '84dbbe10-6119-4dbe-83c8-84d3aa36b24a', 'UUID')
        cy.contains('Die Eigenschaft existiert bereits, bitte erst löschen und dann neu anlegen.').should('be.visible')
        openTenantSettings()
        cy.get('tbody tr[data-cy]').should('have.length', 3)
        settings.forEach((setting) => verifySetting(setting))

        // 8. Each test key is used by exactly one organisation.
        cy.visit(env.app_url + '/tsettings/properties/keys?lang=de')
        settings.forEach((setting) => {
            cy.contains('tbody tr', setting.key).within(() => {
                cy.get('td').eq(0).should('have.text', setting.key)
                cy.get('td').eq(1).should('have.text', '1')
                cy.get('td').eq(2).should('have.text', setting.label)
                cy.get('td').eq(3).should('have.text', 'organisationsweit')
            })
        })
        cy.contains('tbody tr', adminSettingKey.toLowerCase()).should('not.exist')

        // 9. The organisation admin sees the values but no deletion controls.
        cy.get('#logout').click()
        login(env.app_url, tenantName, tenantName + '-admin', tenantPw)
        cy.visit(env.app_url + '/tsettings/properties/?lang=de')
        cy.get('tbody tr[data-cy]').should('have.length', 3)
        settings.forEach((setting) => verifySetting(setting, true))
        cy.contains('button', 'Einstellung löschen').should('not.exist')

        // Create a regular user in this organisation to check access restrictions.
        cy.visit(env.app_url + '/settings/invitation/?lang=de')
        cy.get('span[data-cy="tkn"]').first().invoke('text').then((token) => {
            cy.get('#logout').click()
            cy.visit(env.app_url + '/register?lang=de')
            cy.get('#token').type(token)
            cy.get('#password').type(tenantPw, { log: false })
            cy.get('#passwordAgain').type(tenantPw, { log: false }).blur()
            cy.get('#register').should('not.be.disabled').click()
            cy.contains('Dein Benutzerzugang wurde erfolgreich angelegt.').should('be.visible')
            login(env.app_url, tenantName, token, tenantPw)
            cy.get('#logout').should('be.visible')
            cy.request({ url: env.app_url + '/tsettings/properties/', failOnStatusCode: false })
                .its('status').should('eq', 403)
            cy.visit(env.app_url + '/tsettings/properties/?lang=de', { failOnStatusCode: false })
            cy.contains('Unauthorized/403').should('be.visible')
            cy.get('tbody tr[data-cy]').should('not.exist')
            cy.visit(env.app_url + '?lang=de')
            cy.get('#logout').click()
        })

        // 10. Delete only the UUID setting and verify the remaining values and usage.
        loginAsTenantAdmin()
        openTenantSettings()
        cy.get(`tr[data-cy="${uuidKey}"]`).within(() => {
            cy.contains('button', 'Einstellung löschen').click()
            cy.get('.modal').should('be.visible')
            cy.contains('button', 'Ja, sofort löschen').click()
        })
        cy.contains('Die ausgewählte Einstellung wurde gelöscht.').should('be.visible')
        cy.get(`tr[data-cy="${uuidKey}"]`).should('not.exist')
        cy.get('tbody tr[data-cy]').should('have.length', 2)
        settings.slice(1).forEach((setting) => verifySetting(setting))
        cy.visit(env.app_url + '/tsettings/properties/keys?lang=de')
        cy.contains('tbody tr', uuidKey).should('not.exist')
        settings.slice(1).forEach((setting) => {
            cy.contains('tbody tr', setting.key).find('td').eq(1).should('have.text', '1')
        })

        // 11. Remove only the organisation created by this test.
        cy.visit(env.app_url + '/settings/tenant/?lang=de')
        cy.get(`tr[data-cy="${tenantName}"]`).within(() => {
            cy.get('button.btn-outline-danger').click()
            cy.get('.modal').should('be.visible')
            cy.contains('button', 'Ja, sofort löschen').click()
        })
        cy.contains('Die Organisation wurde unwiderbringlich entfernt.').should('be.visible')
        cy.get(`tr[data-cy="${tenantName}"]`).should('not.exist')
        cy.get('#logout').click()
        cy.url().should('include', '/login')
    })
})
