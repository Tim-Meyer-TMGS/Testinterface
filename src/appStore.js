import { computed, reactive } from 'vue';
import { buildBookingLines, calculateAccountBalances, calculateTax, getBookingDisplayAmount, normalizeBookingAmounts } from './accounting.js';
import { appendAuditEntries, bookingAccountIds, createAuditEntry, snapshotAccount, snapshotBooking, systemSnapshot } from './audit.js';
import { ACCOUNT_IDS, DATA_TEMPLATES, INVENTORY_LINK_LABELS, INVENTORY_LINK_TYPES, TAX_LABELS, TYPE_LABELS } from './constants.js';
import { toCsv } from './csv.js';
import { calculateInventoryItems, syncMovementForBooking, validateMovement } from './inventory.js';
import { createBlankState, generateBookingNumber, generateId, generateNextAccountNumber, normalizeState, validateState } from './state.js';
import { loadTemplateState, localStorageAdapter } from './storage.js';

export const store = reactive({
  state: normalizeState({}),
  status: 'Nicht gespeichert',
  loading: true,
  error: '',
  selectedAccountId: null,
  selectedBookingId: null
});

export const labels = {
  accountTypes: TYPE_LABELS,
  taxes: TAX_LABELS,
  inventoryLinks: INVENTORY_LINK_LABELS,
  actions: {
    create: 'Angelegt',
    update: 'Geändert',
    delete: 'Gelöscht',
    duplicate: 'Dupliziert',
    import: 'Importiert',
    reset: 'Zurückgesetzt',
    'load-sample': 'Beispieldaten'
  },
  entities: {
    booking: 'Vorgang',
    payment: 'Zahlung',
    account: 'Bereich',
    system: 'System'
  }
};

export const accountOptions = computed(() => store.state.accounts.map((account) => ({
  value: account.id,
  label: `${account.accountNo} ${account.name}`
})));

export const itemOptions = computed(() => store.state.inventoryItems.map((item) => ({
  value: item.id,
  label: item.name
})));

export const bookingTemplates = [
  { id: 'income', label: 'Einnahme', description: 'Geld kommt in die Praxis.', debitAccountId: ACCOUNT_IDS.bank, creditAccountId: ACCOUNT_IDS.sales, taxType: 'none', taxMode: 'net', inventoryLinkType: 'none' },
  { id: 'expense', label: 'Ausgabe', description: 'Kosten werden bezahlt.', debitAccountId: ACCOUNT_IDS.expenses, creditAccountId: ACCOUNT_IDS.bank, taxType: 'input19', taxMode: 'gross', inventoryLinkType: 'none' },
  { id: 'material', label: 'Materialeinkauf', description: 'Praxisbedarf wird eingekauft.', debitAccountId: ACCOUNT_IDS.purchases, creditAccountId: ACCOUNT_IDS.payables, taxType: 'input19', taxMode: 'gross', inventoryLinkType: 'in' },
  { id: 'product-sale', label: 'Prophylaxeverkauf', description: 'Artikel wird verkauft und Material geht raus.', debitAccountId: ACCOUNT_IDS.cash, creditAccountId: ACCOUNT_IDS.productSales, taxType: 'vat19', taxMode: 'gross', inventoryLinkType: 'out' },
  { id: 'transfer', label: 'Umbuchung', description: 'Geld oder offene Posten werden umgebucht.', debitAccountId: ACCOUNT_IDS.bank, creditAccountId: ACCOUNT_IDS.cash, taxType: 'none', taxMode: 'net', inventoryLinkType: 'none' }
];

export const dataTemplates = DATA_TEMPLATES;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('de-DE') : '';
}

export function formatDateTime(value) {
  if (!value) return '';
  return `${new Date(value).toLocaleDateString('de-DE')} ${new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

export function recalculate(nextState = store.state) {
  const inventoryItems = calculateInventoryItems(nextState.inventoryItems, nextState.inventoryMovements);
  const accounts = calculateAccountBalances(nextState.accounts, nextState.bookings);
  return { ...nextState, accounts, inventoryItems };
}

export async function load() {
  store.loading = true;
  store.error = '';
  try {
    store.state = recalculate(await localStorageAdapter.load());
    store.selectedAccountId = store.state.settings.selectedAccountId || store.state.accounts[0]?.id || null;
    store.selectedBookingId = store.state.settings.selectedBookingId || store.state.bookings[0]?.id || null;
    store.status = store.state.settings.lastSavedAt ? `Im Browser gespeichert · ${formatDateTime(store.state.settings.lastSavedAt)}` : 'Beispieldaten geladen';
  } catch (error) {
    store.error = 'Die Daten konnten nicht geladen werden.';
  } finally {
    store.loading = false;
  }
}

export async function commit(nextState, message = 'Im Browser gespeichert', auditEntries = []) {
  store.state = recalculate(normalizeState(appendAuditEntries(nextState, auditEntries)));
  store.state = recalculate(await localStorageAdapter.save(store.state));
  store.status = `${message} · ${formatDateTime(store.state.settings.lastSavedAt)}`;
}

export async function startBlankData() {
  const before = systemSnapshot(store.state);
  const blankState = createBlankState();
  await commit(blankState, 'Leerer Übungsmodus gestartet', [createAuditEntry('reset', 'system', null, {
    title: 'Leerer Übungsmodus',
    summary: 'Alle Bereiche, Vorgänge, Artikel und Bewegungen wurden geleert. Die Konten werden selbst angelegt.',
    before,
    after: systemSnapshot(blankState)
  })]);
  store.selectedAccountId = null;
  store.selectedBookingId = null;
}

export function dashboardSummary() {
  const accountMap = Object.fromEntries(store.state.accounts.map((account) => [account.id, account]));
  const inventoryValue = store.state.inventoryItems.reduce((sum, item) => sum + Number(item.currentValue || 0), 0);
  const cashBalance = accountMap[ACCOUNT_IDS.cash]?.balance || 0;
  const bankBalance = accountMap[ACCOUNT_IDS.bank]?.balance || 0;
  const receivables = accountMap[ACCOUNT_IDS.receivables]?.balance || 0;
  const payables = accountMap[ACCOUNT_IDS.payables]?.balance || 0;
  return {
    totalBalance: cashBalance + bankBalance + receivables + inventoryValue - payables,
    cashAndBank: cashBalance + bankBalance,
    receivables,
    payables,
    inventoryValue
  };
}

export function sortedBookings(limit = null) {
  const rows = store.state.bookings.slice().sort((a, b) => b.date.localeCompare(a.date));
  return limit ? rows.slice(0, limit) : rows;
}

export function sortedAudit(limit = 50, entityType = 'all') {
  return store.state.auditLog
    .filter((entry) => entry.accountIds?.length || entry.entityType === 'system')
    .filter((entry) => entityType === 'all' || entry.entityType === entityType)
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function auditEntriesForAccount(accountId, limit = 30) {
  return store.state.auditLog
    .filter((entry) => entry.accountIds?.includes(accountId))
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function accountLabel(accountId) {
  const account = store.state.accounts.find((entry) => entry.id === accountId);
  return account ? `${account.accountNo} ${account.name}` : accountId;
}

export function bookingKind(booking) {
  if (booking.description?.startsWith('Zahlung:')) return 'Zahlung';
  if (booking.inventoryLinkType === 'in') return 'Material rein';
  if (booking.inventoryLinkType === 'out') return 'Material raus';
  if (booking.taxType?.startsWith('vat')) return 'Verkauf';
  if (booking.taxType?.startsWith('input')) return 'Ausgabe';
  const debit = store.state.accounts.find((account) => account.id === booking.debitAccountId);
  return debit?.type === 'asset' ? 'Einnahme' : 'Vorgang';
}

export function bookingImpact(booking) {
  return buildBookingLines(booking).map((line) => {
    const account = store.state.accounts.find((entry) => entry.id === line.accountId);
    const sign = line.side === 'debit' ? '+' : '-';
    return `${account?.name || line.accountId} ${sign}${formatCurrency(line.amount)}`;
  }).join(' · ');
}

export function buildBookingFromInput(input, bookingId = null) {
  return normalizeBookingAmounts({
    id: bookingId || generateId('booking'),
    date: input.date,
    documentNo: String(input.documentNo || '').trim() || generateBookingNumber(store.state.bookings),
    description: String(input.description || '').trim(),
    debitAccountId: input.debitAccountId,
    creditAccountId: input.creditAccountId,
    amount: Number(input.amount),
    taxType: input.taxType || 'none',
    taxMode: input.taxMode || 'net',
    inventoryItemId: input.inventoryItemId || null,
    inventoryLinkType: input.inventoryLinkType || 'none',
    quantity: input.quantity ? Number(input.quantity) : null,
    createdAt: store.state.bookings.find((booking) => booking.id === bookingId)?.createdAt || new Date().toISOString()
  });
}

export function validateBooking(booking, currentState = store.state) {
  if (!booking.date) return 'Bitte ein Datum eingeben.';
  if (!booking.description) return 'Bitte eine Beschreibung eingeben.';
  if (!currentState.accounts.some((account) => account.id === booking.debitAccountId)) return 'Bitte ein vorhandenes Zielkonto wählen.';
  if (!currentState.accounts.some((account) => account.id === booking.creditAccountId)) return 'Bitte ein vorhandenes Gegenkonto wählen.';
  if (booking.debitAccountId === booking.creditAccountId) return 'Zielkonto und Gegenkonto dürfen nicht identisch sein.';
  if (Number(booking.amount) <= 0) return 'Bitte einen Betrag größer als 0 eingeben.';
  if (booking.inventoryLinkType !== 'none') {
    if (!booking.inventoryItemId) return 'Bitte einen Materialartikel auswählen.';
    if (!booking.quantity || Number(booking.quantity) <= 0) return 'Bitte eine Menge für den Materialartikel eingeben.';
    return validateMovement({
      date: booking.date,
      itemId: booking.inventoryItemId,
      type: booking.inventoryLinkType,
      quantity: Number(booking.quantity),
      unitValueNet: 0
    }, currentState, booking.id);
  }
  return null;
}

export async function saveBooking(input, bookingId = null) {
  const booking = buildBookingFromInput(input, bookingId);
  const error = validateBooking(booking);
  if (error) throw new Error(error);
  const previous = store.state.bookings.find((entry) => entry.id === booking.id);
  let nextState = { ...store.state, bookings: [...store.state.bookings.filter((entry) => entry.id !== booking.id), booking] };
  nextState = syncMovementForBooking(nextState, booking);
  await commit(nextState, 'Vorgang gespeichert', [createAuditEntry(previous ? 'update' : 'create', isPaymentBooking(booking) ? 'payment' : 'booking', booking.id, {
    title: booking.documentNo,
    summary: booking.description,
    accountIds: [...new Set([...(previous ? bookingAccountIds(previous) : []), ...bookingAccountIds(booking)])],
    before: snapshotBooking(previous),
    after: snapshotBooking(booking)
  })]);
  store.selectedBookingId = booking.id;
  return booking;
}

export async function duplicateBooking(id) {
  const source = store.state.bookings.find((booking) => booking.id === id);
  if (!source) return;
  const duplicate = { ...source, id: generateId('booking'), documentNo: generateBookingNumber(store.state.bookings), createdAt: new Date().toISOString() };
  const error = validateBooking(duplicate);
  if (error) throw new Error(error);
  let nextState = { ...store.state, bookings: [...store.state.bookings, duplicate] };
  nextState = syncMovementForBooking(nextState, duplicate);
  await commit(nextState, 'Vorgang dupliziert', [createAuditEntry('duplicate', isPaymentBooking(duplicate) ? 'payment' : 'booking', duplicate.id, {
    title: duplicate.documentNo,
    summary: `Duplikat von ${source.documentNo}: ${duplicate.description}`,
    accountIds: bookingAccountIds(duplicate),
    before: snapshotBooking(source),
    after: snapshotBooking(duplicate)
  })]);
}

export async function deleteBooking(id) {
  const booking = store.state.bookings.find((entry) => entry.id === id);
  if (!booking) return;
  await commit({
    ...store.state,
    bookings: store.state.bookings.filter((entry) => entry.id !== id),
    inventoryMovements: store.state.inventoryMovements.filter((movement) => movement.linkedBookingId !== id)
  }, 'Vorgang gelöscht', [createAuditEntry('delete', isPaymentBooking(booking) ? 'payment' : 'booking', booking.id, {
    title: booking.documentNo,
    summary: booking.description,
    accountIds: bookingAccountIds(booking),
    before: snapshotBooking(booking)
  })]);
}

export async function savePayment(input) {
  if (!input.description || Number(input.amount) <= 0 || input.accountId === input.counterAccountId) throw new Error('Bitte gültige Zahlungsdaten eingeben.');
  if (store.state.accounts.length < 2) throw new Error('Bitte zuerst mindestens zwei Bereiche anlegen.');
  const accountId = store.state.accounts.some((account) => account.id === input.accountId) ? input.accountId : store.state.accounts[0].id;
  const counterAccountId = store.state.accounts.some((account) => account.id === input.counterAccountId) ? input.counterAccountId : store.state.accounts[1].id;
  const booking = normalizeBookingAmounts({
    id: generateId('booking'),
    date: input.date,
    documentNo: String(input.documentNo || '').trim() || generateBookingNumber(store.state.bookings),
    description: `Zahlung: ${input.description}`,
    debitAccountId: input.type === 'deposit' ? accountId : input.type === 'withdrawal' ? counterAccountId : accountId,
    creditAccountId: input.type === 'deposit' ? counterAccountId : input.type === 'withdrawal' ? accountId : counterAccountId,
    amount: Number(input.amount),
    taxType: 'none',
    taxMode: 'net',
    inventoryLinkType: 'none',
    inventoryItemId: null,
    quantity: null,
    createdAt: new Date().toISOString()
  });
  await commit({ ...store.state, bookings: [...store.state.bookings, booking] }, 'Zahlung gespeichert', [createAuditEntry('create', 'payment', booking.id, {
    title: booking.documentNo,
    summary: booking.description,
    accountIds: bookingAccountIds(booking),
    after: snapshotBooking(booking)
  })]);
}

export async function saveAccount(input) {
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Bitte einen Namen eingeben.');
  const accountNo = String(input.accountNo || '').trim() || generateNextAccountNumber(store.state.accounts);
  if (store.state.accounts.some((account) => account.accountNo === accountNo)) throw new Error('Diese Nummer ist bereits vorhanden.');
  const account = { id: generateId('account'), accountNo, name, type: input.type || 'asset' };
  await commit({ ...store.state, accounts: [...store.state.accounts, account] }, 'Bereich gespeichert', [createAuditEntry('create', 'account', account.id, {
    title: `${account.accountNo} ${account.name}`,
    summary: 'Bereich angelegt.',
    accountIds: [account.id],
    after: snapshotAccount(account)
  })]);
  store.selectedAccountId = account.id;
}

export async function deleteAccount(id) {
  if (store.state.bookings.some((booking) => buildBookingLines(booking).some((line) => line.accountId === id))) throw new Error('Dieser Bereich wird in Vorgängen verwendet und kann nicht gelöscht werden.');
  const account = store.state.accounts.find((entry) => entry.id === id);
  if (!account) return;
  await commit({ ...store.state, accounts: store.state.accounts.filter((entry) => entry.id !== id) }, 'Bereich gelöscht', [createAuditEntry('delete', 'account', id, {
    title: `${account.accountNo} ${account.name}`,
    summary: 'Bereich gelöscht.',
    accountIds: [id],
    before: snapshotAccount(account)
  })]);
}

export async function saveInventoryItem(input, id = null) {
  const item = {
    id: id || generateId('item'),
    sku: String(input.sku || '').trim(),
    name: String(input.name || '').trim(),
    category: String(input.category || '').trim(),
    unit: String(input.unit || '').trim(),
    openingStock: Number(input.openingStock || 0),
    purchasePriceNet: Number(input.purchasePriceNet || 0),
    salePriceNet: Number(input.salePriceNet || 0),
    consumptionPerWeek: Number(input.consumptionPerWeek || 0),
    leadTimeDays: Number(input.leadTimeDays || 7),
    safetyStock: Number(input.safetyStock || 0)
  };
  if (!item.sku || !item.name) throw new Error('Bitte Artikelnummer und Artikelnamen eingeben.');
  if (store.state.inventoryItems.some((entry) => entry.sku === item.sku && entry.id !== item.id)) throw new Error('Artikelnummer darf nicht doppelt sein.');
  if ([item.openingStock, item.purchasePriceNet, item.salePriceNet, item.consumptionPerWeek, item.leadTimeDays, item.safetyStock].some((value) => value < 0)) throw new Error('Bestände, Preise und Planwerte dürfen nicht negativ sein.');
  await commit({ ...store.state, inventoryItems: [...store.state.inventoryItems.filter((entry) => entry.id !== item.id), item] }, 'Artikel gespeichert');
}

export async function saveInventoryMovement(input) {
  const movement = {
    id: generateId('movement'),
    date: input.date,
    itemId: input.itemId,
    type: input.type || 'in',
    quantity: Number(input.quantity || 0),
    unitValueNet: Number(input.unitValueNet || 0),
    description: String(input.description || '').trim(),
    documentNo: String(input.documentNo || '').trim(),
    linkedBookingId: null
  };
  const error = validateMovement(movement, store.state);
  if (error) throw new Error(error);
  if (!movement.description) throw new Error('Bitte eine Beschreibung eingeben.');
  await commit({ ...store.state, inventoryMovements: [...store.state.inventoryMovements, movement] }, 'Materialbewegung gespeichert');
}

export async function deleteInventoryMovement(id) {
  const movement = store.state.inventoryMovements.find((entry) => entry.id === id);
  if (movement?.linkedBookingId) throw new Error('Diese Materialbewegung gehört zu einem Vorgang. Bitte den Vorgang bearbeiten oder löschen.');
  await commit({ ...store.state, inventoryMovements: store.state.inventoryMovements.filter((entry) => entry.id !== id) }, 'Materialbewegung gelöscht');
}

export async function resetData() {
  const before = systemSnapshot(store.state);
  const resetState = await localStorageAdapter.reset();
  await commit({ ...resetState, auditLog: store.state.auditLog }, 'Seed-Daten geladen', [createAuditEntry('reset', 'system', null, {
    title: 'Daten zurückgesetzt',
    summary: 'Die Beispieldaten wurden neu geladen. Das Änderungsprotokoll blieb erhalten.',
    before,
    after: systemSnapshot(resetState)
  })]);
}

export async function loadSampleData() {
  await loadDataTemplate('dentist');
}

export async function loadDataTemplate(templateId) {
  const before = systemSnapshot(store.state);
  const template = DATA_TEMPLATES.find((entry) => entry.id === templateId) || DATA_TEMPLATES[0];
  const templateState = await loadTemplateState(template.id);
  await commit({ ...templateState, auditLog: store.state.auditLog }, `${template.label} geladen`, [createAuditEntry('load-sample', 'system', null, {
    title: `${template.label} geladen`,
    summary: `Die Vorlage ${template.label} wurde geladen. Das Änderungsprotokoll blieb erhalten.`,
    before,
    after: systemSnapshot(templateState)
  })]);
  store.selectedAccountId = store.state.accounts[0]?.id || null;
  store.selectedBookingId = store.state.bookings[0]?.id || null;
}

export async function importJsonFile(file) {
  const text = await file.text();
  const imported = normalizeState(JSON.parse(text));
  const error = validateState(imported);
  if (error) throw new Error(error);
  await commit(imported, 'Import gespeichert', [createAuditEntry('import', 'system', null, {
    title: 'JSON-Import',
    summary: 'Daten wurden aus einer JSON-Datei importiert.',
    before: systemSnapshot(store.state),
    after: systemSnapshot(imported)
  })]);
}

export function exportJson() {
  const exportedAt = new Date().toISOString();
  download('buchhaltung-export.json', JSON.stringify({
    ...store.state,
    exportedAt,
    bookings: store.state.bookings.map((booking) => ({ ...booking, bookingLines: buildBookingLines(booking) })),
    settings: { ...store.state.settings, exportedAt }
  }, null, 2), 'application/json');
}

export function exportCsv(type) {
  const rows = type === 'bookings'
    ? [['Datum', 'Beleg', 'Beschreibung', 'Zielkonto', 'Gegenkonto', 'Netto', 'Steuer', 'Steuerbetrag', 'Brutto'], ...store.state.bookings.map((booking) => [
        booking.date,
        booking.documentNo,
        booking.description,
        store.state.accounts.find((account) => account.id === booking.debitAccountId)?.name || '',
        store.state.accounts.find((account) => account.id === booking.creditAccountId)?.name || '',
        booking.netAmount,
        TAX_LABELS[booking.taxType] || booking.taxType,
        booking.taxAmount,
        booking.grossAmount
      ])]
    : [['Artikel', 'SKU', 'Bestand', 'Wert'], ...store.state.inventoryItems.map((item) => [item.name, item.sku, item.currentStock, item.currentValue])];
  download(type === 'bookings' ? 'journal.csv' : 'lager.csv', toCsv(rows), 'text/csv;charset=utf-8;');
}

export function taxSummary(input) {
  return calculateTax(Number(input.amount || 0), input.taxMode, input.taxType);
}

export function getBookingDisplay(booking) {
  return getBookingDisplayAmount(booking);
}

function isPaymentBooking(booking) {
  return Boolean(booking?.description?.startsWith('Zahlung:'));
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
