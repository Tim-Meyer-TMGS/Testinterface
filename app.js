const STORAGE_KEY = 'buchhaltungs-uebung-data-v1';
const DEFAULT_STATE = {
  accounts: [],
  bookings: [],
  inventoryItems: [],
  inventoryMovements: []
};

let state = loadState();
let currentView = 'dashboard';
let editingBookingId = null;
let editingItemId = null;

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      inventoryItems: Array.isArray(parsed.inventoryItems) ? parsed.inventoryItems : [],
      inventoryMovements: Array.isArray(parsed.inventoryMovements) ? parsed.inventoryMovements : []
    };
  } catch (error) {
    console.error('Fehler beim Laden', error);
    return createInitialState();
  }
}

function createInitialState() {
  const accounts = [
    { id: 'account-cash', name: 'Kasse', type: 'asset', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-bank', name: 'Bank', type: 'asset', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-receivables', name: 'Forderungen', type: 'asset', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-payables', name: 'Verbindlichkeiten', type: 'liability', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-purchases', name: 'Wareneinkauf', type: 'expense', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-sales', name: 'Warenverkauf', type: 'revenue', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-inventory', name: 'Lagerbestand', type: 'asset', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-revenue', name: 'Erlöse', type: 'revenue', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-expenses', name: 'Aufwendungen', type: 'expense', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-vat', name: 'Umsatzsteuer', type: 'tax', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-input-vat', name: 'Vorsteuer', type: 'tax', debitTotal: 0, creditTotal: 0, balance: 0 },
    { id: 'account-equity', name: 'Eigenkapital', type: 'liability', debitTotal: 0, creditTotal: 0, balance: 0 }
  ];

  const inventoryItems = [
    { id: 'item-1', sku: 'ART-001', name: 'Betriebsbedarf', category: 'Material', unit: 'Stk', openingStock: 10, purchasePriceNet: 8, salePriceNet: 12 },
    { id: 'item-2', sku: 'ART-002', name: 'Desinfektionsmittel', category: 'Material', unit: 'Flasche', openingStock: 5, purchasePriceNet: 4.5, salePriceNet: 7.5 }
  ];

  return { accounts, bookings: [], inventoryItems, inventoryMovements: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  document.getElementById('last-saved').textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE');
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
  if (!taxType || taxType === 'none') {
    return { netAmount: mode === 'gross' ? amountNumber / 1.19 : amountNumber, taxAmount: 0, grossAmount: mode === 'gross' ? amountNumber : amountNumber * 1.19 };
  }
  const rate = taxType.includes('19') ? 0.19 : 0.07;
  if (mode === 'net') {
    const taxAmount = amountNumber * rate;
    return { netAmount: amountNumber, taxAmount, grossAmount: amountNumber + taxAmount };
  }
  const netAmount = amountNumber / (1 + rate);
  const taxAmount = amountNumber - netAmount;
  return { netAmount, taxAmount, grossAmount: amountNumber };
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

function setView(view) {
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
    { label: 'Anzahl Lagerartikel', value: state.inventoryItems.length },
    { label: 'Lagerwert gesamt', value: formatCurrency(inventoryValue) },
    { label: 'Gespeicherte Buchungen', value: state.bookings.length }
  ];

  document.getElementById('dashboard-stats').innerHTML = stats.map((stat) => `
    <div class="stat-card">
      <div class="label">${stat.label}</div>
      <div class="value">${stat.value}</div>
    </div>
  `).join('');

  document.getElementById('dashboard-account-table').innerHTML = state.accounts.map((account) => `
    <tr>
      <td>${account.name}</td>
      <td>${labelForType(account.type)}</td>
      <td>${formatCurrency(account.debitTotal)}</td>
      <td>${formatCurrency(account.creditTotal)}</td>
      <td>${formatCurrency(account.balance)}</td>
    </tr>
  `).join('');
}

function renderAccounts() {
  document.getElementById('account-list').innerHTML = state.accounts.map((account) => `
    <tr>
      <td>${account.name}</td>
      <td>${labelForType(account.type)}</td>
      <td>${formatCurrency(account.debitTotal)}</td>
      <td>${formatCurrency(account.creditTotal)}</td>
      <td>${formatCurrency(account.balance)}</td>
      <td>
        <button type="button" class="secondary" data-delete-account="${account.id}">Löschen</button>
      </td>
    </tr>
  `).join('');
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
  document.getElementById('booking-list').innerHTML = state.bookings
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((booking) => {
      const debitAccount = state.accounts.find((account) => account.id === booking.debitAccountId);
      const creditAccount = state.accounts.find((account) => account.id === booking.creditAccountId);
      const itemName = state.inventoryItems.find((item) => item.id === booking.inventoryItemId)?.name || '';
      return `
        <tr>
          <td>${booking.date}</td>
          <td>${booking.documentNo || ''}</td>
          <td>${booking.description}<br><span class="small">${itemName ? 'Artikel: ' + itemName : ''}</span></td>
          <td>${debitAccount?.name || ''}</td>
          <td>${creditAccount?.name || ''}</td>
          <td>${formatCurrency(booking.amount)}</td>
          <td>${booking.taxType && booking.taxType !== 'none' ? `${labelForTax(booking.taxType)} (${booking.taxMode})` : '—'}</td>
          <td>
            <button type="button" class="secondary" data-edit-booking="${booking.id}">Bearbeiten</button>
            <button type="button" class="secondary" data-duplicate-booking="${booking.id}">Duplizieren</button>
            <button type="button" class="danger" data-delete-booking="${booking.id}">Löschen</button>
          </td>
        </tr>
      `;
    })
    .join('');
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
          <td>${booking.date}</td>
          <td>${booking.documentNo || ''}</td>
          <td>${booking.description}</td>
          <td>${formatCurrency(booking.amount)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4">Noch keine Zahlungen erfasst.</td></tr>';
}

function renderInventoryItems() {
  document.getElementById('inventory-item-list').innerHTML = state.inventoryItems.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.sku}</td>
      <td>${item.currentStock ?? item.openingStock}</td>
      <td>${formatCurrency(item.currentValue || 0)}</td>
      <td>
        <button type="button" class="secondary" data-edit-item="${item.id}">Bearbeiten</button>
        <button type="button" class="danger" data-delete-item="${item.id}">Löschen</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('movement-item').innerHTML = state.inventoryItems.map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
}

function renderInventoryMovements() {
  document.getElementById('inventory-movement-list').innerHTML = state.inventoryMovements
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((movement) => {
      const item = state.inventoryItems.find((entry) => entry.id === movement.itemId);
      const label = movement.type === 'in' ? 'Zugang' : movement.type === 'out' ? 'Abgang' : 'Korrektur';
      return `
        <tr>
          <td>${movement.date}</td>
          <td>${item?.name || ''}</td>
          <td>${label}</td>
          <td>${movement.quantity}</td>
          <td>${formatCurrency(movement.unitValueNet || 0)}</td>
          <td>${movement.documentNo || ''}</td>
          <td><button type="button" class="danger" data-delete-movement="${movement.id}">Löschen</button></td>
        </tr>
      `;
    })
    .join('');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
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
  if (Number(formData.amount) <= 0) return 'Bitte einen Betrag größer als 0 eingeben.';
  return null;
}

function validateInventoryItem(formData) {
  if (!formData.sku) return 'Bitte eine Artikelnummer eingeben.';
  if (!formData.name) return 'Bitte einen Artikelnamen eingeben.';
  const exists = state.inventoryItems.some((item) => item.sku === formData.sku && item.id !== editingItemId);
  if (exists) return 'Artikelnummer darf nicht doppelt sein.';
  return null;
}

function validateMovement(formData) {
  if (!formData.date) return 'Bitte ein Datum eingeben.';
  if (!formData.itemId) return 'Bitte einen Artikel wählen.';
  if (Number(formData.quantity) < 0) return 'Die Menge darf nicht negativ sein.';
  return null;
}

function handleBookingSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const booking = {
    id: document.getElementById('booking-id').value || generateId('booking'),
    date: formData.get('bookingDate'),
    documentNo: formData.get('bookingDocument'),
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
  state.accounts.push({
    id: generateId('account'),
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
  const item = {
    id: document.getElementById('inventory-item-id').value || generateId('item'),
    sku: String(formData.get('inventorySku') || '').trim(),
    name: String(formData.get('inventoryName') || '').trim(),
    category: String(formData.get('inventoryCategory') || '').trim(),
    unit: String(formData.get('inventoryUnit') || '').trim(),
    openingStock: Number(formData.get('inventoryOpening') || 0),
    purchasePriceNet: Number(formData.get('inventoryPurchase') || 0),
    salePriceNet: Number(formData.get('inventorySale') || 0)
  };
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
  event.currentTarget.reset();
  document.getElementById('inventory-item-id').value = '';
  document.getElementById('inventory-item-cancel').style.display = 'none';
  render();
}

function handleInventoryMovementSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const movement = {
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
    documentNo: formData.get('paymentDocument'),
    description: `Zahlung: ${description}`,
    debitAccountId: type === 'deposit' ? accountId : counterAccountId,
    creditAccountId: type === 'deposit' ? counterAccountId : accountId,
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

  if (type === 'transfer') {
    booking.debitAccountId = 'account-bank';
    booking.creditAccountId = 'account-cash';
  }

  state.bookings.push(booking);
  event.currentTarget.reset();
  render();
}

function handleDeleteBooking(id) {
  state.bookings = state.bookings.filter((booking) => booking.id !== id);
  render();
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
  const duplicate = { ...booking, id: generateId('booking'), createdAt: new Date().toISOString() };
  state.bookings.push(duplicate);
  render();
}

function handleDeleteAccount(id) {
  state.accounts = state.accounts.filter((account) => account.id !== id);
  render();
}

function handleDeleteItem(id) {
  state.inventoryItems = state.inventoryItems.filter((item) => item.id !== id);
  state.inventoryMovements = state.inventoryMovements.filter((movement) => movement.itemId !== id);
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

function resetData() {
  if (!confirm('Alle Daten wirklich löschen?')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = createInitialState();
  render();
}

function loadSampleData() {
  state = createInitialState();
  state.bookings = [
    {
      id: generateId('booking'),
      date: '2026-01-03',
      documentNo: 'BE-001',
      description: 'Eröffnungskonto',
      debitAccountId: 'account-cash',
      creditAccountId: 'account-equity',
      amount: 5000,
      taxType: 'none',
      taxMode: 'net',
      netAmount: 5000,
      taxAmount: 0,
      grossAmount: 5000,
      inventoryItemId: null,
      quantity: null,
      createdAt: new Date().toISOString()
    }
  ];
  state.inventoryMovements = [];
  render();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'buchhaltung-export.json';
  link.click();
  URL.revokeObjectURL(url);
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
      if (parsed && typeof parsed === 'object') {
        state = {
          accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
          bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
          inventoryItems: Array.isArray(parsed.inventoryItems) ? parsed.inventoryItems : [],
          inventoryMovements: Array.isArray(parsed.inventoryMovements) ? parsed.inventoryMovements : []
        };
        render();
      }
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
    if (target.matches('[data-delete-booking]')) handleDeleteBooking(target.dataset.deleteBooking);
    if (target.matches('[data-edit-booking]')) handleEditBooking(target.dataset.editBooking);
    if (target.matches('[data-duplicate-booking]')) handleDuplicateBooking(target.dataset.duplicateBooking);
    if (target.matches('[data-delete-account]')) handleDeleteAccount(target.dataset.deleteAccount);
    if (target.matches('[data-edit-item]')) handleEditItem(target.dataset.editItem);
    if (target.matches('[data-delete-item]')) handleDeleteItem(target.dataset.deleteItem);
    if (target.matches('[data-delete-movement]')) handleDeleteMovement(target.dataset.deleteMovement);
  });

  document.getElementById('booking-amount').addEventListener('input', updateTaxSummary);
  document.getElementById('booking-tax-mode').addEventListener('change', updateTaxSummary);
  document.getElementById('booking-tax-type').addEventListener('change', updateTaxSummary);

  document.getElementById('export-json').addEventListener('click', exportJson);
  document.getElementById('export-bookings-csv').addEventListener('click', () => exportCsv('bookings'));
  document.getElementById('export-inventory-csv').addEventListener('click', () => exportCsv('inventory'));
  document.getElementById('import-json').addEventListener('change', handleImport);
  document.getElementById('reset-data').addEventListener('click', resetData);
  document.getElementById('load-sample-data').addEventListener('click', loadSampleData);
}

function init() {
  state = loadState();
  recalculateAll();
  wireEvents();
  render();
  setView('dashboard');
}

init();
