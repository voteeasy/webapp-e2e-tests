# Guidance for Coding Agents

## Language

- Use British English for documentation, comments and other English-language text in this project.
- Preserve application-specific text in other languages where tests depend on it, such as German UI labels and messages.

## VoteEasy E2E Test Environment

- VoteEasy E2E tests must be repeatable: both individual specs and the full suite must support multiple consecutive runs against an existing database state, without requiring a database reset between runs.
- Database initialisation and resets are handled separately by a Docker setup, outside this test project. Tests must work both with a freshly initialised test database and with data left by earlier runs.
- Do not introduce additional database resets, a seed API or Docker orchestration in this project without consultation.
- Preserve the configured accounts and other baseline data required by subsequent runs. Do not assume that mutable application data is empty or unchanged from its initial state.
- Use unique test records where appropriate, scope mutations and deletions to the intended test records, and provide cleanup that also handles failed or partially completed runs. Leftover test data must not prevent subsequent runs from succeeding.
- When changing E2E tests, verify repeatability by running the affected specs multiple times consecutively against the same test database without resetting it. A single successful run is not sufficient evidence of repeatability.
- Browser E2E tests create, modify and delete application data. Run them only against the test instance prepared for this purpose.

## Local Configuration

- The actual application URL, tenants and credentials are stored in the local `cypress.env.json`.
- This file is not committed and is ignored by Git. Do not overwrite or commit it, and do not include credentials in output.
- `cypress.env.json.example` is the committed template and must not contain real credentials.
- The VoteEasy tests read the required values through `cy.env()` using the typed helper in `cypress/support/voteeasy.ts`.

## Checks Without Application Access

- `npm run typecheck`: check TypeScript.
- `npm run test:config`: run regression tests with simulated Cypress commands and synthetic configuration values. These tests do not read local credentials or run browser E2E tests.
