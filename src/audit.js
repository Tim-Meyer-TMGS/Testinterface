import { buildBookingLines, normalizeBookingAmounts } from './accounting.js';

export const AUDIT_ACTIONS = ['create', 'update', 'delete', 'duplicate', 'import', 'reset', 'load-sample'];
export const AUDIT_ENTITY_TYPES = ['booking', 'payment', 'account', 'system'];

export function normalizeAuditLog(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry, index) => ({
      id: String(entry.id || `log-${index + 1}`),
      timestamp: String(entry.timestamp || new Date().toISOString()),
      action: AUDIT_ACTIONS.includes(entry.action) ? entry.action : 'update',
      entityType: AUDIT_ENTITY_TYPES.includes(entry.entityType) ? entry.entityType : 'system',
      entityId: entry.entityId ? String(entry.entityId) : null,
      title: String(entry.title || 'Aenderung'),
      accountIds: uniqueStrings(entry.accountIds),
      summary: String(entry.summary || ''),
      before: normalizeSnapshot(entry.before),
      after: normalizeSnapshot(entry.after)
    }));
}

export function createAuditEntry(action, entityType, entityId, data = {}) {
  return {
    id: data.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: data.timestamp || new Date().toISOString(),
    action: AUDIT_ACTIONS.includes(action) ? action : 'update',
    entityType: AUDIT_ENTITY_TYPES.includes(entityType) ? entityType : 'system',
    entityId: entityId ? String(entityId) : null,
    title: String(data.title || 'Aenderung'),
    accountIds: uniqueStrings(data.accountIds),
    summary: String(data.summary || ''),
    before: normalizeSnapshot(data.before),
    after: normalizeSnapshot(data.after)
  };
}

export function appendAuditEntries(state, entries = []) {
  const normalizedEntries = normalizeAuditLog(entries);
  if (!normalizedEntries.length) return state;
  return {
    ...state,
    auditLog: [...normalizeAuditLog(state.auditLog), ...normalizedEntries]
  };
}

export function bookingAccountIds(booking) {
  if (!booking) return [];
  return uniqueStrings(buildBookingLines(booking).map((line) => line.accountId));
}

export function snapshotBooking(booking) {
  if (!booking) return null;
  const normalized = normalizeBookingAmounts(booking);
  return {
    date: normalized.date,
    documentNo: normalized.documentNo,
    description: normalized.description,
    debitAccountId: normalized.debitAccountId,
    creditAccountId: normalized.creditAccountId,
    amount: normalized.amount,
    netAmount: normalized.netAmount,
    taxAmount: normalized.taxAmount,
    grossAmount: normalized.grossAmount,
    taxType: normalized.taxType,
    taxMode: normalized.taxMode,
    inventoryItemId: normalized.inventoryItemId || null,
    inventoryLinkType: normalized.inventoryLinkType || 'none',
    quantity: normalized.quantity || null
  };
}

export function snapshotAccount(account) {
  if (!account) return null;
  return {
    accountNo: account.accountNo,
    name: account.name,
    type: account.type
  };
}

export function systemSnapshot(state) {
  if (!state) return null;
  return {
    accounts: Array.isArray(state.accounts) ? state.accounts.length : 0,
    bookings: Array.isArray(state.bookings) ? state.bookings.length : 0,
    inventoryItems: Array.isArray(state.inventoryItems) ? state.inventoryItems.length : 0,
    inventoryMovements: Array.isArray(state.inventoryMovements) ? state.inventoryMovements.length : 0
  };
}

function normalizeSnapshot(value) {
  if (!value || typeof value !== 'object') return null;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, entry ?? null]));
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String))];
}
