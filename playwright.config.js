export default {
  testDir: './tests',
  testMatch: '**/*.spec.js',
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    trace: 'retain-on-failure'
  }
};
