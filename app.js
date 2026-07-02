import { buildBookingLines, calculateAccountBalances, calculateTax, getBookingDisplayAmount, normalizeBookingAmounts } from './src/accounting.js';
import { ACCOUNT_IDS, INVENTORY_LINK_LABELS, INVENTORY_LINK_TYPES, TAX_LABELS, TYPE_LABELS } from './src/constants.js';
import { toCsv } from './src/csv.js';
import { calculateInventoryItems, syncMovementForBooking, validateMovement } from './src/inventory.js';
import { generateBookingNumber, generateId, generateNextAccountNumber, normalizeState, validateState } from './src/state.js';
import { loadSeedState, localStorageAdapter } from './src/storage.js';

let state = normalizeState({});
let currentView = 'dashboard';
let editingBookingId = null;
let editingItemId = null;

const $ = (id) => document.getElementById(id);
const formatCurrency = (value) => Number(value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const formatDate = (value) => value ? new Date(value).toLocaleDateString('de-DE') : '';
const formatDateTime = (value) => value ? `${new Date(value).toLocaleDateString('de-DE')} ${new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : '';

function text(tag, value, className = '') {
  const node = document.createElement(tag);
  node.textContent = value ?? '';
  if (className) node.className = className;
  return node;
}

function button(label, dataset, className = 'secondary') {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = label;
  Object.entries(dataset).forEach(([key, value]) => {
    node.dataset[key] = value;
  });
  return node;
}

function clear(node) {
  node.replaceChildren();
}

function tr(cells) {
  const row = document.createElement('tr');
  cells.forEach((cell) => row.append(cell instanceof Node ? cell : text('td', cell)));
  return row;
}

function emptyRow(colspan, message) {
  const td = text('td', message, 'empty-state');
  td.colSpan = colspan;
  return tr([td]);
}

function option(value, label, selected = false) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  node.selected = selected;
  return node;
}

function selectOptions(select, entries, selectedValue = '') {
  const current = selectedValue || select.value;
  select.replaceChildren(...entries.map((entry) => option(entry.value, entry.label, entry.value === current)));
}

function setStatus(message) {
  $('last-saved').textContent = message;
}

function recalculate(nextState = state) {
  const inventoryItems = calculateInventoryItems(nextState.inventoryItems, nextState.inventoryMovements);
  const accounts = calculateAccountBalances(nextState.accounts, nextState.bookings);
  return { ...nextState, accounts, inventoryItems };
}

async function persist(message = 'Im Browser gespeichert') {
  state = recalculate(await localStorageAdapter.save(state));
  setStatus(`${message} · ${formatDateTime(state.settings.lastSavedAt)}`);
}

function render() {
  state = recalculate(state);
  renderDashboard();
  renderAccounts();
  renderBookingForm();
  renderBookings();
  renderPayments();
  renderInventoryItems();
  renderInventoryMovements();
}

function setView(view, updateHash = true) {
  const views = ['dashboard', 'accounts', 'bookings', 'payments', 'inventory', 'import-export', 'settings'];
  currentView = views.includes(view) ? view : 'dashboard';
  document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.id === `view-${currentView}`));
  $('page-title').textContent = {
    dashboard: 'Dashboard',
    accounts: 'Bereiche',
    bookings: 'Vorgänge',
    payments: 'Zahlungen',
    inventory: 'Lager',
    'import-export': 'Export / Import',
    settings: 'Einstellungen'
  }[currentView];
  document.querySelectorAll('.nav-button').forEach((navButton) => navButton.classList.toggle('active', navButton.dataset.view === currentView));
  if (updateHash) {
    const hash = currentView === 'dashboard' ? '' : `#${currentView}`;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
  }
}

function syncViewFromHash() {
  setView(window.location.hash.replace('#', ''), false);
}

function renderDashboard() {
  const accountMap = Object.fromEntries(state.accounts.map((account) => [account.id, account]));
  const inventoryValue = state.inventoryItems.reduce((sum, item) => sum + Number(item.currentValue || 0), 0);
  const cashBalance = accountMap[ACCOUNT_IDS.cash]?.balance || 0;
  const bankBalance = accountMap[ACCOUNT_IDS.bank]?.balance || 0;
  const receivables = accountMap[ACCOUNT_IDS.receivables]?.balance || 0;
  const payables = accountMap[ACCOUNT_IDS.payables]?.balance || 0;
  const totalBalance = cashBalance + bankBalance + receivables + inventoryValue - payables;
  $('dashboard-total-balance').textContent = formatCurrency(totalBalance);
  $('dashboard-total-note').textContent = 'Kasse + Bank + offene Patientenrechnungen + Materialwert minus offene Lieferantenrechnungen.';
  const stats = [
    ['Bank + Kasse', formatCurrency(bankBalance + cashBalance)],
    ['Offene Patientenrechnungen', formatCurrency(receivables)],
    ['Offene Lieferantenrechnungen', formatCurrency(payables)],
    ['Materialwert', formatCurrency(inventoryValue)]
  ];
  $('dashboard-stats').replaceChildren(...stats.map(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.append(text('div', label, 'label'), text('div', value, 'value'));
    return card;
  }));

  renderRows('dashboard-account-table', state.accounts.map((account) => tr([
    account.accountNo, account.name, TYPE_LABELS[account.type], formatCurrency(account.debitTotal), formatCurrency(account.creditTotal), formatCurrency(account.balance)
  ])));
  renderRows('dashboard-article-table', state.inventoryItems.map((item) => tr([item.name, item.sku, formatCurrency(item.salePriceNet), item.currentStock, formatCurrency(item.currentValue)])));
  renderRows('dashboard-stock-table', state.inventoryItems.map((item) => {
    const lastMovement = state.inventoryMovements.filter((movement) => movement.itemId === item.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    return tr([item.name, item.unit || '-', item.currentStock, lastMovement ? `${formatDate(lastMovement.date)} · ${lastMovement.description}` : 'Keine Bewegung']);
  }));
  renderRows('dashboard-booking-history', state.bookings.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((booking) => tr([
    formatDate(booking.date), booking.description, formatCurrency(getBookingDisplayAmount(booking))
  ])));
  renderDashboardInventorySummary();
}

function renderDashboardInventorySummary() {
  const summary = $('dashboard-inventory-summary');
  if (!summary) return;
  const relevantItems = state.inventoryItems
    .slice()
    .sort((a, b) => Number(b.needsReorder) - Number(a.needsReorder) || a.currentStock - b.currentStock)
    .slice(0, 5);
  summary.replaceChildren(...(relevantItems.length ? relevantItems.map((item) => {
    const row = document.createElement('div');
    row.className = `dashboard-list-item ${item.needsReorder ? 'needs-attention' : ''}`;
    const main = document.createElement('div');
    main.append(text('strong', item.name), text('span', `${item.currentStock} ${item.unit || ''}`.trim(), 'small'));
    row.append(main, text('span', item.needsReorder ? 'Nachbestellen' : formatCurrency(item.currentValue), item.needsReorder ? 'status-pill critical' : 'dashboard-value'));
    return row;
  }) : [text('div', 'Noch keine Materialartikel vorhanden.', 'empty-state')]));
}

function renderRows(id, rows, fallback = null) {
  const node = $(id);
  node.replaceChildren(...(rows.length ? rows : fallback ? [fallback] : []));
}

function renderAccounts() {
  renderRows('account-list', state.accounts.map((account) => {
    const actions = text('td', '');
    actions.append(button('Anzeigen', { selectAccount: account.id }), button('Löschen', { deleteAccount: account.id }, 'danger'));
    return tr([account.accountNo, account.name, TYPE_LABELS[account.type], formatCurrency(account.debitTotal), formatCurrency(account.creditTotal), formatCurrency(account.balance), actions]);
  }), emptyRow(7, 'Noch keine Bereiche vorhanden.'));
  renderAccountDetails(state.settings.selectedAccountId || state.accounts[0]?.id);
}

function renderAccountDetails(accountId) {
  const account = state.accounts.find((entry) => entry.id === accountId);
  if (!account) {
    $('account-detail-summary').textContent = 'Bitte einen Bereich auswählen.';
    renderRows('account-detail-bookings', [], emptyRow(5, 'Kein Bereich ausgewählt.'));
    return;
  }
  $('account-detail-summary').textContent = `${account.accountNo} ${account.name} · ${TYPE_LABELS[account.type]} · Soll/Ziel ${formatCurrency(account.debitTotal)} · Haben/Quelle ${formatCurrency(account.creditTotal)} · Saldo ${formatCurrency(account.balance)}`;
  const rows = state.bookings
    .filter((booking) => buildBookingLines(booking).some((line) => line.accountId === account.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((booking) => buildBookingLines(booking).filter((line) => line.accountId === account.id).map((line) => tr([
      formatDate(booking.date), booking.documentNo, booking.description, formatCurrency(line.amount), line.side === 'debit' ? 'Soll (Ziel)' : 'Haben (Quelle)'
    ])));
  renderRows('account-detail-bookings', rows, emptyRow(5, 'Keine Vorgänge für diesen Bereich vorhanden.'));
}

function renderBookingForm() {
  const accountOptions = state.accounts.map((account) => ({ value: account.id, label: `${account.accountNo} ${account.name}` }));
  selectOptions($('booking-debit'), accountOptions, $('booking-debit').value || ACCOUNT_IDS.bank);
  selectOptions($('booking-credit'), accountOptions, $('booking-credit').value || ACCOUNT_IDS.sales);
  selectOptions($('booking-item'), [{ value: '', label: 'Kein Artikel' }, ...state.inventoryItems.map((item) => ({ value: item.id, label: item.name }))], $('booking-item').value);
  const linkSelect = $('booking-inventory-link');
  if (linkSelect) {
    selectOptions(linkSelect, INVENTORY_LINK_TYPES.map((type) => ({ value: type, label: INVENTORY_LINK_LABELS[type] })), linkSelect.value || 'none');
  }
  if (!$('booking-date').value) $('booking-date').value = new Date().toISOString().slice(0, 10);
  updateTaxSummary();
}

function renderBookings() {
  const rows = state.bookings.slice().sort((a, b) => b.date.localeCompare(a.date)).map((booking) => {
    const debit = state.accounts.find((account) => account.id === booking.debitAccountId);
    const credit = state.accounts.find((account) => account.id === booking.creditAccountId);
    const item = state.inventoryItems.find((entry) => entry.id === booking.inventoryItemId);
    const actions = text('td', '');
    actions.append(
      button('Anzeigen', { selectBooking: booking.id }),
      button('Bearbeiten', { editBooking: booking.id }),
      button('Duplizieren', { duplicateBooking: booking.id }),
      button('Löschen', { deleteBooking: booking.id }, 'danger')
    );
    return tr([
      formatDate(booking.date),
      booking.documentNo,
      `${booking.description}${item ? ` · Artikel: ${item.name}` : ''}`,
      debit ? `${debit.accountNo} ${debit.name}` : '',
      credit ? `${credit.accountNo} ${credit.name}` : '',
      formatCurrency(booking.netAmount),
      booking.taxType === 'none' ? 'Keine Steuer' : `${TAX_LABELS[booking.taxType]} (${booking.taxMode})`,
      formatCurrency(booking.taxAmount),
      formatCurrency(booking.grossAmount),
      actions
    ]);
  });
  renderRows('booking-list', rows, emptyRow(10, 'Noch keine Vorgänge vorhanden.'));
  renderBookingDetails(state.settings.selectedBookingId || state.bookings[0]?.id);
}

function renderBookingDetails(bookingId) {
  const booking = state.bookings.find((entry) => entry.id === bookingId);
  if (!booking) {
    $('booking-detail-summary').textContent = 'Bitte einen Vorgang auswählen.';
    renderRows('booking-detail-fields', [], emptyRow(2, 'Kein Vorgang ausgewählt.'));
    return;
  }
  const lines = buildBookingLines(booking);
  $('booking-detail-summary').textContent = `${booking.documentNo} · ${booking.description}`;
  renderRows('booking-detail-fields', [
    tr(['Datum', formatDate(booking.date)]),
    tr(['Netto', formatCurrency(booking.netAmount)]),
    tr(['Steuer', formatCurrency(booking.taxAmount)]),
    tr(['Brutto', formatCurrency(booking.grossAmount)]),
    ...lines.map((line) => {
      const account = state.accounts.find((entry) => entry.id === line.accountId);
      return tr([line.side === 'debit' ? 'Soll (Ziel)' : 'Haben (Quelle)', `${account?.accountNo || ''} ${account?.name || ''} · ${formatCurrency(line.amount)} · ${line.label}`]);
    })
  ]);
}

function renderPayments() {
  const accountOptions = state.accounts.map((account) => ({ value: account.id, label: `${account.accountNo} ${account.name}` }));
  selectOptions($('payment-account'), accountOptions, $('payment-account').value || ACCOUNT_IDS.bank);
  selectOptions($('payment-counter-account'), accountOptions, $('payment-counter-account').value || ACCOUNT_IDS.cash);
  const rows = state.bookings.filter((booking) => booking.description.startsWith('Zahlung:')).map((booking) => tr([
    formatDate(booking.date), booking.documentNo, booking.description, formatCurrency(booking.grossAmount)
  ]));
  renderRows('payment-booking-list', rows, emptyRow(4, 'Noch keine Zahlungen erfasst.'));
}

function renderInventoryItems() {
  const rows = state.inventoryItems.map((item) => {
    const actions = text('td', '');
    actions.append(button('Bearbeiten', { editItem: item.id }), button('Korrektur', { adjustItem: item.id }), button('Löschen', { deleteItem: item.id }, 'danger'));
    return tr([item.name, item.sku, item.currentStock, formatCurrency(item.currentValue), actions]);
  });
  renderRows('inventory-item-list', rows, emptyRow(5, 'Noch keine Materialartikel vorhanden.'));
  selectOptions($('movement-item'), state.inventoryItems.map((item) => ({ value: item.id, label: item.name })), $('movement-item').value);
  renderInventoryForecasts();
  updateMovementStockInfo();
}

function renderInventoryForecasts() {
  const grid = $('inventory-forecast-grid');
  clear(grid);
  if (!state.inventoryItems.length) {
    grid.append(text('div', 'Noch keine Materialartikel vorhanden.', 'empty-state'));
    return;
  }
  state.inventoryItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    const header = document.createElement('div');
    header.className = 'forecast-header';
    header.append(text('strong', item.name), text('span', item.status, `status-pill ${item.needsReorder ? 'critical' : item.status === 'Achtung' ? 'warn' : 'ok'}`));
    const metrics = document.createElement('div');
    metrics.className = 'forecast-metrics';
    [
      ['Aktueller Bestand', item.currentStock],
      ['Verbrauch/Woche', item.weeklyConsumption.toFixed(1)],
      ['Meldebestand', item.reorderPoint],
      ['Reserve', item.safetyStock],
      ['Verbleibend', item.daysUntilEmpty === null ? 'Keine Verbrauchsdaten' : `${Math.round(item.daysUntilEmpty)} Tage`],
      ['Nachbestellung', item.needsReorder ? `${item.recommendedOrderQuantity} ${item.unit || ''}`.trim() : 'nicht nötig']
    ].forEach(([label, value]) => {
      const metric = document.createElement('div');
      metric.append(text('span', label), text('strong', value));
      metrics.append(metric);
    });
    card.append(header, metrics);
    grid.append(card);
  });
}

function renderInventoryMovements() {
  const rows = state.inventoryMovements.slice().sort((a, b) => b.date.localeCompare(a.date)).map((movement) => {
    const item = state.inventoryItems.find((entry) => entry.id === movement.itemId);
    const actions = text('td', '');
    actions.append(button('Löschen', { deleteMovement: movement.id }, 'danger'));
    return tr([formatDate(movement.date), item?.name || '', movement.type === 'in' ? 'Zugang (rein)' : movement.type === 'out' ? 'Abgang (raus)' : 'Korrektur', movement.quantity, formatCurrency(movement.unitValueNet), movement.documentNo, actions]);
  });
  renderRows('inventory-movement-list', rows, emptyRow(7, 'Noch keine Materialbewegungen vorhanden.'));
}

function buildBookingFromForm(formData, bookingId = null) {
  return normalizeBookingAmounts({
    id: bookingId || generateId('booking'),
    date: formData.get('bookingDate'),
    documentNo: String(formData.get('bookingDocument') || '').trim() || generateBookingNumber(state.bookings),
    description: String(formData.get('bookingDescription') || '').trim(),
    debitAccountId: formData.get('bookingDebit'),
    creditAccountId: formData.get('bookingCredit'),
    amount: Number(formData.get('bookingAmount')),
    taxType: formData.get('bookingTaxType') || 'none',
    taxMode: formData.get('bookingTaxMode') || 'net',
    inventoryItemId: formData.get('bookingItem') || null,
    inventoryLinkType: formData.get('bookingInventoryLink') || 'none',
    quantity: formData.get('bookingQuantity') ? Number(formData.get('bookingQuantity')) : null,
    createdAt: state.bookings.find((booking) => booking.id === bookingId)?.createdAt || new Date().toISOString()
  });
}

function validateBooking(booking, currentState = state) {
  if (!booking.date) return 'Bitte ein Datum eingeben.';
  if (!booking.description) return 'Bitte eine Beschreibung eingeben.';
  if (!currentState.accounts.some((account) => account.id === booking.debitAccountId)) return 'Bitte ein vorhandenes Zielkonto wählen.';
  if (!currentState.accounts.some((account) => account.id === booking.creditAccountId)) return 'Bitte ein vorhandenes Gegenkonto wählen.';
  if (booking.debitAccountId === booking.creditAccountId) return 'Zielkonto und Gegenkonto dürfen nicht identisch sein.';
  if (Number(booking.amount) <= 0) return 'Bitte einen Betrag größer als 0 eingeben.';
  if (booking.inventoryLinkType !== 'none') {
    if (!booking.inventoryItemId) return 'Bitte einen Materialartikel auswählen.';
    if (!booking.quantity || Number(booking.quantity) <= 0) return 'Bitte eine Menge für den Materialartikel eingeben.';
    const movement = {
      date: booking.date,
      itemId: booking.inventoryItemId,
      type: booking.inventoryLinkType,
      quantity: Number(booking.quantity),
      unitValueNet: 0
    };
    return validateMovement(movement, currentState, booking.id);
  }
  return null;
}

async function commit(nextState, message) {
  state = normalizeState(nextState);
  state = recalculate(state);
  await persist(message);
  render();
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  const booking = buildBookingFromForm(new FormData(event.currentTarget), $('booking-id').value || null);
  const error = validateBooking(booking);
  if (error) return alert(error);

  const withoutBooking = state.bookings.filter((entry) => entry.id !== booking.id);
  let nextState = { ...state, bookings: [...withoutBooking, booking] };
  nextState = syncMovementForBooking(nextState, booking);
  editingBookingId = null;
  event.currentTarget.reset();
  $('booking-id').value = '';
  $('booking-form-title').textContent = 'Neuen Vorgang erfassen';
  await commit(nextState, 'Vorgang gespeichert');
}

async function handleAccountSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = String(formData.get('accountName') || '').trim();
  if (!name) return alert('Bitte einen Namen eingeben.');
  const accountNo = String(formData.get('accountNo') || '').trim() || generateNextAccountNumber(state.accounts);
  if (state.accounts.some((account) => account.accountNo === accountNo)) return alert('Diese Nummer ist bereits vorhanden.');
  const account = { id: generateId('account'), accountNo, name, type: formData.get('accountType') || 'asset' };
  event.currentTarget.reset();
  await commit({ ...state, accounts: [...state.accounts, account] }, 'Bereich gespeichert');
}

async function handleInventoryItemSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const item = {
    id: $('inventory-item-id').value || generateId('item'),
    sku: String(formData.get('inventorySku') || '').trim(),
    name: String(formData.get('inventoryName') || '').trim(),
    category: String(formData.get('inventoryCategory') || '').trim(),
    unit: String(formData.get('inventoryUnit') || '').trim(),
    openingStock: Number(formData.get('inventoryOpening') || 0),
    purchasePriceNet: Number(formData.get('inventoryPurchase') || 0),
    salePriceNet: Number(formData.get('inventorySale') || 0),
    consumptionPerWeek: Number(formData.get('inventoryConsumption') || 0),
    leadTimeDays: Number(formData.get('inventoryLeadTime') || 7),
    safetyStock: Number(formData.get('inventorySafetyStock') || 0)
  };
  if (!item.sku || !item.name) return alert('Bitte Artikelnummer und Artikelnamen eingeben.');
  if (state.inventoryItems.some((entry) => entry.sku === item.sku && entry.id !== item.id)) return alert('Artikelnummer darf nicht doppelt sein.');
  if ([item.openingStock, item.purchasePriceNet, item.salePriceNet, item.consumptionPerWeek, item.leadTimeDays, item.safetyStock].some((value) => value < 0)) return alert('Bestände, Preise und Planwerte dürfen nicht negativ sein.');
  editingItemId = null;
  event.currentTarget.reset();
  $('inventory-item-id').value = '';
  await commit({ ...state, inventoryItems: [...state.inventoryItems.filter((entry) => entry.id !== item.id), item] }, 'Artikel gespeichert');
}

async function handleInventoryMovementSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const movement = {
    id: generateId('movement'),
    date: formData.get('movementDate'),
    itemId: formData.get('movementItem'),
    type: formData.get('movementType') || 'in',
    quantity: Number(formData.get('movementQuantity') || 0),
    unitValueNet: Number(formData.get('movementValue') || 0),
    description: String(formData.get('movementDescription') || '').trim(),
    documentNo: String(formData.get('movementDocument') || '').trim(),
    linkedBookingId: null
  };
  const error = validateMovement(movement, state);
  if (error) return alert(error);
  if (!movement.description) return alert('Bitte eine Beschreibung eingeben.');
  event.currentTarget.reset();
  await commit({ ...state, inventoryMovements: [...state.inventoryMovements, movement] }, 'Materialbewegung gespeichert');
}

async function handlePaymentSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const type = formData.get('paymentType');
  const accountId = formData.get('paymentAccount');
  const counterAccountId = formData.get('paymentCounterAccount');
  const amount = Number(formData.get('paymentAmount'));
  const description = String(formData.get('paymentDescription') || '').trim();
  if (!description || amount <= 0 || accountId === counterAccountId) return alert('Bitte gültige Zahlungsdaten eingeben.');
  const booking = normalizeBookingAmounts({
    id: generateId('booking'),
    date: formData.get('paymentDate'),
    documentNo: String(formData.get('paymentDocument') || '').trim() || generateBookingNumber(state.bookings),
    description: `Zahlung: ${description}`,
    debitAccountId: type === 'deposit' ? accountId : type === 'withdrawal' ? counterAccountId : ACCOUNT_IDS.bank,
    creditAccountId: type === 'deposit' ? counterAccountId : type === 'withdrawal' ? accountId : ACCOUNT_IDS.cash,
    amount,
    taxType: 'none',
    taxMode: 'net',
    inventoryLinkType: 'none',
    inventoryItemId: null,
    quantity: null,
    createdAt: new Date().toISOString()
  });
  event.currentTarget.reset();
  await commit({ ...state, bookings: [...state.bookings, booking] }, 'Zahlung gespeichert');
}

async function handleDeleteBooking(id) {
  const nextState = {
    ...state,
    bookings: state.bookings.filter((booking) => booking.id !== id),
    inventoryMovements: state.inventoryMovements.filter((movement) => movement.linkedBookingId !== id),
    settings: { ...state.settings, selectedBookingId: state.settings.selectedBookingId === id ? null : state.settings.selectedBookingId }
  };
  await commit(nextState, 'Vorgang gelöscht');
}

function handleEditBooking(id) {
  const booking = state.bookings.find((entry) => entry.id === id);
  if (!booking) return;
  editingBookingId = id;
  $('booking-form-title').textContent = 'Vorgang bearbeiten';
  $('booking-id').value = booking.id;
  $('booking-date').value = booking.date;
  $('booking-document').value = booking.documentNo;
  $('booking-description').value = booking.description;
  $('booking-debit').value = booking.debitAccountId;
  $('booking-credit').value = booking.creditAccountId;
  $('booking-amount').value = booking.amount;
  $('booking-tax-type').value = booking.taxType;
  $('booking-tax-mode').value = booking.taxMode;
  $('booking-item').value = booking.inventoryItemId || '';
  $('booking-inventory-link').value = booking.inventoryLinkType || 'none';
  $('booking-quantity').value = booking.quantity || '';
  updateTaxSummary();
  setView('bookings');
}

async function handleDuplicateBooking(id) {
  const source = state.bookings.find((booking) => booking.id === id);
  if (!source) return;
  const duplicate = { ...source, id: generateId('booking'), documentNo: generateBookingNumber(state.bookings), createdAt: new Date().toISOString() };
  const error = validateBooking(duplicate);
  if (error) return alert(error);
  let nextState = { ...state, bookings: [...state.bookings, duplicate] };
  nextState = syncMovementForBooking(nextState, duplicate);
  await commit(nextState, 'Vorgang dupliziert');
}

async function handleDeleteAccount(id) {
  if (state.bookings.some((booking) => booking.debitAccountId === id || booking.creditAccountId === id)) return alert('Dieser Bereich wird in Vorgängen verwendet und kann nicht gelöscht werden.');
  await commit({ ...state, accounts: state.accounts.filter((account) => account.id !== id) }, 'Bereich gelöscht');
}

async function handleDeleteItem(id) {
  if (state.bookings.some((booking) => booking.inventoryItemId === id)) return alert('Dieser Artikel wird in Vorgängen verwendet und kann nicht gelöscht werden.');
  if (state.inventoryMovements.some((movement) => movement.itemId === id)) return alert('Dieser Artikel hat Materialbewegungen und kann nicht gelöscht werden.');
  await commit({ ...state, inventoryItems: state.inventoryItems.filter((item) => item.id !== id) }, 'Artikel gelöscht');
}

async function handleDeleteMovement(id) {
  const movement = state.inventoryMovements.find((entry) => entry.id === id);
  if (movement?.linkedBookingId) return alert('Diese Materialbewegung gehört zu einem Vorgang. Bitte den Vorgang bearbeiten oder löschen.');
  await commit({ ...state, inventoryMovements: state.inventoryMovements.filter((entry) => entry.id !== id) }, 'Materialbewegung gelöscht');
}

async function handleAdjustItem(id) {
  const item = state.inventoryItems.find((entry) => entry.id === id);
  if (!item) return;
  const delta = Number(prompt('Bestandskorrektur eingeben (z. B. +5 oder -2):', '0'));
  if (!Number.isFinite(delta) || delta === 0) return alert('Bitte eine gültige Zahl eingeben.');
  const description = prompt('Beschreibung der Korrektur:', 'Bestandskorrektur') || 'Bestandskorrektur';
  const movement = { id: generateId('movement'), date: new Date().toISOString().slice(0, 10), itemId: id, type: 'adjustment', quantity: delta, unitValueNet: item.purchasePriceNet, description, documentNo: '', linkedBookingId: null };
  await commit({ ...state, inventoryMovements: [...state.inventoryMovements, movement] }, 'Bestand korrigiert');
}

function handleEditItem(id) {
  const item = state.inventoryItems.find((entry) => entry.id === id);
  if (!item) return;
  editingItemId = id;
  $('inventory-item-id').value = item.id;
  $('inventory-sku').value = item.sku;
  $('inventory-name').value = item.name;
  $('inventory-category').value = item.category;
  $('inventory-unit').value = item.unit;
  $('inventory-opening').value = item.openingStock;
  $('inventory-purchase').value = item.purchasePriceNet;
  $('inventory-sale').value = item.salePriceNet;
  $('inventory-consumption').value = item.consumptionPerWeek;
  $('inventory-lead-time').value = item.leadTimeDays;
  $('inventory-safety-stock').value = item.safetyStock;
  setView('inventory');
}

function updateTaxSummary() {
  const result = calculateTax(Number($('booking-amount').value || 0), $('booking-tax-mode').value, $('booking-tax-type').value);
  $('booking-tax-summary').textContent = `Netto: ${formatCurrency(result.netAmount)} | Steuer: ${formatCurrency(result.taxAmount)} | Brutto: ${formatCurrency(result.grossAmount)}`;
}

function updateMovementStockInfo() {
  const item = state.inventoryItems.find((entry) => entry.id === $('movement-item').value);
  $('movement-stock-info').textContent = item ? `Aktueller Bestand: ${item.currentStock} ${item.unit || ''}`.trim() : 'Bitte einen Artikel wählen.';
}

async function resetData() {
  if (!confirm('Alle Daten wirklich zurücksetzen?')) return;
  state = await localStorageAdapter.reset();
  render();
  setStatus('Seed-Daten geladen');
}

async function loadSampleData() {
  await commit(await loadSeedState(), 'Beispieldaten geladen');
}

function exportJson() {
  const exportedAt = new Date().toISOString();
  const payload = {
    ...state,
    exportedAt,
    bookings: state.bookings.map((booking) => ({
      ...booking,
      bookingLines: buildBookingLines(booking)
    })),
    settings: { ...state.settings, exportedAt }
  };
  download('buchhaltung-export.json', JSON.stringify(payload, null, 2), 'application/json');
}

function exportCsv(type) {
  const rows = type === 'bookings'
    ? [['Datum', 'Beleg', 'Beschreibung', 'Zielkonto', 'Gegenkonto', 'Netto', 'Steuer', 'Steuerbetrag', 'Brutto'], ...state.bookings.map((booking) => [
        booking.date,
        booking.documentNo,
        booking.description,
        state.accounts.find((account) => account.id === booking.debitAccountId)?.name || '',
        state.accounts.find((account) => account.id === booking.creditAccountId)?.name || '',
        booking.netAmount,
        TAX_LABELS[booking.taxType] || booking.taxType,
        booking.taxAmount,
        booking.grossAmount
      ])]
    : [['Artikel', 'SKU', 'Bestand', 'Wert'], ...state.inventoryItems.map((item) => [item.name, item.sku, item.currentStock, item.currentValue])];
  download(type === 'bookings' ? 'journal.csv' : 'lager.csv', toCsv(rows), 'text/csv;charset=utf-8;');
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

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const imported = normalizeState(JSON.parse(reader.result));
      const error = validateState(imported);
      if (error) return alert(error);
      await commit(imported, 'Import gespeichert');
    } catch (error) {
      alert('Die Datei konnte nicht importiert werden.');
    }
  };
  reader.readAsText(file);
}

function wireEvents() {
  document.querySelectorAll('.nav-button').forEach((navButton) => navButton.addEventListener('click', () => {
    setView(navButton.dataset.view);
    document.body.classList.remove('menu-open');
    $('menu-toggle')?.setAttribute('aria-expanded', 'false');
  }));
  $('menu-toggle')?.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('menu-open');
    $('menu-toggle').setAttribute('aria-expanded', String(isOpen));
  });
  window.addEventListener('hashchange', syncViewFromHash);
  $('account-form').addEventListener('submit', handleAccountSubmit);
  $('booking-form').addEventListener('submit', handleBookingSubmit);
  $('payment-form').addEventListener('submit', handlePaymentSubmit);
  $('inventory-item-form').addEventListener('submit', handleInventoryItemSubmit);
  $('inventory-movement-form').addEventListener('submit', handleInventoryMovementSubmit);
  $('booking-cancel').addEventListener('click', () => {
    editingBookingId = null;
    $('booking-form').reset();
    $('booking-id').value = '';
    $('booking-form-title').textContent = 'Neuen Vorgang erfassen';
    renderBookingForm();
  });
  $('inventory-item-cancel').addEventListener('click', () => {
    editingItemId = null;
    $('inventory-item-form').reset();
    $('inventory-item-id').value = '';
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.openView) setView(target.dataset.openView);
    if (target.dataset.selectBooking) {
      state.settings = { ...state.settings, selectedBookingId: target.dataset.selectBooking };
      renderBookingDetails(target.dataset.selectBooking);
    }
    if (target.dataset.deleteBooking) handleDeleteBooking(target.dataset.deleteBooking);
    if (target.dataset.editBooking) handleEditBooking(target.dataset.editBooking);
    if (target.dataset.duplicateBooking) handleDuplicateBooking(target.dataset.duplicateBooking);
    if (target.dataset.selectAccount) {
      state.settings = { ...state.settings, selectedAccountId: target.dataset.selectAccount };
      renderAccountDetails(target.dataset.selectAccount);
    }
    if (target.dataset.deleteAccount) handleDeleteAccount(target.dataset.deleteAccount);
    if (target.dataset.editItem) handleEditItem(target.dataset.editItem);
    if (target.dataset.adjustItem) handleAdjustItem(target.dataset.adjustItem);
    if (target.dataset.deleteItem) handleDeleteItem(target.dataset.deleteItem);
    if (target.dataset.deleteMovement) handleDeleteMovement(target.dataset.deleteMovement);
  });
  ['booking-amount', 'booking-tax-mode', 'booking-tax-type'].forEach((id) => $(id).addEventListener('input', updateTaxSummary));
  $('movement-item').addEventListener('change', updateMovementStockInfo);
  $('export-json').addEventListener('click', exportJson);
  $('export-bookings-csv').addEventListener('click', () => exportCsv('bookings'));
  $('export-inventory-csv').addEventListener('click', () => exportCsv('inventory'));
  $('import-json').addEventListener('change', handleImport);
  $('reset-data').addEventListener('click', resetData);
  $('load-sample-data').addEventListener('click', loadSampleData);
}

async function init() {
  state = recalculate(await localStorageAdapter.load());
  wireEvents();
  render();
  syncViewFromHash();
  setStatus(state.settings.lastSavedAt ? `Im Browser gespeichert · ${formatDateTime(state.settings.lastSavedAt)}` : 'Seed-Daten geladen');
}

init();
