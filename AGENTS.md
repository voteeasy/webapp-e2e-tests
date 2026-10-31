# Guidance for Coding Agents

## Language

- Use British English for documentation, comments and other English-language text in this project.
- Preserve application-specific text in other languages where tests depend on it, such as German UI labels and messages.

## VoteEasy E2E Test Environment

- The VoteEasy E2E tests always run against a freshly initialised database.
- Database initialisation and resets are handled separately by a Docker setup, outside this test project.
- A fresh database is a prerequisite for each test run, not a reset before each individual `it()` or spec file. Tests may modify data within a run.
- Do not introduce additional database resets, a seed API or Docker orchestration in this project without consultation.
- Account for this prerequisite during reviews and changes: relying on initial data is not automatically an unintended dependency. Nevertheless, scope actions, particularly deletions, to the intended test records wherever possible.
- Browser E2E tests create, modify and delete application data. Run them only against the test instance prepared for this purpose.

## Local Configuration

- The actual application URL, tenants and credentials are stored in the local `cypress.env.json`.
- This file is not committed and is ignored by Git. Do not overwrite or commit it, and do not include credentials in output.
- `cypress.env.json.example` is the committed template and must not contain real credentials.
- The VoteEasy tests read the required values through `cy.env()` using the typed helper in `cypress/support/voteeasy.ts`.

## Checks Without Application Access

- `npm run typecheck`: check TypeScript.
- `npm run test:config`: run regression tests with simulated Cypress commands and synthetic configuration values. These tests do not read local credentials or run browser E2E tests.
