<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { INVENTORY_LINK_TYPES, TAX_MODES, TAX_TYPES } from '../constants.js';
import {
  accountOptions,
  bookingImpact,
  bookingKind,
  bookingTemplates,
  formatCurrency,
  formatDate,
  itemOptions,
  labels,
  saveBooking,
  sortedBookings,
  store,
  taxSummary,
  today
} from '../appStore.js';

const props = defineProps({
  run: { type: Function, required: true },
  editBookingId: { type: String, default: null }
});

const emit = defineEmits(['open-detail', 'edit-consumed']);

const selectedTemplate = ref('income');
const editingBookingId = ref(null);
const showTechnicalBookings = ref(false);
const bookingForm = reactive(defaultBookingForm());

const allBookings = computed(() => sortedBookings());
const taxPreview = computed(() => taxSummary(bookingForm));
const hasEnoughAccounts = computed(() => store.state.accounts.length >= 2);
const bookingUsesInventory = computed(() => bookingForm.inventoryLinkType !== 'none');
const inventoryBookingHint = computed(() => {
  if (bookingForm.inventoryLinkType === 'in') return 'Beim Speichern wird automatisch ein Lagerzugang angelegt.';
  if (bookingForm.inventoryLinkType === 'out') return 'Beim Speichern wird automatisch ein Lagerabgang angelegt.';
  return '';
});

watch(selectedTemplate, (templateId) => applyTemplate(templateId));
watch(() => props.editBookingId, (id) => {
  if (!id) return;
  editBooking(id);
  emit('edit-consumed');
}, { immediate: true });

applyTemplate(selectedTemplate.value);

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

function existingAccountId(preferredId, fallbackIndex) {
  if (store.state.accounts.some((account) => account.id === preferredId)) return preferredId;
  return store.state.accounts[fallbackIndex]?.id || '';
}

function applyTemplate(templateId) {
  const template = bookingTemplates.find((entry) => entry.id === templateId) || bookingTemplates[0];
  bookingForm.debitAccountId = existingAccountId(template.debitAccountId, 0);
  bookingForm.creditAccountId = existingAccountId(template.creditAccountId, 1);
  bookingForm.taxType = template.taxType;
  bookingForm.taxMode = template.taxMode;
  bookingForm.inventoryLinkType = template.inventoryLinkType;
}

async function submitBooking() {
  await props.run(async () => {
    await saveBooking({ ...bookingForm }, editingBookingId.value);
    resetBookingForm();
  }, 'Vorgang gespeichert.');
}

function editBooking(id) {
  const booking = store.state.bookings.find((entry) => entry.id === id);
  if (!booking) return;
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
}

function resetBookingForm() {
  editingBookingId.value = null;
  Object.assign(bookingForm, defaultBookingForm());
  applyTemplate(selectedTemplate.value);
}

function openDetail(type, id) {
  emit('open-detail', type, id);
}
</script>

<template>
  <section class="view active">
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
        <div v-if="bookingUsesInventory" class="inventory-booking-box full-width">
          <strong>{{ labels.inventoryLinks[bookingForm.inventoryLinkType] }}</strong>
          <span>{{ inventoryBookingHint }}</span>
          <p v-if="!store.state.inventoryItems.length" class="detail-warning">Bitte zuerst im Lager einen Artikel anlegen. Danach kann der Vorgang den Bestand automatisch verändern.</p>
          <div class="form-grid nested">
            <label>Artikel
              <select v-model="bookingForm.inventoryItemId" :required="bookingUsesInventory">
                <option value="">Artikel auswählen</option>
                <option v-for="item in itemOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <label>Menge
              <input v-model="bookingForm.quantity" type="number" min="0.01" step="0.01" :required="bookingUsesInventory" />
            </label>
          </div>
        </div>
        <details class="full-width advanced-box">
          <summary>Buchungsdetails anzeigen</summary>
          <div class="form-grid nested">
            <label>Zielkonto <select v-model="bookingForm.debitAccountId"><option v-for="account in accountOptions" :key="account.value" :value="account.value">{{ account.label }}</option></select></label>
            <label>Gegenkonto <select v-model="bookingForm.creditAccountId"><option v-for="account in accountOptions" :key="account.value" :value="account.value">{{ account.label }}</option></select></label>
            <label>Netto/Brutto <select v-model="bookingForm.taxMode"><option v-for="mode in TAX_MODES" :key="mode" :value="mode">{{ mode === 'net' ? 'Netto eingeben' : 'Brutto eingeben' }}</option></select></label>
            <label>Lagerwirkung <select v-model="bookingForm.inventoryLinkType"><option v-for="type in INVENTORY_LINK_TYPES" :key="type" :value="type">{{ labels.inventoryLinks[type] }}</option></select></label>
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
</template>
