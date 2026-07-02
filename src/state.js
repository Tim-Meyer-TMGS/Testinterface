import { ACCOUNT_TYPES, DEFAULT_ACCOUNTS, INVENTORY_LINK_TYPES, MOVEMENT_TYPES, TAX_MODES, TAX_TYPES } from './constants.js';
import { normalizeBookingAmounts, validateAccount } from './accounting.js';

export function generateId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialState() {
  return {
    schemaVersion: 2,
    accounts: DEFAULT_ACCOUNTS.map((account) => ({ ...account, debitTotal: 0, creditTotal: 0, balance: 0 })),
    bookings: [],
    inventoryItems: [],
    inventoryMovements: [],
    progress: { completedSteps: [], lastUpdated: null },
    settings: { exportedAt: null, createdAt: new Date().toISOString(), lastSavedAt: null }
  };
}

export function generateNextAccountNumber(accounts) {
  const numbers = accounts.map((account) => Number(String(account.accountNo || '').trim())).filter(Number.isFinite);
  return String(numbers.length ? Math.max(...numbers) + 10 : 1000);
}

export function generateBookingNumber(bookings) {
  const numbers = bookings
    .map((booking) => Number(String(booking.documentNo || '').match(/(\d+)$/)?.[1]))
    .filter(Number.isFinite);
  return `BE-${numbers.length ? Math.max(...numbers) + 1 : 1000}`;
}

function normalizeAccount(account, index) {
  return {
    id: String(account.id || generateId('account')),
    accountNo: String(account.accountNo || 1000 + index * 10),
    name: String(account.name || 'Unbenanntes Konto'),
    type: ACCOUNT_TYPES.includes(account.type) ? account.type : 'asset',
    debitTotal: 0,
    creditTotal: 0,
    balance: 0
  };
}

function normalizeBooking(booking, bookings) {
  return normalizeBookingAmounts({
    id: String(booking.id || generateId('booking')),
    date: String(booking.date || new Date().toISOString().slice(0, 10)),
    documentNo: String(booking.documentNo || generateBookingNumber(bookings)),
    description: String(booking.description || ''),
    debitAccountId: String(booking.debitAccountId || ''),
    creditAccountId: String(booking.creditAccountId || ''),
    amount: Number(booking.amount || booking.grossAmount || 0),
    taxType: TAX_TYPES.includes(booking.taxType) ? booking.taxType : 'none',
    taxMode: TAX_MODES.includes(booking.taxMode) ? booking.taxMode : 'net',
    inventoryItemId: booking.inventoryItemId || null,
    inventoryLinkType: INVENTORY_LINK_TYPES.includes(booking.inventoryLinkType) ? booking.inventoryLinkType : (booking.inventoryItemId ? 'in' : 'none'),
    quantity: booking.quantity ? Number(booking.quantity) : null,
    createdAt: booking.createdAt || new Date().toISOString()
  });
}

function normalizeItem(item) {
  return {
    id: String(item.id || generateId('item')),
    sku: String(item.sku || ''),
    name: String(item.name || ''),
    category: String(item.category || ''),
    unit: String(item.unit || ''),
    openingStock: Number(item.openingStock || 0),
    purchasePriceNet: Number(item.purchasePriceNet || 0),
    salePriceNet: Number(item.salePriceNet || 0),
    consumptionPerWeek: Number(item.consumptionPerWeek || 0),
    leadTimeDays: Number(item.leadTimeDays || 7),
    safetyStock: Number(item.safetyStock || 0)
  };
}

function normalizeMovement(movement) {
  return {
    id: String(movement.id || generateId('movement')),
    date: String(movement.date || new Date().toISOString().slice(0, 10)),
    itemId: String(movement.itemId || ''),
    type: MOVEMENT_TYPES.includes(movement.type) ? movement.type : 'in',
    quantity: Number(movement.quantity || 0),
    unitValueNet: Number(movement.unitValueNet || 0),
    description: String(movement.description || ''),
    documentNo: String(movement.documentNo || ''),
    linkedBookingId: movement.linkedBookingId || null
  };
}

export function normalizeState(parsed) {
  const fallback = createInitialState();
  if (!parsed || typeof parsed !== 'object') return fallback;
  const rawAccounts = (Array.isArray(parsed.accounts) && parsed.accounts.length ? parsed.accounts : fallback.accounts).map(normalizeAccount);
  const existingAccountIds = new Set(rawAccounts.map((account) => account.id));
  const accounts = [
    ...rawAccounts,
    ...DEFAULT_ACCOUNTS.filter((account) => !existingAccountIds.has(account.id)).map(normalizeAccount)
  ];
  const bookings = (Array.isArray(parsed.bookings) ? parsed.bookings : []).map((booking) => normalizeBooking(booking, parsed.bookings || []));
  return {
    schemaVersion: 2,
    accounts,
    bookings,
    inventoryItems: (Array.isArray(parsed.inventoryItems) ? parsed.inventoryItems : []).map(normalizeItem),
    inventoryMovements: (Array.isArray(parsed.inventoryMovements) ? parsed.inventoryMovements : []).map(normalizeMovement),
    progress: {
      completedSteps: Array.isArray(parsed.progress?.completedSteps) ? parsed.progress.completedSteps : [],
      lastUpdated: parsed.progress?.lastUpdated || null
    },
    settings: {
      exportedAt: parsed.settings?.exportedAt || parsed.exportedAt || null,
      createdAt: parsed.settings?.createdAt || new Date().toISOString(),
      lastSavedAt: parsed.settings?.lastSavedAt || null,
      selectedAccountId: parsed.settings?.selectedAccountId || null,
      selectedBookingId: parsed.settings?.selectedBookingId || null
    }
  };
}

export function validateState(state) {
  if (!state || typeof state !== 'object') return 'Die Importdatei ist kein gültiges Objekt.';
  if (!Array.isArray(state.accounts) || !Array.isArray(state.bookings) || !Array.isArray(state.inventoryItems) || !Array.isArray(state.inventoryMovements)) {
    return 'Die Importdatei muss Konten, Buchungen, Artikel und Lagerbewegungen enthalten.';
  }
  const accountIds = new Set();
  const accountNos = new Set();
  for (const account of state.accounts) {
    const accountError = validateAccount(account);
    if (accountError) return accountError;
    if (accountIds.has(account.id)) return `Doppelte Konto-ID: ${account.id}`;
    if (accountNos.has(account.accountNo)) return `Doppelte Kontonummer: ${account.accountNo}`;
    accountIds.add(account.id);
    accountNos.add(account.accountNo);
  }
  const itemIds = new Set(state.inventoryItems.map((item) => item.id));
  const bookingIds = new Set();
  for (const booking of state.bookings) {
    if (bookingIds.has(booking.id)) return `Doppelte Buchungs-ID: ${booking.id}`;
    bookingIds.add(booking.id);
    if (!booking.date || !booking.description) return 'Alle Buchungen benötigen Datum und Beschreibung.';
    if (!accountIds.has(booking.debitAccountId) || !accountIds.has(booking.creditAccountId)) return `Buchung ${booking.documentNo} verweist auf ein fehlendes Konto.`;
    if (booking.debitAccountId === booking.creditAccountId) return `Buchung ${booking.documentNo} nutzt dasselbe Soll- und Haben-Konto.`;
    if (Number(booking.amount) <= 0) return `Buchung ${booking.documentNo} benötigt einen Betrag größer 0.`;
    if (booking.inventoryItemId && !itemIds.has(booking.inventoryItemId)) return `Buchung ${booking.documentNo} verweist auf einen fehlenden Artikel.`;
  }
  for (const movement of state.inventoryMovements) {
    if (!itemIds.has(movement.itemId)) return `Lagerbewegung ${movement.documentNo || movement.id} verweist auf einen fehlenden Artikel.`;
    if (movement.linkedBookingId && !bookingIds.has(movement.linkedBookingId)) return `Lagerbewegung ${movement.documentNo || movement.id} verweist auf eine fehlende Buchung.`;
  }
  return null;
}
