<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { INVENTORY_LINK_TYPES, TAX_MODES, TAX_TYPES } from './constants.js';
import DetailModal from './components/DetailModal.vue';
import {
  accountOptions,
  auditEntriesForAccount,
  bookingImpact,
  bookingKind,
  bookingTemplates,
  dashboardSummary,
  dataTemplates,
  deleteBooking,
  deleteInventoryMovement,
  duplicateBooking,
  exportCsv,
  exportJson,
  formatCurrency,
  formatDate,
  formatDateTime,
  getBookingDisplay,
  importJsonFile,
  itemOptions,
  labels,
  load,
  loadDataTemplate,
  resetData,
  saveAccount,
  saveBooking,
  saveInventoryItem,
  saveInventoryMovement,
  savePayment,
  sortedAudit,
  sortedBookings,
  startBlankData,
  store,
  taxSummary,
  today
} from './appStore.js';

const views = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'accounts', label: 'Bereiche' },
  { id: 'bookings', label: 'Vorgänge' },
  { id: 'payments', label: 'Zahlungen' },
  { id: 'inventory', label: 'Lager' },
  { id: 'import-export', label: 'Export / Import' },
  { id: 'settings', label: 'Einstellungen' }
];

const currentView = ref('dashboard');
const menuOpen = ref(false);
const modal = reactive({ open: false, type: '', id: '' });
const message = ref('');
const auditFilter = ref('all');
const showTechnicalBookings = ref(false);
const editingBookingId = ref(null);
const selectedTemplate = ref('income');

const bookingForm = reactive(defaultBookingForm());
const paymentForm = reactive(defaultPaymentForm());
const accountForm = reactive({ accountNo: '', name: '', type: 'asset' });
const itemForm = reactive(defaultItemForm());
const movementForm = reactive(defaultMovementForm());

const pageTitle = computed(() => views.find((view) => view.id === currentView.value)?.label || 'Dashboard');
const summary = computed(() => dashboardSummary());
const recentBookings = computed(() => sortedBookings(8));
const allBookings = computed(() => sortedBookings());
const recentAudit = computed(() => sortedAudit(50, auditFilter.value));
const selectedAccount = computed(() => store.state.accounts.find((account) => account.id === store.selectedAccountId) || store.state.accounts[0] || null);
const selectedAccountAudit = computed(() => selectedAccount.value ? auditEntriesForAccount(selectedAccount.value.id) : []);
const criticalItems = computed(() => store.state.inventoryItems.slice().sort((a, b) => Number(b.needsReorder) - Number(a.needsReorder) || a.currentStock - b.currentStock).slice(0, 6));
const payments = computed(() => store.state.bookings.filter((booking) => booking.description.startsWith('Zahlung:')).sort((a, b) => b.date.localeCompare(a.date)));
const taxPreview = computed(() => taxSummary(bookingForm));
const hasEnoughAccounts = computed(() => store.state.accounts.length >= 2);
const activeTemplate = computed(() => dataTemplates.find((template) => template.id === store.state.settings.templateId) || null);
const appContextLabel = computed(() => {
  if (store.state.settings.setupMode === 'blank') return 'Eigene Übung';
  return activeTemplate.value?.label || 'Beispielvorlage';
});

onMounted(async () => {
  await load();
  applyTemplate(selectedTemplate.value);
  movementForm.itemId = store.state.inventoryItems[0]?.id || '';
});

watch(selectedTemplate, (templateId) => applyTemplate(templateId));

function defaultBookingForm() {
  return {
    date: today(),
    documentNo: '',
    description: '',
    debitAccountId: '',
    creditAccountId: '',
    amount: '',
    taxType: 'none',
    taxMode: 'net',
    inventoryItemId: '',
    inventoryLinkType: 'none',
    quantity: ''
  };
}

function defaultPaymentForm() {
  return {
    type: 'deposit',
    date: today(),
    accountId: 'account-bank',
    counterAccountId: 'account-cash',
    amount: '',
    description: '',
    documentNo: ''
  };
}

function defaultItemForm() {
  return {
    sku: '',
    name: '',
    category: '',
    unit: '',
    openingStock: 0,
    purchasePriceNet: 0,
    salePriceNet: 0,
    consumptionPerWeek: 0,
    leadTimeDays: 7,
    safetyStock: 0
  };
}

function defaultMovementForm() {
  return {
    date: today(),
    itemId: '',
    type: 'in',
    quantity: '',
    unitValueNet: '',
    description: '',
    documentNo: ''
  };
}

function setView(view) {
  currentView.value = view;
  menuOpen.value = false;
}

function openDetail(type, id) {
  modal.open = true;
  modal.type = type;
  modal.id = id;
  if (type === 'account') store.selectedAccountId = id;
}

function closeDetail() {
  modal.open = false;
  modal.type = '';
  modal.id = '';
}

function applyTemplate(templateId) {
  const template = bookingTemplates.find((entry) => entry.id === templateId) || bookingTemplates[0];
  bookingForm.debitAccountId = existingAccountId(template.debitAccountId, 0);
  bookingForm.creditAccountId = existingAccountId(template.creditAccountId, 1);
  bookingForm.taxType = template.taxType;
  bookingForm.taxMode = template.taxMode;
  bookingForm.inventoryLinkType = template.inventoryLinkType;
}

function existingAccountId(preferredId, fallbackIndex) {
  if (store.state.accounts.some((account) => account.id === preferredId)) return preferredId;
  return store.state.accounts[fallbackIndex]?.id || '';
}

async function run(action, success = '') {
  message.value = '';
  try {
    await action();
    if (success) message.value = success;
  } catch (error) {
    message.value = error.message || 'Die Aktion konnte nicht ausgeführt werden.';
  }
}

async function submitBooking() {
  await run(async () => {
    await saveBooking({ ...bookingForm }, editingBookingId.value);
    resetBookingForm();
  }, 'Vorgang gespeichert.');
}

function editBooking(id) {
  const booking = store.state.bookings.find((entry) => entry.id === id);
  if (!booking) return;
  closeDetail();
  editingBookingId.value = id;
  Object.assign(bookingForm, {
    date: booking.date,
    documentNo: booking.documentNo,
    description: booking.description,
    debitAccountId: booking.debitAccountId,
    creditAccountId: booking.creditAccountId,
    amount: booking.amount,
    taxType: booking.taxType,
    taxMode: booking.taxMode,
    inventoryItemId: booking.inventoryItemId || '',
    inventoryLinkType: booking.inventoryLinkType || 'none',
    quantity: booking.quantity || ''
  });
  setView('bookings');
}

function resetBookingForm() {
  editingBookingId.value = null;
  Object.assign(bookingForm, defaultBookingForm());
  applyTemplate(selectedTemplate.value);
}

async function submitPayment() {
  await run(async () => {
    await savePayment({ ...paymentForm });
    Object.assign(paymentForm, defaultPaymentForm());
  }, 'Zahlung gespeichert.');
}

async function submitAccount() {
  await run(async () => {
    await saveAccount({ ...accountForm });
    Object.assign(accountForm, { accountNo: '', name: '', type: 'asset' });
    applyTemplate(selectedTemplate.value);
    paymentForm.accountId = existingAccountId(paymentForm.accountId, 0);
    paymentForm.counterAccountId = existingAccountId(paymentForm.counterAccountId, 1);
  }, 'Bereich gespeichert.');
}

async function submitItem() {
  await run(async () => {
    await saveInventoryItem({ ...itemForm });
    Object.assign(itemForm, defaultItemForm());
  }, 'Artikel gespeichert.');
}

async function submitMovement() {
  await run(async () => {
    await saveInventoryMovement({ ...movementForm });
    Object.assign(movementForm, defaultMovementForm(), { itemId: store.state.inventoryItems[0]?.id || '' });
  }, 'Materialbewegung gespeichert.');
}

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  await run(async () => importJsonFile(file), 'Import gespeichert.');
  event.target.value = '';
}

async function confirmReset() {
  if (!confirm('Alle Daten wirklich zurücksetzen? Das Änderungsprotokoll bleibt erhalten.')) return;
  await run(resetData, 'Daten zurückgesetzt.');
}

async function confirmBlankMode() {
  if (!confirm('Leeren Übungsmodus starten? Alle Bereiche, Vorgänge, Artikel und Bewegungen werden geleert.')) return;
  await run(async () => {
    await startBlankData();
    resetBookingForm();
    Object.assign(paymentForm, defaultPaymentForm(), {
      accountId: '',
      counterAccountId: ''
    });
    setView('accounts');
  }, 'Leerer Übungsmodus gestartet.');
}

async function loadTemplateAndPrepare(templateId) {
  await run(async () => {
    await loadDataTemplate(templateId);
    resetBookingForm();
    paymentForm.accountId = existingAccountId(paymentForm.accountId, 0);
    paymentForm.counterAccountId = existingAccountId(paymentForm.counterAccountId, 1);
    movementForm.itemId = store.state.inventoryItems[0]?.id || '';
  }, 'Vorlage geladen.');
}
</script>

<template>
  <div class="app-shell" :class="{ 'menu-open': menuOpen }">
    <aside class="sidebar">
      <div class="brand">
        <h1>Übungsbuchhaltung</h1>
        <p>{{ appContextLabel }} · verständlich üben</p>
      </div>
      <nav class="nav" aria-label="Hauptnavigation">
        <button v-for="view in views" :key="view.id" class="nav-button" :class="{ active: currentView === view.id }" type="button" @click="setView(view.id)">
          {{ view.label }}
        </button>
      </nav>
    </aside>

    <div class="content">
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-toggle" type="button" aria-label="Navigation umschalten" :aria-expanded="String(menuOpen)" @click="menuOpen = !menuOpen">☰</button>
          <div>
            <p class="eyebrow">{{ appContextLabel }}</p>
            <h2>{{ pageTitle }}</h2>
          </div>
        </div>
        <div class="topbar-meta">
          <span>{{ store.status }}</span>
        </div>
      </header>

      <main class="main-content">
        <p v-if="message" class="app-message">{{ message }}</p>
        <p v-if="store.loading" class="empty-state">Daten werden geladen...</p>
        <p v-if="store.error" class="detail-warning">{{ store.error }}</p>

        <section v-if="currentView === 'dashboard'" class="view active">
          <div class="dashboard-hero">
            <div>
              <p class="eyebrow">Praxisstatus</p>
              <h3>{{ formatCurrency(summary.totalBalance) }}</h3>
              <p class="small">Kasse + Bank + offene Ausgangsrechnungen + Materialwert minus offene Lieferantenrechnungen.</p>
              <p v-if="store.state.settings.setupMode === 'blank'" class="small">Leerer Übungsmodus: Lege zuerst eigene Bereiche/Konten an.</p>
            </div>
            <div class="dashboard-actions">
              <button type="button" @click="setView('bookings')">Vorgang erfassen</button>
              <button type="button" class="secondary" @click="setView('payments')">Zahlung erfassen</button>
              <button type="button" class="secondary" @click="setView('inventory')">Material prüfen</button>
            </div>
          </div>

          <div class="stats-grid">
            <article class="stat-card"><span class="label">Bank + Kasse</span><strong class="value">{{ formatCurrency(summary.cashAndBank) }}</strong></article>
            <article class="stat-card"><span class="label">Offene Ausgangsrechnungen</span><strong class="value">{{ formatCurrency(summary.receivables) }}</strong></article>
            <article class="stat-card"><span class="label">Offene Lieferantenrechnungen</span><strong class="value">{{ formatCurrency(summary.payables) }}</strong></article>
            <article class="stat-card"><span class="label">Materialwert</span><strong class="value">{{ formatCurrency(summary.inventoryValue) }}</strong></article>
          </div>

          <div class="dashboard-grid">
            <section class="card">
              <div class="section-header">
                <h3>Letzte Aktivitäten</h3>
                <button class="text-button" type="button" @click="setView('bookings')">Alle Vorgänge</button>
              </div>
              <div class="timeline">
                <button v-for="booking in recentBookings" :key="booking.id" class="timeline-item" type="button" @click="openDetail('booking', booking.id)">
                  <span class="timeline-date">{{ formatDate(booking.date) }}</span>
                  <strong>{{ booking.description }}</strong>
                  <span>{{ bookingKind(booking) }} · {{ formatCurrency(getBookingDisplay(booking)) }}</span>
                </button>
              </div>
            </section>

            <section class="card">
              <div class="section-header">
                <h3>Material im Blick</h3>
                <button class="text-button" type="button" @click="setView('inventory')">Lager öffnen</button>
              </div>
              <div class="resource-list">
                <button v-for="item in criticalItems" :key="item.id" class="resource-item" :class="{ 'needs-attention': item.needsReorder }" type="button" @click="openDetail('inventory-item', item.id)">
                  <span><strong>{{ item.name }}</strong><small>{{ item.currentStock }} {{ item.unit }}</small></span>
                  <span class="status-pill" :class="item.needsReorder ? 'critical' : 'ok'">{{ item.status }}</span>
                </button>
              </div>
            </section>
          </div>

          <section class="card">
            <div class="section-header">
              <h3>Bereiche</h3>
              <button class="text-button" type="button" @click="setView('accounts')">Details</button>
            </div>
            <div class="account-card-grid">
              <button v-for="account in store.state.accounts.slice(0, 8)" :key="account.id" class="account-card" type="button" @click="openDetail('account', account.id)">
                <span class="account-number">{{ account.accountNo }}</span>
                <strong>{{ account.name }}</strong>
                <span>{{ labels.accountTypes[account.type] }}</span>
                <b>{{ formatCurrency(account.balance) }}</b>
              </button>
            </div>
          </section>
        </section>

        <section v-else-if="currentView === 'accounts'" class="view active">
          <div class="split-layout">
            <section class="card">
              <div class="section-header"><h3>Bereiche als Karten</h3></div>
              <div class="account-card-grid">
                <button v-for="account in store.state.accounts" :key="account.id" class="account-card" :class="{ selected: selectedAccount?.id === account.id }" type="button" @click="store.selectedAccountId = account.id">
                  <span class="account-number">{{ account.accountNo }}</span>
                  <strong>{{ account.name }}</strong>
                  <span>{{ labels.accountTypes[account.type] }}</span>
                  <b>{{ formatCurrency(account.balance) }}</b>
                </button>
                <p v-if="!store.state.accounts.length" class="empty-state">Noch keine Bereiche vorhanden. Lege unten deinen ersten Bereich an.</p>
              </div>
            </section>

            <section class="card detail-panel">
              <template v-if="selectedAccount">
                <p class="eyebrow">Bereich</p>
                <h3>{{ selectedAccount.accountNo }} {{ selectedAccount.name }}</h3>
                <div class="metric-row">
                  <span>Soll/Ziel {{ formatCurrency(selectedAccount.debitTotal) }}</span>
                  <span>Haben/Quelle {{ formatCurrency(selectedAccount.creditTotal) }}</span>
                  <strong>Saldo {{ formatCurrency(selectedAccount.balance) }}</strong>
                </div>
                <h4>Was hat diesen Bereich verändert?</h4>
                <div id="account-audit-list" class="timeline compact">
                  <button v-for="entry in selectedAccountAudit" :key="entry.id" class="timeline-item" type="button" @click="openDetail('log-entry', entry.id)">
                    <span class="timeline-date">{{ formatDateTime(entry.timestamp) }}</span>
                    <strong>{{ labels.actions[entry.action] || entry.action }}</strong>
                    <span>{{ entry.summary || entry.title }}</span>
                  </button>
                  <p v-if="!selectedAccountAudit.length" class="empty-state">Keine Änderungen für diesen Bereich vorhanden.</p>
                </div>
                <button class="secondary" type="button" @click="openDetail('account', selectedAccount.id)">Detail öffnen</button>
              </template>
            </section>
          </div>

          <section class="card">
            <div class="section-header"><h3>Neuen Bereich anlegen</h3></div>
            <form class="form-grid" @submit.prevent="submitAccount">
              <label>Nummer <input v-model="accountForm.accountNo" placeholder="Leer = automatisch" /></label>
              <label>Name <input v-model="accountForm.name" required /></label>
              <label>Typ
                <select v-model="accountForm.type">
                  <option v-for="(label, value) in labels.accountTypes" :key="value" :value="value">{{ label }}</option>
                </select>
              </label>
              <div class="form-actions"><button type="submit">Bereich anlegen</button></div>
            </form>
          </section>
        </section>

        <section v-else-if="currentView === 'bookings'" class="view active">
          <section class="card">
            <div class="section-header">
              <h3>{{ editingBookingId ? 'Vorgang bearbeiten' : 'Vorgang erfassen' }}</h3>
              <button v-if="editingBookingId" type="button" class="secondary" @click="resetBookingForm">Abbrechen</button>
            </div>
            <p class="small">Vorgänge sind die eigentlichen Geschäftsfälle: Einnahmen, Ausgaben, Materialeinkäufe, Verkäufe oder Umbuchungen. Hier werden bei Bedarf Steuer und Lagerwirkung mit erfasst.</p>
            <p v-if="!hasEnoughAccounts" class="detail-warning">Bitte zuerst mindestens zwei eigene Bereiche/Konten anlegen. Danach kannst du Vorgänge buchen.</p>
            <div class="template-grid">
              <label v-for="template in bookingTemplates" :key="template.id" class="template-card" :class="{ selected: selectedTemplate === template.id }">
                <input v-model="selectedTemplate" type="radio" :value="template.id" />
                <strong>{{ template.label }}</strong>
                <span>{{ template.description }}</span>
              </label>
            </div>
            <form class="form-grid" @submit.prevent="submitBooking">
              <label>Datum <input id="booking-date" v-model="bookingForm.date" type="date" required /></label>
              <label>Belegnummer <input id="booking-document" v-model="bookingForm.documentNo" placeholder="Leer = automatische Nummer" /></label>
              <label class="full-width">Was ist passiert? <input id="booking-description" v-model="bookingForm.description" required /></label>
              <label>Betrag <input id="booking-amount" v-model="bookingForm.amount" type="number" min="0.01" step="0.01" required /></label>
              <label>Steuerart
                <select id="booking-tax-type" v-model="bookingForm.taxType">
                  <option v-for="type in TAX_TYPES" :key="type" :value="type">{{ labels.taxes[type] || type }}</option>
                </select>
              </label>
              <details class="full-width advanced-box">
                <summary>Buchungsdetails anzeigen</summary>
                <div class="form-grid nested">
                  <label>Zielkonto <select v-model="bookingForm.debitAccountId"><option v-for="account in accountOptions" :key="account.value" :value="account.value">{{ account.label }}</option></select></label>
                  <label>Gegenkonto <select v-model="bookingForm.creditAccountId"><option v-for="account in accountOptions" :key="account.value" :value="account.value">{{ account.label }}</option></select></label>
                  <label>Netto/Brutto <select v-model="bookingForm.taxMode"><option v-for="mode in TAX_MODES" :key="mode" :value="mode">{{ mode === 'net' ? 'Netto eingeben' : 'Brutto eingeben' }}</option></select></label>
                  <label>Lagerwirkung <select v-model="bookingForm.inventoryLinkType"><option v-for="type in INVENTORY_LINK_TYPES" :key="type" :value="type">{{ labels.inventoryLinks[type] }}</option></select></label>
                  <label>Artikel <select v-model="bookingForm.inventoryItemId"><option value="">Kein Artikel</option><option v-for="item in itemOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
                  <label>Menge <input v-model="bookingForm.quantity" type="number" min="0" step="0.01" /></label>
                </div>
              </details>
              <div class="tax-summary full-width">Netto: {{ formatCurrency(taxPreview.netAmount) }} · Steuer: {{ formatCurrency(taxPreview.taxAmount) }} · Brutto: {{ formatCurrency(taxPreview.grossAmount) }}</div>
              <div class="form-actions"><button type="submit" :disabled="!hasEnoughAccounts">Vorgang speichern</button></div>
            </form>
          </section>

          <section class="card">
            <div class="section-header">
              <h3>Aktivitätsliste</h3>
              <button class="secondary" type="button" @click="showTechnicalBookings = !showTechnicalBookings">{{ showTechnicalBookings ? 'Tabellenansicht ausblenden' : 'Technische Tabellenansicht' }}</button>
            </div>
            <div id="booking-list" class="timeline">
              <button v-for="booking in allBookings" :key="booking.id" class="timeline-item" type="button" @click="openDetail('booking', booking.id)">
                <span class="timeline-date">{{ formatDate(booking.date) }}</span>
                <strong>{{ booking.description }}</strong>
                <span>{{ bookingKind(booking) }} · {{ formatCurrency(booking.grossAmount) }}</span>
                <small>{{ bookingImpact(booking) }}</small>
              </button>
            </div>
            <div v-if="showTechnicalBookings" class="table-wrapper">
              <table>
                <thead><tr><th>Datum</th><th>Beleg</th><th>Beschreibung</th><th>Brutto</th></tr></thead>
                <tbody>
                  <tr v-for="booking in allBookings" :key="booking.id"><td>{{ formatDate(booking.date) }}</td><td>{{ booking.documentNo }}</td><td>{{ booking.description }}</td><td>{{ formatCurrency(booking.grossAmount) }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <section v-else-if="currentView === 'payments'" class="view active">
          <section class="card">
            <div class="section-header"><h3>Zahlung erfassen</h3></div>
            <p class="small">Zahlungen sind eine schnelle Erfassung für Bank, Kasse und offene Rechnungen. Sie buchen nur Geldbewegungen ohne Steuer- oder Lagerdetails und erscheinen deshalb auch in der Vorgangsliste.</p>
            <p v-if="!hasEnoughAccounts" class="detail-warning">Bitte zuerst mindestens zwei eigene Bereiche/Konten anlegen. Danach kannst du Zahlungen erfassen.</p>
            <form class="form-grid" @submit.prevent="submitPayment">
              <label>Art <select v-model="paymentForm.type"><option value="deposit">Einzahlung</option><option value="withdrawal">Abbuchung</option><option value="transfer">Umbuchung Bank/Kasse</option></select></label>
              <label>Datum <input v-model="paymentForm.date" type="date" required /></label>
              <label>Zahlungskonto <select v-model="paymentForm.accountId"><option v-for="account in accountOptions" :key="account.value" :value="account.value">{{ account.label }}</option></select></label>
              <label>Gegenkonto <select v-model="paymentForm.counterAccountId"><option v-for="account in accountOptions" :key="account.value" :value="account.value">{{ account.label }}</option></select></label>
              <label>Betrag <input v-model="paymentForm.amount" type="number" min="0.01" step="0.01" required /></label>
              <label>Beleg <input v-model="paymentForm.documentNo" /></label>
              <label class="full-width">Beschreibung <input v-model="paymentForm.description" required /></label>
              <div class="form-actions"><button type="submit" :disabled="!hasEnoughAccounts">Zahlung speichern</button></div>
            </form>
          </section>
          <section class="card">
            <h3>Zahlungsaktivitäten</h3>
            <div class="timeline">
              <button v-for="booking in payments" :key="booking.id" class="timeline-item" type="button" @click="openDetail('payment', booking.id)">
                <span class="timeline-date">{{ formatDate(booking.date) }}</span>
                <strong>{{ booking.description }}</strong>
                <span>{{ formatCurrency(booking.grossAmount) }}</span>
              </button>
              <p v-if="!payments.length" class="empty-state">Noch keine Zahlungen erfasst.</p>
            </div>
          </section>
        </section>

        <section v-else-if="currentView === 'inventory'" class="view active">
          <div class="dashboard-grid">
            <section class="card">
              <h3>Materialartikel</h3>
              <div class="resource-list">
                <button v-for="item in store.state.inventoryItems" :key="item.id" class="resource-item" :class="{ 'needs-attention': item.needsReorder }" type="button" @click="openDetail('inventory-item', item.id)">
                  <span><strong>{{ item.name }}</strong><small>{{ item.currentStock }} {{ item.unit }} · {{ formatCurrency(item.currentValue) }}</small></span>
                  <span class="status-pill" :class="item.needsReorder ? 'critical' : 'ok'">{{ item.status }}</span>
                </button>
              </div>
            </section>
            <section class="card">
              <h3>Bewegungen</h3>
              <div class="timeline compact">
                <button v-for="movement in store.state.inventoryMovements.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)" :key="movement.id" class="timeline-item" type="button" @click="openDetail('inventory-movement', movement.id)">
                  <span class="timeline-date">{{ formatDate(movement.date) }}</span>
                  <strong>{{ movement.type === 'in' ? 'Material rein' : movement.type === 'out' ? 'Material raus' : 'Korrektur' }}</strong>
                  <span>{{ movement.quantity }} · {{ movement.description }}</span>
                </button>
              </div>
            </section>
          </div>
          <section class="card">
            <h3>Artikel anlegen</h3>
            <form class="form-grid" @submit.prevent="submitItem">
              <label>SKU <input v-model="itemForm.sku" required /></label>
              <label>Name <input v-model="itemForm.name" required /></label>
              <label>Kategorie <input v-model="itemForm.category" /></label>
              <label>Einheit <input v-model="itemForm.unit" /></label>
              <label>Anfangsbestand <input v-model="itemForm.openingStock" type="number" min="0" step="0.01" /></label>
              <label>Einkaufspreis netto <input v-model="itemForm.purchasePriceNet" type="number" min="0" step="0.01" /></label>
              <label>Verkaufspreis netto <input v-model="itemForm.salePriceNet" type="number" min="0" step="0.01" /></label>
              <label>Verbrauch/Woche <input v-model="itemForm.consumptionPerWeek" type="number" min="0" step="0.01" /></label>
              <label>Lieferzeit Tage <input v-model="itemForm.leadTimeDays" type="number" min="0" /></label>
              <label>Mindestbestand <input v-model="itemForm.safetyStock" type="number" min="0" /></label>
              <div class="form-actions"><button type="submit">Artikel speichern</button></div>
            </form>
          </section>
          <section class="card">
            <h3>Materialbewegung erfassen</h3>
            <form class="form-grid" @submit.prevent="submitMovement">
              <label>Datum <input v-model="movementForm.date" type="date" required /></label>
              <label>Artikel <select v-model="movementForm.itemId"><option v-for="item in itemOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
              <label>Art <select v-model="movementForm.type"><option value="in">Material rein</option><option value="out">Material raus</option><option value="adjustment">Korrektur</option></select></label>
              <label>Menge <input v-model="movementForm.quantity" type="number" step="0.01" required /></label>
              <label>Einzelwert netto <input v-model="movementForm.unitValueNet" type="number" min="0" step="0.01" /></label>
              <label>Beleg <input v-model="movementForm.documentNo" /></label>
              <label class="full-width">Beschreibung <input v-model="movementForm.description" required /></label>
              <div class="form-actions"><button type="submit">Bewegung speichern</button></div>
            </form>
          </section>
        </section>

        <section v-else-if="currentView === 'import-export'" class="view active">
          <section class="card">
            <h3>Export</h3>
            <div class="action-stack">
              <button type="button" @click="exportJson">JSON exportieren</button>
              <button type="button" class="secondary" @click="exportCsv('bookings')">Journal als CSV exportieren</button>
              <button type="button" class="secondary" @click="exportCsv('inventory')">Lager als CSV exportieren</button>
            </div>
          </section>
          <section class="card">
            <h3>Import</h3>
            <label class="file-input"><span>JSON-Datei auswählen</span><input type="file" accept="application/json" @change="handleImport" /></label>
          </section>
        </section>

        <section v-else-if="currentView === 'settings'" class="view active">
          <section class="card">
            <h3>Datensätze</h3>
            <div class="action-stack">
              <button type="button" @click="confirmReset">Daten zurücksetzen</button>
              <button type="button" class="secondary" @click="confirmBlankMode">Leeren Übungsmodus starten</button>
            </div>
            <p class="small">Im leeren Übungsmodus legst du alle Bereiche/Konten, Vorgänge, Artikel und Bewegungen selbst an.</p>
          </section>
          <section class="card">
            <div class="section-header">
              <h3>Vorlage wählen</h3>
            </div>
            <div class="template-grid">
              <article v-for="template in dataTemplates" :key="template.id" class="template-card" :class="{ selected: store.state.settings.templateId === template.id }">
                <strong>{{ template.label }}</strong>
                <span>{{ template.description }}</span>
                <button type="button" class="secondary" @click="loadTemplateAndPrepare(template.id)">Vorlage laden</button>
              </article>
            </div>
          </section>
          <section class="card">
            <div class="section-header">
              <h3>Änderungsprotokoll</h3>
              <label class="inline-filter">Anzeigen
                <select v-model="auditFilter">
                  <option value="all">Alle</option>
                  <option value="booking">Vorgänge</option>
                  <option value="payment">Zahlungen</option>
                  <option value="account">Bereiche</option>
                  <option value="system">System</option>
                </select>
              </label>
            </div>
            <div id="audit-log-list" class="timeline compact">
              <button v-for="entry in recentAudit" :key="entry.id" class="timeline-item" type="button" @click="openDetail('log-entry', entry.id)">
                <span class="timeline-date">{{ formatDateTime(entry.timestamp) }}</span>
                <strong>{{ labels.actions[entry.action] || entry.action }} · {{ labels.entities[entry.entityType] || entry.entityType }}</strong>
                <span>{{ entry.summary || entry.title }}</span>
              </button>
              <p v-if="!recentAudit.length" class="empty-state">Noch keine Änderungen protokolliert.</p>
            </div>
          </section>
        </section>
      </main>
    </div>

    <DetailModal
      v-if="modal.open"
      :modal="modal"
      @close="closeDetail"
      @open="openDetail"
      @edit-booking="editBooking"
      @duplicate-booking="(id) => run(() => duplicateBooking(id), 'Vorgang dupliziert.')"
      @delete-booking="(id) => run(async () => { await deleteBooking(id); closeDetail(); }, 'Vorgang gelöscht.')"
      @delete-movement="(id) => run(async () => { await deleteInventoryMovement(id); closeDetail(); }, 'Bewegung gelöscht.')"
    />
  </div>
</template>
