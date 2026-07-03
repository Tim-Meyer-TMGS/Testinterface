<script setup>
import { computed, reactive } from 'vue';
import {
  accountOptions,
  formatCurrency,
  savePayment,
  store,
  today
} from '../appStore.js';

const props = defineProps({
  run: { type: Function, required: true }
});

const emit = defineEmits(['open-detail']);

const paymentForm = reactive(defaultPaymentForm());
const hasEnoughAccounts = computed(() => store.state.accounts.length >= 2);
const payments = computed(() => store.state.bookings.filter((booking) => booking.description.startsWith('Zahlung:')).sort((a, b) => b.date.localeCompare(a.date)));

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

async function submitPayment() {
  await props.run(async () => {
    await savePayment({ ...paymentForm });
    Object.assign(paymentForm, defaultPaymentForm());
  }, 'Zahlung gespeichert.');
}
</script>

<template>
  <section class="view active">
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
        <button v-for="booking in payments" :key="booking.id" class="timeline-item" type="button" @click="emit('open-detail', 'payment', booking.id)">
          <span class="timeline-date">{{ new Date(booking.date).toLocaleDateString('de-DE') }}</span>
          <strong>{{ booking.description }}</strong>
          <span>{{ formatCurrency(booking.grossAmount) }}</span>
        </button>
        <p v-if="!payments.length" class="empty-state">Noch keine Zahlungen erfasst.</p>
      </div>
    </section>
  </section>
</template>
