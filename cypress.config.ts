import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: '14eb45bb-bbc1-4aca-9714-0c6f910cc588',
  video: true,
  watchForFileChanges: false,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    // setupNodeEvents(on, config) {
    //  return require('./cypress/plugins/index.js')(on, config)
    //},
    specPattern: 'cypress/e2e/voteeasy/**/*.{js,jsx,ts,tsx}',
  },
})
