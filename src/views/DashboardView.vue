<script setup>
import { computed } from 'vue';
import {
  bookingKind,
  dashboardSummary,
  formatCurrency,
  formatDate,
  getBookingDisplay,
  labels,
  sortedBookings,
  store
} from '../appStore.js';

const emit = defineEmits(['set-view', 'open-detail']);

const summary = computed(() => dashboardSummary());
const recentBookings = computed(() => sortedBookings(8));
const criticalItems = computed(() => store.state.inventoryItems.slice().sort((a, b) => Number(b.needsReorder) - Number(a.needsReorder) || a.currentStock - b.currentStock).slice(0, 6));

function setView(view) {
  emit('set-view', view);
}

function openDetail(type, id) {
  emit('open-detail', type, id);
}
</script>

<template>
  <section class="view active">
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
</template>
