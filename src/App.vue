<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import DetailModal from './components/DetailModal.vue';
import {
  dataTemplates,
  deleteBooking,
  deleteInventoryMovement,
  duplicateBooking,
  load,
  store
} from './appStore.js';
import AccountsView from './views/AccountsView.vue';
import BookingsView from './views/BookingsView.vue';
import DashboardView from './views/DashboardView.vue';
import ImportExportView from './views/ImportExportView.vue';
import InventoryView from './views/InventoryView.vue';
import PaymentsView from './views/PaymentsView.vue';
import SettingsView from './views/SettingsView.vue';

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
const bookingToEditId = ref(null);

const pageTitle = computed(() => views.find((view) => view.id === currentView.value)?.label || 'Dashboard');
const activeTemplate = computed(() => dataTemplates.find((template) => template.id === store.state.settings.templateId) || null);
const appContextLabel = computed(() => {
  if (store.state.settings.setupMode === 'blank') return 'Eigene Übung';
  return activeTemplate.value?.label || 'Beispielvorlage';
});

onMounted(load);

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

async function run(action, success = '') {
  message.value = '';
  try {
    await action();
    if (success) message.value = success;
  } catch (error) {
    message.value = error.message || 'Die Aktion konnte nicht ausgeführt werden.';
  }
}

function editBooking(id) {
  closeDetail();
  bookingToEditId.value = id;
  setView('bookings');
}

function consumeBookingEdit() {
  bookingToEditId.value = null;
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

        <DashboardView v-if="currentView === 'dashboard'" @set-view="setView" @open-detail="openDetail" />
        <AccountsView v-else-if="currentView === 'accounts'" :run="run" @open-detail="openDetail" />
        <BookingsView v-else-if="currentView === 'bookings'" :run="run" :edit-booking-id="bookingToEditId" @open-detail="openDetail" @edit-consumed="consumeBookingEdit" />
        <PaymentsView v-else-if="currentView === 'payments'" :run="run" @open-detail="openDetail" />
        <InventoryView v-else-if="currentView === 'inventory'" :run="run" @open-detail="openDetail" />
        <ImportExportView v-else-if="currentView === 'import-export'" :run="run" />
        <SettingsView v-else-if="currentView === 'settings'" :run="run" @set-view="setView" @open-detail="openDetail" />
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
