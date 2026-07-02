import { expect, test } from '@playwright/test';

test('Dashboard und Journal laden', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Vorgänge' }).click();
  await expect(page.getByRole('heading', { name: 'Journal der Vorgänge' })).toBeVisible();
  await expect(page.locator('#booking-list tr')).toHaveCount(27);
  expect(consoleErrors).toEqual([]);
});

test('Details aus Dashboard und Journal im Modal öffnen', async ({ page }) => {
  await page.goto('/');
  await page.locator('#dashboard-booking-history tr').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Vorgang').first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: 'Vorgänge' }).click();
  await page.locator('#booking-list tr').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#detail-modal-body button').first().click();
  await expect(page.getByText('Bereich').first()).toBeVisible();

  await page.locator('#detail-modal-backdrop').click({ position: { x: 4, y: 4 } });
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('Neuer Vorgang erscheint im Änderungsprotokoll', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vorgänge' }).click();
  await page.locator('#booking-date').fill('2026-06-30');
  await page.locator('#booking-document').fill('BE-E2E-AUDIT');
  await page.locator('#booking-description').fill('Audit Test Behandlung');
  await page.locator('#booking-amount').fill('100');
  await page.locator('#booking-tax-type').selectOption('none');
  await page.getByRole('button', { name: 'Vorgang speichern' }).click();

  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await expect(page.locator('#audit-log-list')).toContainText('Audit Test Behandlung');
  await page.locator('#audit-log-list tr').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#detail-modal-title')).toContainText('BE-E2E-AUDIT');
});
