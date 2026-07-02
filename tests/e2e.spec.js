import { expect, test } from '@playwright/test';

test('Dashboard und Journal laden', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Buchungen' }).click();
  await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible();
  await expect(page.locator('#booking-list tr')).toHaveCount(27);
  expect(consoleErrors).toEqual([]);
});
