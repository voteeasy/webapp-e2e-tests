import { login, voteEasyIt } from '../../support/voteeasy'

describe('VoteEasy Tenant-specific settings administration workflow as tenant admin user', () => {
    // Test-specific tenant for the not-yet-implemented invitation settings checks
    const tenantPw = 'anewpasswordissecure'
    const tenantName = ('setinvit' + new Date()).slice(0, 75)
    const newPassword = (tenantPw + tenantPw).slice(0, 19)
    const invitationKey = 'TODO'
    const invitationValue = 10

    voteEasyIt('Perform login as tenant admin user to have individual userTokenCount for ' + tenantName,
        ['app_url', 'tenant_admin_tenant', 'tenant_admin_user', 'tenant_admin_pw'], (env) => {
        login(env.app_url, env.tenant_admin_tenant, env.tenant_admin_user, env.tenant_admin_pw)
        cy.url().should('contain', '/?lang=de')
        // TODO: create new tenant, create invitationTokenSetting with value 10,
        // login as new tenant admin and verify the invitation token count is 10.
        cy.get('#logout').click()
        cy.url().should('contain', env.app_url)
        cy.url().should('contain', '/login')
    })
})
