import { expect, test } from '@playwright/test';

test('Dashboard und Journal laden', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Buchungen' }).click();
  await expect(page.getByText('Journal')).toBeVisible();
  await expect(page.locator('#booking-list tr')).toHaveCount(5);
});
