<script setup>
import { computed, reactive } from 'vue';
import {
  auditEntriesForAccount,
  formatCurrency,
  formatDateTime,
  labels,
  saveAccount,
  store
} from '../appStore.js';

const props = defineProps({
  run: { type: Function, required: true }
});

const emit = defineEmits(['open-detail']);

const accountForm = reactive({ accountNo: '', name: '', type: 'asset' });
const selectedAccount = computed(() => store.state.accounts.find((account) => account.id === store.selectedAccountId) || store.state.accounts[0] || null);
const selectedAccountAudit = computed(() => selectedAccount.value ? auditEntriesForAccount(selectedAccount.value.id) : []);

function openDetail(type, id) {
  emit('open-detail', type, id);
}

async function submitAccount() {
  await props.run(async () => {
    await saveAccount({ ...accountForm });
    Object.assign(accountForm, { accountNo: '', name: '', type: 'asset' });
  }, 'Bereich gespeichert.');
}
</script>

<template>
  <section class="view active">
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
</template>
