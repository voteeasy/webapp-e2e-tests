import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: '14eb45bb-bbc1-4aca-9714-0c6f910cc588',
  defaultBrowser: 'firefox',
  video: true,
  watchForFileChanges: false,
  e2e: {
    setupNodeEvents(_on, config) {
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
