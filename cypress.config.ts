import { defineConfig } from 'cypress'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export default defineConfig({
  projectId: '14eb45bb-bbc1-4aca-9714-0c6f910cc588',
  defaultBrowser: 'firefox',
  video: true,
  watchForFileChanges: false,
  e2e: {
    setupNodeEvents(_on, config) {
      if (!existsSync(join(config.projectRoot, 'cypress.env.json'))) {
        console.warn(
          'Warning: cypress.env.json is missing. A local configuration is required to run the VoteEasy tests. '
          + 'Create your own cypress.env.json by copying cypress.env.json.example '
          + 'and entering your local application URL, tenants and credentials before running the tests.',
        )
      }

      // Use Cypress's detected channels rather than assuming an OS-specific installation.
      const hasFirefoxChannel = (channel: string) => config.browsers.some(
        (browser) => browser.name === 'firefox' && browser.channel === channel,
      )
      if (config.defaultBrowser === 'firefox'
        && !hasFirefoxChannel('stable') && hasFirefoxChannel('dev')) {
        config.defaultBrowser = 'firefox:dev'
      }
      // Keep Firefox required if neither channel exists; explicit --browser still takes precedence.
      return config
    },
    specPattern: 'cypress/e2e/voteeasy/**/*.{js,jsx,ts,tsx}',
  },
})
