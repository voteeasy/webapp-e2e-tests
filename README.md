# webapp-e2e-tests
End2End tests of the webapp

# Installation instructions

## Get Cypress

* npm install cypress --save-dev
* npx cypress open

## Get Typescript support

* npm install typescript --save-dev
* create tsconfig.json

# Running the tests

1. Get a local VoteEasy instance running with the required roles and initial meetings, e.g.
```sh
./sh/cleanUpDBAndStartDocker.sh
OR
./mvnw -Pdevelopment spring-boot:run
```

2. Copy the checked-in template once and enter your local application URL, tenants and credentials.
3. Run the tests with `npx cypress run` or `npx cypress open` for the GUI.

## Local VoteEasy configuration

Copy the checked-in template once and enter your local application URL,
tenants and credentials:

```sh
cp cypress.env.json.example cypress.env.json
```

`cypress.env.json` is ignored by Git. Never commit real credentials to the
example or `cypress.config.ts`. Cypress loads the local JSON file automatically;
the VoteEasy tests read only their required values via `cy.env()` (Cypress 16)
using the typed helper in `cypress/support/voteeasy.ts`. Test titles do not
contain configured usernames, and configured passwords are not logged or
included in value assertions. Missing or empty configuration values fail with
a message containing only the key name.

All existing keys in `cypress.env.json.example` remain supported, including
`app_url`. Values can be overridden with `CYPRESS_` environment variables
(e.g. `CYPRESS_regular_user`, `CYPRESS_regular_pw`) or Cypress's `--env` option.
Use CI secrets/environment variables for passwords rather than CLI arguments.
Precedence: config `env` < `cypress.env.json` < environment variables < `--env`.

The URL-parameter login test uses the configured regular account, with URL
encoding for the parameter values. Negative tests intentionally retain invalid
users/tokens, and tenant workflows create temporary accounts with their own
test credentials. Cypress screenshots/videos and URLs may still contain
sensitive data; do not publish artifacts without checking them.

Run the VoteEasy tests against the configured application:

```sh
npx cypress run
```

These tests create, change and delete application data. Use a dedicated test
instance with the necessary roles and initial meetings.

Check TypeScript and configuration loading without running browser tests or
reading local secrets:

```sh
npm run typecheck
npm run test:config
```

The configuration regression tests use fake values and verify all nine specs,
execution-time loading, required-key validation, password logging and URL
encoding.

## GitHub Actions

The workflow in `.github/workflows/checks.yml` runs on pushes and pull requests
and can also be started manually. It uses Node.js 24 and runs:

- `npm ci` using the committed lockfile
- `npm run typecheck`
- `npm run test:config`
- a whitespace check of the committed changes

These checks do not require a running VoteEasy instance, a database,
`cypress.env.json` or GitHub secrets. Cypress browser binary installation is
skipped with `CYPRESS_INSTALL_BINARY=0`.

This workflow checks the test project, not application behaviour. Full browser
E2E tests still run separately against the local installation prepared by the
external Docker setup.
