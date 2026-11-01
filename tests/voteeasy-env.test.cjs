const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { after, test } = require('node:test')
const vm = require('node:vm')

// Compile and test with fake values only; never read cypress.env.json or visit the app.
const root = path.resolve(__dirname, '..')
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'voteeasy-config-test-'))
after(() => fs.rmSync(output, { recursive: true, force: true }))
execFileSync(path.join(root, 'node_modules', '.bin', 'tsc'), [
    '--project', path.join(root, 'tsconfig.json'),
    '--outDir', output,
    '--module', 'node16',
    '--moduleResolution', 'node16',
], { cwd: root, stdio: 'pipe' })

function loadCypressConfig({ existsSync = () => true, warn = () => {} } = {}) {
    const exports = {}
    const code = fs.readFileSync(path.join(output, 'cypress.config.js'), 'utf8')
    const factory = new vm.Script(`(function(exports, require) { ${code}\n})`).runInNewContext({
        console: { warn },
    })
    factory(exports, (name) => {
        if (name === 'node:fs') return { existsSync }
        if (name === 'node:path') return path
        assert.equal(name, 'cypress')
        return { defineConfig: (config) => config }
    })
    return exports.default
}

test('Cypress warns about a missing local configuration without blocking startup', () => {
    for (const fileExists of [false, true]) {
        const warnings = []
        const checkedPaths = []
        const config = loadCypressConfig({
            existsSync: (filePath) => {
                checkedPaths.push(filePath)
                return fileExists
            },
            warn: (message) => warnings.push(message),
        })
        const resolved = {
            projectRoot: path.join(os.tmpdir(), 'fake-cypress-project'),
            defaultBrowser: 'firefox',
            browsers: [],
        }
        assert.equal(config.e2e.setupNodeEvents(() => {}, resolved), resolved)
        assert.deepEqual(checkedPaths, [path.join(resolved.projectRoot, 'cypress.env.json')])
        assert.equal(warnings.length, fileExists ? 0 : 1)
        if (!fileExists) {
            assert.match(warnings[0], /Warning: cypress\.env\.json is missing/)
            assert.match(warnings[0], /A local configuration is required to run the VoteEasy tests/)
            assert.match(warnings[0], /Create your own cypress\.env\.json/)
            assert.match(warnings[0], /copying cypress\.env\.json\.example/)
            assert.match(warnings[0], /before running the tests/)
        }
    }
})

test('Firefox selection prefers stable and falls back to the detected dev channel', () => {
    for (const [browsers, expected] of [
        [[{ name: 'firefox', channel: 'stable' }], 'firefox'],
        [[{ name: 'firefox', channel: 'dev' }], 'firefox:dev'],
        [[{ name: 'firefox', channel: 'dev' }, { name: 'firefox', channel: 'stable' }], 'firefox'],
        [[{ name: 'chrome', channel: 'dev' }], 'firefox'],
        [[{ name: 'firefox', channel: 'nightly' }], 'firefox'],
        [[], 'firefox'],
    ]) {
        const config = loadCypressConfig()
        assert.equal(config.defaultBrowser, 'firefox')
        const resolved = { projectRoot: '/fake-project', defaultBrowser: config.defaultBrowser, browsers }
        assert.equal(config.e2e.setupNodeEvents(() => {}, resolved), resolved)
        assert.equal(resolved.defaultBrowser, expected)
        assert.equal(resolved.browsers, browsers)
    }
})

test('Firefox fallback preserves alternative defaults and explicit browser selection', () => {
    const config = loadCypressConfig()
    for (const defaultBrowser of ['chrome', 'firefox:stable', 'firefox:nightly']) {
        const resolved = { projectRoot: '/fake-project', defaultBrowser, browsers: [{ name: 'firefox', channel: 'dev' }] }
        config.e2e.setupNodeEvents(() => {}, resolved)
        assert.equal(resolved.defaultBrowser, defaultBrowser)
    }
    const browser = { name: 'chrome', channel: 'stable' }
    const resolved = {
        projectRoot: '/fake-project',
        defaultBrowser: 'firefox',
        browsers: [{ name: 'firefox', channel: 'dev' }, browser],
        browser,
    }
    config.e2e.setupNodeEvents(() => {}, resolved)
    assert.equal(resolved.defaultBrowser, 'firefox:dev')
    assert.equal(resolved.browser, browser)
})

function harness(values = {}) {
    const tests = []
    const calls = []
    const pending = []
    const chain = new Proxy({}, {
        get: (_, method) => (...args) => {
            calls.push({ method, args })
            // Browser callbacks are intentionally not executed in this unit test.
            return chain
        },
    })
    const context = vm.createContext({
        URL,
        URLSearchParams,
        describe: (_, define) => define(),
        it: (title, run) => tests.push({ title, run }),
        cy: new Proxy({}, {
            get: (_, method) => method === 'env'
                ? (keys, options) => {
                    calls.push({ method, keys: Array.from(keys), options })
                    return { then: (callback) => pending.push(() => callback(new Proxy(values, {
                        get: (target, key) => {
                            assert.ok(keys.includes(key), `Undeclared environment key: ${String(key)}`)
                            return target[key]
                        },
                    }))) }
                }
                : (...args) => {
                    calls.push({ method, args })
                    return chain
                },
        }),
    })
    function load(relative) {
        const exports = {}
        const code = fs.readFileSync(path.join(output, relative), 'utf8')
        const factory = new vm.Script(`(function(exports, require) { ${code}\n})`).runInContext(context)
        factory(exports, (name) => {
            assert.equal(name, '../../support/voteeasy')
            return helper
        })
        return exports
    }
    const helper = load('cypress/support/voteeasy.js')
    return { tests, calls, pending, helper, load }
}

test('environment is loaded at execution time, only with requested keys and logging disabled', () => {
    const h = harness({ regular_pw: 'fake-secret' })
    let received
    h.helper.voteEasyIt('example', ['regular_pw'], (env) => { received = env.regular_pw })
    assert.equal(h.calls.length, 0)
    h.tests[0].run()
    assert.equal(received, undefined)
    assert.equal(h.calls.length, 1)
    assert.deepEqual(h.calls[0].keys, ['regular_pw'])
    assert.equal(h.calls[0].options.log, false)
    h.pending.shift()()
    assert.equal(received, 'fake-secret')
})

test('missing, empty and non-string values fail without exposing other secrets', () => {
    for (const value of [undefined, '', 42, null]) {
        const h = harness({ regular_pw: value, admin_pw: 'must-not-appear' })
        let ran = false
        h.helper.voteEasyIt('example', ['regular_pw'], () => { ran = true })
        h.tests[0].run()
        assert.throws(() => h.pending.shift()(), (error) => {
            assert.match(error.message, /regular_pw/)
            assert.doesNotMatch(error.message, /must-not-appear/)
            return true
        })
        assert.equal(ran, false)
    }
})

test('login types credentials literally and never asserts or logs the password', () => {
    const h = harness()
    h.helper.login('http://fake.invalid', 'fake-tenant', 'fake-user', 'fake{password}')
    const passwordType = h.calls.find((call) => call.method === 'type' && call.args[0] === 'fake{password}')
    assert.equal(passwordType.args[1].log, false)
    assert.equal(passwordType.args[1].parseSpecialCharSequences, false)
    assert.ok(!h.calls.some((call) => call.method === 'should' && call.args.includes('fake{password}')))
})

test('URL login checks the home path without requiring a language query parameter', () => {
    for (const [appUrl, homePath] of [
        ['http://fake.invalid', '/'],
        ['http://fake.invalid/', '/'],
        ['http://fake.invalid/voteeasy', '/voteeasy/'],
        ['http://fake.invalid/voteeasy/', '/voteeasy/'],
    ]) {
        const h = harness({
            app_url: appUrl,
            tenant: 'fake-tenant',
            regular_user: 'fake-user',
            regular_pw: 'fake-password',
        })
        h.load('cypress/e2e/voteeasy/06urlParametersLogin_spec.js')
        h.tests[0].run()
        h.pending.shift()()
        const locationIndex = h.calls.findIndex((call) => call.method === 'location')
        assert.ok(locationIndex >= 0)
        assert.deepEqual(Array.from(h.calls[locationIndex].args), ['pathname'])
        assert.equal(h.calls[locationIndex + 1].method, 'should')
        assert.deepEqual(Array.from(h.calls[locationIndex + 1].args), ['eq', homePath])
        assert.ok(!h.calls.some((call) => call.method === 'should' && call.args.includes('/?lang=de')))
    }
})

test('both tenant workflows log out and verify login with the changed password', () => {
    for (const spec of ['03tenant_admin_spec.js', '04tsettings_workflow_spec.js']) {
        const h = harness({
            app_url: 'http://fake.invalid',
            tenant_admin_tenant: 'fake-master-tenant',
            tenant_admin_user: 'fake-master-admin',
            tenant_admin_pw: 'fake-master-password',
            tenant_admin_tenant_name: 'Fake Master Tenant',
        })
        h.load('cypress/e2e/voteeasy/' + spec)
        h.tests[0].run()
        h.pending.shift()()
        const successIndex = h.calls.findIndex((call) => call.method === 'contains'
            && call.args[0] === 'Sie haben Ihr Passwort erfolgreich verändert und können dies beim nächsten Login verwenden.')
        assert.ok(successIndex >= 0)
        const nameIndex = h.calls.findIndex((call) => call.method === 'get' && call.args[0] === '#name')
        const tenantName = h.calls[nameIndex + 1].args[0]
        const passwordTypes = h.calls.slice(0, successIndex).filter((call) => call.method === 'type')
        const newPassword = passwordTypes.at(-1).args[0]
        assert.equal(passwordTypes.at(-2).args[0], newPassword)
        const invitationIndex = h.calls.findIndex((call) => call.method === 'visit'
            && call.args[0].includes('/settings/invitation/'))
        assert.ok(invitationIndex > successIndex)
        const relogin = h.calls.slice(successIndex + 1, invitationIndex)
        assert.equal(relogin[0].method, 'get')
        assert.equal(relogin[0].args[0], '#logout')
        assert.equal(relogin[1].method, 'click')
        assert.equal(relogin[2].method, 'get')
        assert.equal(relogin[2].args[0], '#login')
        assert.deepEqual(Array.from(relogin[3].args), ['be.visible'])
        const loginTypes = relogin.filter((call) => call.method === 'type')
        assert.deepEqual(loginTypes.map((call) => call.args[0]), [tenantName, tenantName + '-admin', newPassword])
        assert.equal(loginTypes[2].args[1].log, false)
        const identityIndex = relogin.findIndex((call) => call.method === 'contains'
            && call.args[0] === 'Eingeloggt als: ' + tenantName + '-admin / tenantName')
        assert.ok(identityIndex >= 0)
        assert.deepEqual(Array.from(relogin[identityIndex + 1].args), ['be.visible'])

        // Deactivation must reject valid current credentials, not an obsolete password.
        const deactivatedIndex = h.calls.findIndex((call) => call.method === 'contains'
            && call.args[0] === 'Die Organisation wurde deaktiviert.')
        const loginErrorIndex = h.calls.findIndex((call, index) => index > deactivatedIndex
            && call.method === 'should' && call.args.includes('/login?error'))
        assert.ok(loginErrorIndex > deactivatedIndex)
        const deactivatedTypes = h.calls.slice(deactivatedIndex, loginErrorIndex).filter((call) => call.method === 'type')
        assert.deepEqual(deactivatedTypes.map((call) => call.args[0]), [tenantName, tenantName + '-admin', newPassword])
    }
})

test('all VoteEasy tests load declared keys without environment access during registration', () => {
    const keys = [
        'app_url', 'tenant', 'regular_user', 'regular_pw', 'admin_user', 'admin_pw',
        'tenant_admin_user', 'tenant_admin_pw', 'tenant_admin_tenant', 'tenant_admin_tenant_name',
    ]
    const values = Object.fromEntries(keys.map((key) => [key, 'fake-' + key]))
    values.app_url = 'http://fake.invalid'
    values.regular_pw = 'fake{password}&equals=ü +'
    values.regular_user = 'fake-user+with&special=characters'
    values.tenant = 'Fake Tenant & Co'
    const h = harness(values)
    const specs = fs.readdirSync(path.join(output, 'cypress/e2e/voteeasy'))
    assert.equal(specs.length, 9)
    specs.forEach((spec) => h.load('cypress/e2e/voteeasy/' + spec))
    assert.equal(h.tests.length, 22)
    assert.equal(h.calls.length, 0)
    for (const registered of h.tests) {
        assert.ok(!Object.values(values).some((value) => registered.title.includes(value)))
        const before = h.calls.length
        registered.run()
        assert.equal(h.calls[before].method, 'env')
        assert.equal(h.calls[before].options.log, false)
        assert.equal(h.calls.length, before + 1)
        h.pending.shift()()
    }
    const parameterVisit = h.calls.find((call) => call.method === 'visit' && call.args[1]?.log === false)
    assert.ok(parameterVisit)
    const params = new URL(parameterVisit.args[0]).searchParams
    assert.equal(params.get('pp'), values.regular_pw)
    assert.equal(params.get('uu'), values.regular_user)
    assert.equal(params.get('tt'), values.tenant)
    assert.ok(!h.calls.some((call) => call.method === 'should' && call.args.includes(values.regular_pw)))
})
