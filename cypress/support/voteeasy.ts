export interface VoteEasyEnv {
    app_url: string
    tenant: string
    regular_user: string
    regular_pw: string
    admin_user: string
    admin_pw: string
    tenant_admin_user: string
    tenant_admin_pw: string
    tenant_admin_tenant: string
    tenant_admin_tenant_name: string
}

// Read only the values required by this test, not the entire secret configuration.
export function voteEasyIt<K extends keyof VoteEasyEnv>(
    title: string,
    keys: K[],
    test: (env: Pick<VoteEasyEnv, K>) => void,
): void {
    it(title, () => {
        cy.env<Pick<VoteEasyEnv, K>>(keys, { log: false }).then((env) => {
            keys.forEach((key) => {
                if (typeof env[key] !== 'string' || env[key].length === 0) {
                    throw new Error(`Missing or invalid VoteEasy configuration: ${key}. Set it in cypress.env.json or via CYPRESS_${key}.`)
                }
            })
            test(env)
        })
    })
}

export function login(appUrl: string, tenant: string, username: string, password: string): void {
    cy.visit(appUrl + '?lang=de')
    cy.get('#organisation').type(tenant, { parseSpecialCharSequences: false }).should('have.value', tenant).click()
    cy.get('#username').type(username, { parseSpecialCharSequences: false }).should('have.value', username).click()
    cy.get('#password').type(password, { log: false, parseSpecialCharSequences: false }).click()
    cy.get('#login').click()
    cy.url().should('contain', appUrl)
}
