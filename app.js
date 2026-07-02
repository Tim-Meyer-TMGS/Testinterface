const STORAGE_KEY = 'buchhaltungs-uebung-data-v1';
const DATA_FILE_URL = './data/app-data.json';
const DEFAULT_STATE = {
  schemaVersion: 1,
  accounts: [],
  bookings: [],
  inventoryItems: [],
  inventoryMovements: [],
  progress: { completedSteps: [], lastUpdated: null },
  settings: { exportedAt: null, createdAt: null, lastSavedAt: null }
};

let state = createInitialState();
let currentView = 'dashboard';
let editingBookingId = null;
let editingItemId = null;

function getElement(id) {
  return document.getElementById(id);
}

function setStatusMessage(message) {
  const status = getElement('last-saved');
  if (status) {
    status.textContent = message;
  }
}

function resetForm(formId, hiddenFieldId = null) {
  const form = getElement(formId);
  if (form) {
    form.reset();
  }
  if (hiddenFieldId) {
    const hiddenField = getElement(hiddenFieldId);
    if (hiddenField) {
      hiddenField.value = '';
    }
  }
}

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateNextAccountNumber() {
  const numericValues = state.accounts
    .map((account) => Number(String(account.accountNo || '').trim()))
    .filter((value) => Number.isFinite(value));
  const nextValue = numericValues.length ? Math.max(...numericValues) + 10 : 1000;
  return String(nextValue);
}

function generateBookingNumber() {
  const numericValues = state.bookings
    .map((booking) => Number(String(booking.documentNo || '').match(/(\d+)$/)?.[1]))
    .filter((value) => Number.isFinite(value));
  const nextValue = numericValues.length ? Math.max(...numericValues) + 1 : 1000;
  return `BE-${nextValue}`;
}

function ensureDataNumbers() {
  state.accounts = state.accounts.map((account) => ({
    ...account,
    accountNo: String(account.accountNo || '').trim() || generateNextAccountNumber()
  }));

  state.bookings = state.bookings.map((booking) => ({
    ...booking,
    documentNo: String(booking.documentNo || '').trim() || generateBookingNumber()
  }));
}

function normalizeState(parsed) {
  return {
    schemaVersion: parsed?.schemaVersion || 1,
    accounts: Array.isArray(parsed?.accounts) ? parsed.accounts : [],
    bookings: Array.isArray(parsed?.bookings) ? parsed.bookings : [],
    inventoryItems: Array.isArray(parsed?.inventoryItems) ? parsed.inventoryItems : [],
    inventoryMovements: Array.isArray(parsed?.inventoryMovements) ? parsed.inventoryMovements : [],
    progress: parsed?.progress && typeof parsed.progress === 'object'
      ? { completedSteps: Array.isArray(parsed.progress.completedSteps) ? parsed.progress.completedSteps : [], lastUpdated: parsed.progress.lastUpdated || null }
      : { completedSteps: [], lastUpdated: null },
    settings: parsed?.settings && typeof parsed.settings === 'object'
      ? {
          exportedAt: parsed.settings.exportedAt || null,
          createdAt: parsed.settings.createdAt || null,
          lastSavedAt: parsed.settings.lastSavedAt || null
        }
      : { exportedAt: null, createdAt: null, lastSavedAt: null }
  };
}

async function loadSeedState() {
  try {
    const response = await fetch(DATA_FILE_URL, { cache: 'no-store' });
    if (response.ok) {
      return normalizeState(await response.json());
    }
  } catch (error) {
    console.error('Fehler beim Laden aus der statischen JSON-Datei', error);
  }

  return createInitialState();
}

async function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = normalizeState(JSON.parse(raw));
      state = parsed;
      ensureDataNumbers();
      return state;
    }
  } catch (error) {
    console.error('Fehler beim Laden aus localStorage', error);
  }

  const parsed = await loadSeedState();
  state = parsed;
  ensureDataNumbers();
  return state;
}

function createInitialState() {
  return {
    schemaVersion: 1,
    accounts: [],
    bookings: [],
    inventoryItems: [],
    inventoryMovements: [],
    progress: { completedSteps: [], lastUpdated: null },
    settings: { exportedAt: null, createdAt: new Date().toISOString(), lastSavedAt: null }
  };
}

function saveState() {
  state.progress = {
    completedSteps: Array.isArray(state.progress?.completedSteps) ? state.progress.completedSteps : [],
    lastUpdated: new Date().toISOString()
  };
  state.settings = {
    ...state.settings,
    lastSavedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const timestamp = new Date().toISOString();
  setStatusMessage('Im Browser gespeichert · ' + formatDateTime(timestamp));
}

function calculateAccountBalances() {
  state.accounts = state.accounts.map((account) => {
    const debitTotal = state.bookings.filter((booking) => booking.debitAccountId === account.id).reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
    const creditTotal = state.bookings.filter((booking) => booking.creditAccountId === account.id).reduce((sum, booking) => sum + Number(booking.amount || 0), 0);
    let balance = 0;
    if (account.type === 'asset' || account.type === 'expense') {
      balance = debitTotal - creditTotal;
    } else if (account.type === 'liability' || account.type === 'revenue') {
      balance = creditTotal - debitTotal;
    } else if (account.type === 'tax') {
      balance = 0;
    }
    return { ...account, debitTotal, creditTotal, balance };
  });
}

function calculateInventoryStock() {
  state.inventoryItems = state.inventoryItems.map((item) => {
    const openingStock = Number(item.openingStock || 0);
    const totalIn = state.inventoryMovements.filter((movement) => movement.itemId === item.id && movement.type === 'in').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const totalOut = state.inventoryMovements.filter((movement) => movement.itemId === item.id && movement.type === 'out').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const totalAdjustments = state.inventoryMovements.filter((movement) => movement.itemId === item.id && movement.type === 'adjustment').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const currentStock = openingStock + totalIn - totalOut + totalAdjustments;
    return { ...item, currentStock, currentValue: currentStock * Number(item.purchasePriceNet || 0) };
  });
}

function calculateInventoryValue() {
  state.inventoryItems = state.inventoryItems.map((item) => ({
    ...item,
    currentValue: Number(item.currentStock || 0) * Number(item.purchasePriceNet || 0)
  }));
}

function calculateTax(amount, mode, taxType) {
  const amountNumber = Number(amount || 0);
  const round2 = (value) => Math.round(value * 100) / 100;
  if (!taxType || taxType === 'none') {
    const netAmount = mode === 'gross' ? round2(amountNumber) : round2(amountNumber);
    return { netAmount, taxAmount: 0, grossAmount: round2(mode === 'gross' ? amountNumber : amountNumber) };
  }
  const rate = taxType.includes('19') ? 0.19 : 0.07;
  if (mode === 'net') {
    const netAmount = round2(amountNumber);
    const taxAmount = round2(netAmount * rate);
    return { netAmount, taxAmount, grossAmount: round2(netAmount + taxAmount) };
  }
  const grossAmount = round2(amountNumber);
  const netAmount = round2(grossAmount / (1 + rate));
  const taxAmount = round2(grossAmount - netAmount);
  return { netAmount, taxAmount, grossAmount };
}

function recalculateAll() {
  calculateAccountBalances();
  calculateInventoryStock();
  calculateInventoryValue();
}

function render() {
  recalculateAll();
  renderDashboard();
  renderAccounts();
  renderBookingForm();
  renderBookings();
  renderPayments();
  renderInventoryItems();
  renderInventoryMovements();
  saveState();
}

function setView(view, updateHash = true) {
  currentView = view;
  document.querySelectorAll('.view').forEach((section) => section.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.getElementById('page-title').textContent = {
    dashboard: 'Dashboard',
    accounts: 'Konten',
    bookings: 'Buchungen',
    payments: 'Zahlungen',
    inventory: 'Lager',
    'import-export': 'Export / Import',
    settings: 'Einstellungen'
  }[view];
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  if (updateHash) {
    const hash = view === 'dashboard' ? '' : `#${view}`;
    const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
    if (window.location.href !== `${window.location.origin}${nextUrl}`) {
      window.history.replaceState(null, '', nextUrl);
    }
  }
}

function syncViewFromHash() {
  const views = ['dashboard', 'accounts', 'bookings', 'payments', 'inventory', 'import-export', 'settings'];
  const requestedView = window.location.hash.replace('#', '');
  const resolvedView = views.includes(requestedView) ? requestedView : 'dashboard';
  setView(resolvedView, false);
}

function renderDashboard() {
  const accountMap = Object.fromEntries(state.accounts.map((account) => [account.id, account]));
  const cash = accountMap['account-cash']?.balance || 0;
  const bank = accountMap['account-bank']?.balance || 0;
  const receivables = accountMap['account-receivables']?.balance || 0;
  const payables = accountMap['account-payables']?.balance || 0;
  const inventoryValue = state.inventoryItems.reduce((sum, item) => sum + Number(item.currentValue || 0), 0);
  const stats = [
    { label: 'Kassenbestand', value: formatCurrency(cash) },
    { label: 'Bankbestand', value: formatCurrency(bank) },
    { label: 'Forderungen offen', value: formatCurrency(receivables) },
    { label: 'Verbindlichkeiten offen', value: formatCurrency(payables) },
    { label: 'Gespeicherte Buchungen', value: state.bookings.length },
    { label: 'Anzahl Lagerartikel', value: state.inventoryItems.length },
    { label: 'Lagerwert gesamt', value: formatCurrency(inventoryValue) },
    { label: 'Letzter Speicherstatus', value: state.settings?.lastSavedAt ? formatDateTime(state.settings.lastSavedAt) : 'Noch nicht gespeichert' }
  ];

  document.getElementById('dashboard-stats').innerHTML = stats.map((stat) => `
    <div class="stat-card">
      <div class="label">${stat.label}</div>
      <div class="value">${stat.value}</div>
    </div>
  `).join('');

  document.getElementById('dashboard-account-table').innerHTML = state.accounts.map((account) => `
    <tr>
      <td>${account.accountNo || ''}</td>
      <td>${account.name}</td>
      <td>${labelForType(account.type)}</td>
      <td>${formatCurrency(account.debitTotal)}</td>
      <td>${formatCurrency(account.creditTotal)}</td>
      <td>${formatCurrency(account.balance)}</td>
    </tr>
  `).join('');

  document.getElementById('dashboard-article-table').innerHTML = state.inventoryItems.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.sku}</td>
      <td>${formatCurrency(item.salePriceNet || 0)}</td>
      <td>${item.currentStock ?? item.openingStock}</td>
      <td>${formatCurrency(item.currentValue || 0)}</td>
    </tr>
  `).join('');

  document.getElementById('dashboard-stock-table').innerHTML = state.inventoryItems.map((item) => {
    const lastMovement = state.inventoryMovements
      .filter((movement) => movement.itemId === item.id)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return `
      <tr>
        <td>${item.name}</td>
        <td>${item.unit || '-'}</td>
        <td>${item.currentStock ?? item.openingStock}</td>
        <td>${lastMovement ? `${formatDate(lastMovement.date)} · ${lastMovement.description}` : 'Keine Bewegung'}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('dashboard-booking-history').innerHTML = state.bookings
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)
    .map((booking) => `
      <tr>
        <td>${formatDate(booking.date)}</td>
        <td>${booking.documentNo || ''}</td>
        <td>${booking.description}</td>
        <td class="amount-cell">${formatCurrency(booking.amount)}</td>
      </tr>
    `)
    .join('');

  document.getElementById('dashboard-inventory-summary').innerHTML = state.inventoryItems.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.currentStock ?? item.openingStock}</td>
      <td class="amount-cell">${formatCurrency(item.currentValue || 0)}</td>
    </tr>
  `).join('');
}

function renderAccounts() {
  document.getElementById('account-list').innerHTML = state.accounts.map((account) => `
    <tr>
      <td>${account.accountNo || ''}</td>
      <td>${account.name}</td>
      <td>${labelForType(account.type)}</td>
      <td>${formatCurrency(account.debitTotal)}</td>
      <td>${formatCurrency(account.creditTotal)}</td>
      <td>${formatCurrency(account.balance)}</td>
      <td>
        <button type="button" class="secondary" data-select-account="${account.id}">Anzeigen</button>
        <button type="button" class="secondary" data-delete-account="${account.id}">Löschen</button>
      </td>
    </tr>
  `).join('');

  const selectedAccountId = state.settings?.selectedAccountId || state.accounts[0]?.id;
  if (selectedAccountId) {
    renderAccountDetails(selectedAccountId);
  }
}

function renderAccountDetails(accountId) {
  const account = state.accounts.find((entry) => entry.id === accountId);
  if (!account) {
    document.getElementById('account-detail-summary').innerHTML = 'Bitte ein Konto auswählen.';
    document.getElementById('account-detail-bookings').innerHTML = '<tr><td colspan="5" class="empty-state">Kein Konto ausgewählt.</td></tr>';
    return;
  }

  const bookings = state.bookings.filter((booking) => booking.debitAccountId === account.id || booking.creditAccountId === account.id);
  const bookingRows = bookings
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((booking) => {
      const isDebit = booking.debitAccountId === account.id;
      return `
        <tr>
          <td>${formatDate(booking.date)}</td>
          <td>${booking.documentNo || '-'}</td>
          <td>${booking.description}</td>
          <td class="amount-cell">${formatCurrency(booking.amount)}</td>
          <td>${isDebit ? 'Soll' : 'Haben'}</td>
        </tr>
      `;
    })
    .join('');

  document.getElementById('account-detail-summary').innerHTML = `
    <strong>${account.accountNo || ''} ${account.name}</strong><br />
    Typ: ${labelForType(account.type)} · Soll: ${formatCurrency(account.debitTotal)} · Haben: ${formatCurrency(account.creditTotal)} · Saldo: ${formatCurrency(account.balance)}
  `;
  document.getElementById('account-detail-bookings').innerHTML = bookingRows || '<tr><td colspan="5" class="empty-state">Keine Buchungen für dieses Konto vorhanden.</td></tr>';
}

function renderBookingForm() {
  const debitSelect = document.getElementById('booking-debit');
  const creditSelect = document.getElementById('booking-credit');
  const itemSelect = document.getElementById('booking-item');
  const bookingDate = document.getElementById('booking-date');

  debitSelect.innerHTML = state.accounts.map((account) => `<option value="${account.id}" ${account.id === 'account-cash' ? 'selected' : ''}>${account.name}</option>`).join('');
  creditSelect.innerHTML = state.accounts.map((account) => `<option value="${account.id}" ${account.id === 'account-revenue' ? 'selected' : ''}>${account.name}</option>`).join('');
  itemSelect.innerHTML = ['<option value="">Kein Artikel</option>', ...state.inventoryItems.map((item) => `<option value="${item.id}">${item.name}</option>`)].join('');

  if (!bookingDate.value) {
    bookingDate.value = new Date().toISOString().slice(0, 10);
  }
}

function renderBookings() {
  const bookingRows = state.bookings
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((booking) => {
      const debitAccount = state.accounts.find((account) => account.id === booking.debitAccountId);
      const creditAccount = state.accounts.find((account) => account.id === booking.creditAccountId);
      const itemName = state.inventoryItems.find((item) => item.id === booking.inventoryItemId)?.name || '';
      return `
        <tr>
          <td>${formatDate(booking.date)}</td>
          <td>${booking.documentNo || ''}</td>
          <td>${booking.description}<br><span class="small">${itemName ? 'Artikel: ' + itemName : ''}</span></td>
          <td>${debitAccount?.name || ''}</td>
          <td>${creditAccount?.name || ''}</td>
          <td class="amount-cell">${formatCurrency(booking.netAmount || booking.amount || 0)}</td>
          <td>${booking.taxType && booking.taxType !== 'none' ? `${labelForTax(booking.taxType)} (${booking.taxMode})` : '—'}</td>
          <td class="amount-cell">${formatCurrency(booking.grossAmount || booking.amount || 0)}</td>
          <td>
            <button type="button" class="secondary" data-select-booking="${booking.id}">Anzeigen</button>
            <button type="button" class="secondary" data-edit-booking="${booking.id}">Bearbeiten</button>
            <button type="button" class="secondary" data-duplicate-booking="${booking.id}">Duplizieren</button>
            <button type="button" class="danger" data-delete-booking="${booking.id}">Löschen</button>
          </td>
        </tr>
      `;
    })
    .join('');

  document.getElementById('booking-list').innerHTML = bookingRows || '<tr><td colspan="9" class="empty-state">Noch keine Buchungen vorhanden.</td></tr>';

  const selectedBookingId = state.settings?.selectedBookingId || state.bookings[0]?.id;
  if (selectedBookingId) {
    renderBookingDetails(selectedBookingId);
  }
}

function renderBookingDetails(bookingId) {
  const booking = state.bookings.find((entry) => entry.id === bookingId);
  if (!booking) {
    document.getElementById('booking-detail-summary').innerHTML = 'Bitte eine Buchung auswählen.';
    document.getElementById('booking-detail-fields').innerHTML = '<tr><td colspan="2" class="empty-state">Keine Buchung ausgewählt.</td></tr>';
    return;
  }

  const debitAccount = state.accounts.find((account) => account.id === booking.debitAccountId);
  const creditAccount = state.accounts.find((account) => account.id === booking.creditAccountId);
  const item = state.inventoryItems.find((entry) => entry.id === booking.inventoryItemId);

  const rows = [
    ['Beleg', booking.documentNo || '-'],
    ['Beschreibung', booking.description],
    ['Datum', formatDate(booking.date)],
    ['Soll-Konto', `${debitAccount?.accountNo || ''} ${debitAccount?.name || ''}`.trim()],
    ['Haben-Konto', `${creditAccount?.accountNo || ''} ${creditAccount?.name || ''}`.trim()],
    ['Betrag', formatCurrency(booking.amount)],
    ['Steuer', booking.taxType && booking.taxType !== 'none' ? `${labelForTax(booking.taxType)} (${booking.taxMode})` : 'Keine Steuer'],
    ['Artikel', item?.name || 'Kein Artikel'],
    ['Menge', booking.quantity ? `${booking.quantity} ${item?.unit || ''}`.trim() : '-']
  ];

  document.getElementById('booking-detail-summary').innerHTML = `<strong>${booking.documentNo || booking.description}</strong><br />${booking.description}`;
  document.getElementById('booking-detail-fields').innerHTML = rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join('');
}

function renderPayments() {
  const paymentSelects = [document.getElementById('payment-account'), document.getElementById('payment-counter-account')];
  paymentSelects.forEach((select) => {
    select.innerHTML = state.accounts.map((account) => `<option value="${account.id}">${account.name}</option>`).join('');
  });
  document.getElementById('payment-account').value = 'account-bank';
  document.getElementById('payment-counter-account').value = 'account-cash';

  const paymentBookings = state.bookings.filter((booking) => booking.description.startsWith('Zahlung:'));
  document.getElementById('payment-booking-list').innerHTML = paymentBookings.length
    ? paymentBookings.map((booking) => `
        <tr>
          <td>${formatDate(booking.date)}</td>
          <td>${booking.documentNo || ''}</td>
          <td>${booking.description}</td>
          <td class="amount-cell">${formatCurrency(booking.amount)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" class="empty-state">Noch keine Zahlungen erfasst.</td></tr>';
}

function renderInventoryItems() {
  const itemRows = state.inventoryItems.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.sku}</td>
      <td>${item.currentStock ?? item.openingStock}</td>
      <td class="amount-cell">${formatCurrency(item.currentValue || 0)}</td>
      <td>
        <button type="button" class="secondary" data-edit-item="${item.id}">Bearbeiten</button>
        <button type="button" class="secondary" data-adjust-item="${item.id}">Korrektur</button>
        <button type="button" class="danger" data-delete-item="${item.id}">Löschen</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('inventory-item-list').innerHTML = itemRows || '<tr><td colspan="5" class="empty-state">Noch keine Lagerartikel vorhanden.</td></tr>';
  document.getElementById('movement-item').innerHTML = state.inventoryItems.map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
  updateMovementStockInfo();
}

function renderInventoryMovements() {
  const movementRows = state.inventoryMovements
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((movement) => {
      const item = state.inventoryItems.find((entry) => entry.id === movement.itemId);
      const label = movement.type === 'in' ? 'Zugang' : movement.type === 'out' ? 'Abgang' : 'Korrektur';
      return `
        <tr>
          <td>${formatDate(movement.date)}</td>
          <td>${item?.name || ''}</td>
          <td>${label}</td>
          <td>${movement.quantity}</td>
          <td class="amount-cell">${formatCurrency(movement.unitValueNet || 0)}</td>
          <td>${movement.documentNo || ''}</td>
          <td><button type="button" class="danger" data-delete-movement="${movement.id}">Löschen</button></td>
        </tr>
      `;
    })
    .join('');

  document.getElementById('inventory-movement-list').innerHTML = movementRows || '<tr><td colspan="7" class="empty-state">Noch keine Lagerbewegungen vorhanden.</td></tr>';
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatDate(dateString) {
  if (!dateString) return '';
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;
  return value.toLocaleDateString('de-DE');
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;
  return `${value.toLocaleDateString('de-DE')} ${value.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

function labelForType(type) {
  return {
    asset: 'Aktivkonto',
    liability: 'Passivkonto',
    revenue: 'Ertragskonto',
    expense: 'Aufwandskonto',
    tax: 'Steuerkonto'
  }[type] || type;
}

function labelForTax(taxType) {
  return {
    none: 'Keine Steuer',
    vat19: '19% USt',
    vat7: '7% USt',
    input19: '19% Vorsteuer',
    input7: '7% Vorsteuer'
  }[taxType] || taxType;
}

function validateBooking(formData) {
  if (!formData.date) return 'Bitte ein Datum eingeben.';
  if (!formData.description) return 'Bitte eine Beschreibung eingeben.';
  if (!formData.debitAccountId || !formData.creditAccountId) return 'Bitte Soll- und Haben-Konto wählen.';
  if (formData.debitAccountId === formData.creditAccountId) return 'Soll- und Haben-Konto dürfen nicht identisch sein.';
  if (!state.accounts.some((account) => account.id === formData.debitAccountId)) return 'Bitte ein vorhandenes Soll-Konto wählen.';
  if (!state.accounts.some((account) => account.id === formData.creditAccountId)) return 'Bitte ein vorhandenes Haben-Konto wählen.';
  if (Number(formData.amount) <= 0) return 'Bitte einen Betrag größer als 0 eingeben.';
  if (formData.inventoryItemId && (!formData.quantity || Number(formData.quantity) <= 0)) return 'Bitte eine Menge für den Lagerartikel eingeben.';
  return null;
}

function validateInventoryItem(formData) {
  if (!formData.sku) return 'Bitte eine Artikelnummer eingeben.';
  if (!formData.name) return 'Bitte einen Artikelnamen eingeben.';
  if (Number(formData.openingStock) < 0) return 'Der Anfangsbestand darf nicht negativ sein.';
  if (Number(formData.purchasePriceNet) < 0 || Number(formData.salePriceNet) < 0) return 'Preise dürfen nicht negativ sein.';
  const exists = state.inventoryItems.some((item) => item.sku === formData.sku && item.id !== editingItemId);
  if (exists) return 'Artikelnummer darf nicht doppelt sein.';
  return null;
}

function getInventoryItemStock(itemId) {
  const item = state.inventoryItems.find((entry) => entry.id === itemId);
  return Number(item?.currentStock ?? item?.openingStock ?? 0);
}

function updateMovementStockInfo() {
  const itemId = document.getElementById('movement-item').value;
  const info = document.getElementById('movement-stock-info');
  if (!itemId) {
    info.textContent = 'Bitte einen Artikel wählen.';
    return;
  }
  const item = state.inventoryItems.find((entry) => entry.id === itemId);
  const stock = getInventoryItemStock(itemId);
  info.textContent = `Aktueller Bestand: ${stock} ${item?.unit || ''}`.trim();
}

function validateMovement(formData) {
  if (!formData.date) return 'Bitte ein Datum eingeben.';
  if (!formData.itemId) return 'Bitte einen Artikel auswählen.';
  if (formData.type !== 'adjustment' && Number(formData.quantity) <= 0) return 'Bitte eine Menge größer als 0 eingeben.';
  if (formData.type === 'adjustment' && Number(formData.quantity) === 0) return 'Bitte eine Menge größer als 0 eingeben.';
  if (Number(formData.unitValueNet) < 0) return 'Der Einzelwert darf nicht negativ sein.';
  if (formData.type === 'out' && Number(formData.quantity) > getInventoryItemStock(formData.itemId)) {
    return 'Der Lagerbestand reicht für diesen Abgang nicht aus.';
  }
  return null;
}

function inferInventoryMovementTypeForBooking(booking) {
  const debitAccountId = booking.debitAccountId;
  const creditAccountId = booking.creditAccountId;

  const purchaseLikeAccounts = ['account-purchases', 'account-expenses', 'account-input-vat'];
  const salesLikeAccounts = ['account-sales', 'account-revenue'];

  if (purchaseLikeAccounts.includes(debitAccountId) || purchaseLikeAccounts.includes(creditAccountId) || creditAccountId === 'account-payables') {
    return 'in';
  }

  if (salesLikeAccounts.includes(debitAccountId) || salesLikeAccounts.includes(creditAccountId) || debitAccountId === 'account-bank' || debitAccountId === 'account-cash') {
    return 'out';
  }

  return null;
}

function createInventoryMovementFromBooking(booking) {
  if (!booking.inventoryItemId || !booking.quantity || Number(booking.quantity) <= 0) {
    return null;
  }

  const item = state.inventoryItems.find((entry) => entry.id === booking.inventoryItemId);
  if (!item) {
    return null;
  }

  const movementType = inferInventoryMovementTypeForBooking(booking);
  if (!movementType) {
    return null;
  }

  const unitValueNet = Number(item.purchasePriceNet || 0) > 0
    ? Number(item.purchasePriceNet)
    : Number(booking.amount || 0) / Number(booking.quantity || 1);

  return {
    id: generateId('movement'),
    date: booking.date,
    itemId: booking.inventoryItemId,
    type: movementType,
    quantity: Number(booking.quantity),
    unitValueNet,
    description: movementType === 'out' ? 'Lagerabgang' : 'Wareneingang',
    documentNo: booking.documentNo || '',
    linkedBookingId: booking.id
  };
}

function syncInventoryMovementForBooking(booking) {
  const existingMovement = state.inventoryMovements.find((movement) => movement.linkedBookingId === booking.id);
  const nextMovement = createInventoryMovementFromBooking(booking);

  if (!nextMovement) {
    if (existingMovement) {
      state.inventoryMovements = state.inventoryMovements.filter((movement) => movement.id !== existingMovement.id);
    }
    return;
  }

  if (existingMovement) {
    state.inventoryMovements = state.inventoryMovements.map((movement) => (movement.id === existingMovement.id ? { ...movement, ...nextMovement, id: existingMovement.id } : movement));
  } else {
    state.inventoryMovements.push(nextMovement);
  }
}

function buildBookingFromForm(formData, bookingId = null) {
  return {
    id: bookingId || generateId('booking'),
    date: formData.get('bookingDate'),
    documentNo: String(formData.get('bookingDocument') || '').trim() || generateBookingNumber(),
    description: formData.get('bookingDescription'),
    debitAccountId: formData.get('bookingDebit'),
    creditAccountId: formData.get('bookingCredit'),
    amount: Number(formData.get('bookingAmount')),
    taxType: formData.get('bookingTaxType') || 'none',
    taxMode: formData.get('bookingTaxMode') || 'net',
    netAmount: 0,
    taxAmount: 0,
    grossAmount: 0,
    inventoryItemId: formData.get('bookingItem') || null,
    quantity: formData.get('bookingQuantity') ? Number(formData.get('bookingQuantity')) : null,
    createdAt: new Date().toISOString()
  };
}

function buildInventoryItemFromForm(formData, itemId = null) {
  return {
    id: itemId || generateId('item'),
    sku: String(formData.get('inventorySku') || '').trim(),
    name: String(formData.get('inventoryName') || '').trim(),
    category: String(formData.get('inventoryCategory') || '').trim(),
    unit: String(formData.get('inventoryUnit') || '').trim(),
    openingStock: Number(formData.get('inventoryOpening') || 0),
    purchasePriceNet: Number(formData.get('inventoryPurchase') || 0),
    salePriceNet: Number(formData.get('inventorySale') || 0)
  };
}

function buildInventoryMovementFromForm(formData) {
  return {
    id: generateId('movement'),
    date: formData.get('movementDate'),
    itemId: formData.get('movementItem'),
    type: formData.get('movementType') || 'in',
    quantity: Number(formData.get('movementQuantity') || 0),
    unitValueNet: Number(formData.get('movementValue') || 0),
    description: formData.get('movementDescription'),
    documentNo: formData.get('movementDocument'),
    linkedBookingId: null
  };
}

function handleBookingSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const booking = buildBookingFromForm(formData, getElement('booking-id').value || null);

  const error = validateBooking({ ...booking, amount: booking.amount });
  if (error) {
    alert(error);
    return;
  }

  const tax = calculateTax(booking.amount, booking.taxMode, booking.taxType);
  booking.netAmount = tax.netAmount;
  booking.taxAmount = tax.taxAmount;
  booking.grossAmount = tax.grossAmount;

  if (editingBookingId) {
    state.bookings = state.bookings.map((entry) => (entry.id === editingBookingId ? booking : entry));
    editingBookingId = null;
  } else {
    state.bookings.push(booking);
  }

  syncInventoryMovementForBooking(booking);

  event.currentTarget.reset();
  document.getElementById('booking-id').value = '';
  document.getElementById('booking-form-title').textContent = 'Neue Buchung';
  document.getElementById('booking-date').value = new Date().toISOString().slice(0, 10);
  render();
}

function handleAccountSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = String(formData.get('accountName') || '').trim();
  if (!name) {
    alert('Bitte einen Kontonamen eingeben.');
    return;
  }
  const accountNo = String(formData.get('accountNo') || '').trim() || generateNextAccountNumber();
  state.accounts.push({
    id: generateId('account'),
    accountNo,
    name,
    type: formData.get('accountType') || 'asset',
    debitTotal: 0,
    creditTotal: 0,
    balance: 0
  });
  event.currentTarget.reset();
  render();
}

function handleInventoryItemSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const item = buildInventoryItemFromForm(formData, getElement('inventory-item-id').value || null);
  const error = validateInventoryItem(item);
  if (error) {
    alert(error);
    return;
  }
  if (editingItemId) {
    state.inventoryItems = state.inventoryItems.map((entry) => (entry.id === editingItemId ? item : entry));
    editingItemId = null;
  } else {
    state.inventoryItems.push(item);
  }
  resetForm('inventory-item-form', 'inventory-item-id');
  getElement('inventory-item-cancel').style.display = 'none';
  render();
}

function handleInventoryMovementSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const movement = buildInventoryMovementFromForm(formData);
  const error = validateMovement(movement);
  if (error) {
    alert(error);
    return;
  }
  state.inventoryMovements.push(movement);
  event.currentTarget.reset();
  render();
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const type = formData.get('paymentType');
  const accountId = formData.get('paymentAccount');
  const counterAccountId = formData.get('paymentCounterAccount');
  const amount = Number(formData.get('paymentAmount'));
  const description = String(formData.get('paymentDescription') || '').trim();
  if (!description) {
    alert('Bitte eine Beschreibung eingeben.');
    return;
  }
  if (!accountId || !counterAccountId) {
    alert('Bitte beide Konten wählen.');
    return;
  }
  if (amount <= 0) {
    alert('Bitte einen Betrag größer als 0 eingeben.');
    return;
  }

  const booking = {
    id: generateId('booking'),
    date: formData.get('paymentDate'),
    documentNo: String(formData.get('paymentDocument') || '').trim() || generateBookingNumber(),
    description: `Zahlung: ${description}`,
    debitAccountId: type === 'deposit' ? accountId : type === 'withdrawal' ? counterAccountId : 'account-bank',
    creditAccountId: type === 'deposit' ? counterAccountId : type === 'withdrawal' ? accountId : 'account-cash',
    amount,
    taxType: 'none',
    taxMode: 'net',
    netAmount: amount,
    taxAmount: 0,
    grossAmount: amount,
    inventoryItemId: null,
    quantity: null,
    createdAt: new Date().toISOString()
  };

  state.bookings.push(booking);
  event.currentTarget.reset();
  render();
}

function handleDeleteBooking(id) {
  const booking = state.bookings.find((entry) => entry.id === id);
  state.bookings = state.bookings.filter((entry) => entry.id !== id);
  if (state.settings?.selectedBookingId === id) {
    state.settings = { ...state.settings, selectedBookingId: null };
  }
  if (booking?.inventoryItemId) {
    state.inventoryMovements = state.inventoryMovements.filter((movement) => movement.linkedBookingId !== id);
  }
  render();
}

function handleSelectBooking(id) {
  state.settings = { ...state.settings, selectedBookingId: id };
  renderBookingDetails(id);
}

function handleEditBooking(id) {
  const booking = state.bookings.find((entry) => entry.id === id);
  if (!booking) return;
  editingBookingId = id;
  document.getElementById('booking-form-title').textContent = 'Buchung bearbeiten';
  document.getElementById('booking-id').value = booking.id;
  document.getElementById('booking-date').value = booking.date;
  document.getElementById('booking-document').value = booking.documentNo || '';
  document.getElementById('booking-description').value = booking.description;
  document.getElementById('booking-debit').value = booking.debitAccountId;
  document.getElementById('booking-credit').value = booking.creditAccountId;
  document.getElementById('booking-amount').value = booking.amount;
  document.getElementById('booking-tax-type').value = booking.taxType || 'none';
  document.getElementById('booking-tax-mode').value = booking.taxMode || 'net';
  document.getElementById('booking-item').value = booking.inventoryItemId || '';
  document.getElementById('booking-quantity').value = booking.quantity || '';
  updateTaxSummary();
  setView('bookings');
}

function handleDuplicateBooking(id) {
  const booking = state.bookings.find((entry) => entry.id === id);
  if (!booking) return;
  const duplicate = {
    ...booking,
    id: generateId('booking'),
    documentNo: generateBookingNumber(),
    createdAt: new Date().toISOString()
  };
  state.bookings.push(duplicate);
  render();
}

function handleDeleteAccount(id) {
  state.accounts = state.accounts.filter((account) => account.id !== id);
  if (state.settings?.selectedAccountId === id) {
    state.settings = { ...state.settings, selectedAccountId: null };
  }
  render();
}

function handleSelectAccount(id) {
  state.settings = { ...state.settings, selectedAccountId: id };
  renderAccountDetails(id);
}

function handleDeleteItem(id) {
  state.inventoryItems = state.inventoryItems.filter((item) => item.id !== id);
  state.inventoryMovements = state.inventoryMovements.filter((movement) => movement.itemId !== id);
  render();
}

function handleAdjustItem(id) {
  const item = state.inventoryItems.find((entry) => entry.id === id);
  if (!item) return;

  const deltaInput = prompt('Bestandskorrektur eingeben (z. B. +5 oder -2):', '0');
  if (deltaInput === null) return;

  const delta = Number(deltaInput);
  if (!Number.isFinite(delta) || delta === 0) {
    alert('Bitte eine gültige Zahl eingeben.');
    return;
  }

  const description = prompt('Beschreibung der Korrektur:', 'Bestandskorrektur');
  state.inventoryMovements.push({
    id: generateId('movement'),
    date: new Date().toISOString().slice(0, 10),
    itemId: item.id,
    type: 'adjustment',
    quantity: delta,
    unitValueNet: Number(item.purchasePriceNet || 0),
    description: description || 'Bestandskorrektur',
    documentNo: '',
    linkedBookingId: null
  });
  render();
}

function handleEditItem(id) {
  const item = state.inventoryItems.find((entry) => entry.id === id);
  if (!item) return;
  editingItemId = id;
  document.getElementById('inventory-item-id').value = item.id;
  document.getElementById('inventory-sku').value = item.sku;
  document.getElementById('inventory-name').value = item.name;
  document.getElementById('inventory-category').value = item.category;
  document.getElementById('inventory-unit').value = item.unit;
  document.getElementById('inventory-opening').value = item.openingStock;
  document.getElementById('inventory-purchase').value = item.purchasePriceNet;
  document.getElementById('inventory-sale').value = item.salePriceNet;
  setView('inventory');
}

function handleDeleteMovement(id) {
  state.inventoryMovements = state.inventoryMovements.filter((movement) => movement.id !== id);
  render();
}

function updateTaxSummary() {
  const amount = Number(document.getElementById('booking-amount').value || 0);
  const mode = document.getElementById('booking-tax-mode').value || 'net';
  const taxType = document.getElementById('booking-tax-type').value || 'none';
  const result = calculateTax(amount, mode, taxType);
  document.getElementById('booking-tax-summary').textContent = `Netto: ${formatCurrency(result.netAmount)} | Steuer: ${formatCurrency(result.taxAmount)} | Brutto: ${formatCurrency(result.grossAmount)}`;
}

async function resetData() {
  if (!confirm('Alle Daten wirklich löschen?')) return;
  localStorage.removeItem(STORAGE_KEY);
  const parsed = await loadSeedState();
  state = parsed;
  ensureDataNumbers();
  recalculateAll();
  saveState();
  render();
}

async function loadSampleData() {
  const parsed = await loadSeedState();
  state = parsed;
  ensureDataNumbers();
  recalculateAll();
  saveState();
  render();
}

function exportJson() {
  state.settings = {
    ...state.settings,
    exportedAt: new Date().toISOString()
  };
  const exportPayload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    ...state
  };
  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'buchhaltung-export.json';
  link.click();
  URL.revokeObjectURL(url);
  saveState();
}

function exportCsv(type) {
  let csv = '';
  if (type === 'bookings') {
    csv = ['Datum;Beleg;Beschreibung;Soll;Haben;Betrag'].concat(state.bookings.map((booking) => `${booking.date};${booking.documentNo || ''};${booking.description};${findAccountName(booking.debitAccountId)};${findAccountName(booking.creditAccountId)};${booking.amount}`)).join('\n');
  } else {
    csv = ['Artikel;SKU;Bestand;Wert'].concat(state.inventoryItems.map((item) => `${item.name};${item.sku};${item.currentStock ?? item.openingStock};${item.currentValue || 0}`)).join('\n');
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = type === 'bookings' ? 'journal.csv' : 'lager.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function findAccountName(id) {
  return state.accounts.find((account) => account.id === id)?.name || '';
}

function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const validPayload = parsed && typeof parsed === 'object' && Array.isArray(parsed.accounts) && Array.isArray(parsed.bookings) && Array.isArray(parsed.inventoryItems) && Array.isArray(parsed.inventoryMovements);
      if (!validPayload) {
        alert('Die Importdatei ist ungültig.');
        return;
      }
      state = normalizeState(parsed);
      recalculateAll();
      render();
    } catch (error) {
      alert('Die Datei konnte nicht importiert werden.');
    }
  };
  reader.readAsText(file);
}

function wireEvents() {
  document.querySelectorAll('.nav-button').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  window.addEventListener('hashchange', syncViewFromHash);

  document.getElementById('account-form').addEventListener('submit', handleAccountSubmit);
  document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);
  document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmit);
  document.getElementById('inventory-item-form').addEventListener('submit', handleInventoryItemSubmit);
  document.getElementById('inventory-movement-form').addEventListener('submit', handleInventoryMovementSubmit);
  document.getElementById('booking-cancel').addEventListener('click', () => {
    editingBookingId = null;
    document.getElementById('booking-form').reset();
    document.getElementById('booking-form-title').textContent = 'Neue Buchung';
    document.getElementById('booking-id').value = '';
    document.getElementById('booking-date').value = new Date().toISOString().slice(0, 10);
  });
  document.getElementById('inventory-item-cancel').addEventListener('click', () => {
    editingItemId = null;
    document.getElementById('inventory-item-form').reset();
    document.getElementById('inventory-item-id').value = '';
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target.matches('[data-select-booking]')) handleSelectBooking(target.dataset.selectBooking);
    if (target.matches('[data-delete-booking]')) handleDeleteBooking(target.dataset.deleteBooking);
    if (target.matches('[data-edit-booking]')) handleEditBooking(target.dataset.editBooking);
    if (target.matches('[data-duplicate-booking]')) handleDuplicateBooking(target.dataset.duplicateBooking);
    if (target.matches('[data-select-account]')) handleSelectAccount(target.dataset.selectAccount);
    if (target.matches('[data-delete-account]')) handleDeleteAccount(target.dataset.deleteAccount);
    if (target.matches('[data-edit-item]')) handleEditItem(target.dataset.editItem);
    if (target.matches('[data-adjust-item]')) handleAdjustItem(target.dataset.adjustItem);
    if (target.matches('[data-delete-item]')) handleDeleteItem(target.dataset.deleteItem);
    if (target.matches('[data-delete-movement]')) handleDeleteMovement(target.dataset.deleteMovement);
  });

  document.getElementById('booking-amount').addEventListener('input', updateTaxSummary);
  document.getElementById('booking-tax-mode').addEventListener('change', updateTaxSummary);
  document.getElementById('booking-tax-type').addEventListener('change', updateTaxSummary);
  document.getElementById('movement-item').addEventListener('change', updateMovementStockInfo);

  document.getElementById('export-json').addEventListener('click', exportJson);
  document.getElementById('export-bookings-csv').addEventListener('click', () => exportCsv('bookings'));
  document.getElementById('export-inventory-csv').addEventListener('click', () => exportCsv('inventory'));
  document.getElementById('import-json').addEventListener('change', handleImport);
  document.getElementById('reset-data').addEventListener('click', resetData);
  document.getElementById('load-sample-data').addEventListener('click', loadSampleData);
}

async function init() {
  state = await loadState();
  ensureDataNumbers();
  recalculateAll();
  wireEvents();
  render();
  syncViewFromHash();
}

init();
