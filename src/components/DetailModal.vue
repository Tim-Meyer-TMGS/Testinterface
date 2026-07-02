<script setup>
import { computed } from 'vue';
import { buildBookingLines } from '../accounting.js';
import {
  accountLabel,
  auditEntriesForAccount,
  bookingImpact,
  bookingKind,
  formatCurrency,
  formatDate,
  formatDateTime,
  labels,
  store
} from '../appStore.js';

const props = defineProps({
  modal: { type: Object, required: true }
});

const emit = defineEmits(['close', 'open', 'edit-booking', 'duplicate-booking', 'delete-booking', 'delete-movement']);

const content = computed(() => {
  const { type, id } = props.modal;
  if (type === 'booking' || type === 'payment') return bookingContent(id, type);
  if (type === 'account') return accountContent(id);
  if (type === 'inventory-item') return itemContent(id);
  if (type === 'inventory-movement') return movementContent(id);
  if (type === 'log-entry') return logContent(id);
  return { eyebrow: 'Details', title: 'Datensatz nicht gefunden', missing: true };
});

function bookingContent(id, type) {
  const booking = store.state.bookings.find((entry) => entry.id === id);
  if (!booking) return { eyebrow: type === 'payment' ? 'Zahlung' : 'Vorgang', title: 'Datensatz nicht gefunden', missing: true };
  return {
    eyebrow: type === 'payment' ? 'Zahlung' : 'Vorgang',
    title: `${booking.documentNo} · ${booking.description}`,
    booking,
    lines: buildBookingLines(booking),
    fields: [
      ['Datum', formatDate(booking.date)],
      ['Typ', bookingKind(booking)],
      ['Netto', formatCurrency(booking.netAmount)],
      ['Steuer', formatCurrency(booking.taxAmount)],
      ['Brutto', formatCurrency(booking.grossAmount)],
      ['Wirkung', bookingImpact(booking)]
    ]
  };
}

function accountContent(id) {
  const account = store.state.accounts.find((entry) => entry.id === id);
  if (!account) return { eyebrow: 'Bereich', title: 'Bereich nicht gefunden', missing: true };
  const relatedBookings = store.state.bookings
    .filter((booking) => buildBookingLines(booking).some((line) => line.accountId === account.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  return {
    eyebrow: 'Bereich',
    title: `${account.accountNo} ${account.name}`,
    account,
    relatedBookings,
    auditEntries: auditEntriesForAccount(account.id),
    fields: [
      ['Typ', labels.accountTypes[account.type]],
      ['Soll/Ziel', formatCurrency(account.debitTotal)],
      ['Haben/Quelle', formatCurrency(account.creditTotal)],
      ['Saldo', formatCurrency(account.balance)]
    ]
  };
}

function itemContent(id) {
  const item = store.state.inventoryItems.find((entry) => entry.id === id);
  if (!item) return { eyebrow: 'Material', title: 'Artikel nicht gefunden', missing: true };
  return {
    eyebrow: 'Material',
    title: item.name,
    item,
    movements: store.state.inventoryMovements.filter((movement) => movement.itemId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
    fields: [
      ['SKU', item.sku],
      ['Kategorie', item.category || '-'],
      ['Bestand', `${item.currentStock} ${item.unit || ''}`.trim()],
      ['Mindestbestand', item.safetyStock],
      ['Lagerwert', formatCurrency(item.currentValue)]
    ]
  };
}

function movementContent(id) {
  const movement = store.state.inventoryMovements.find((entry) => entry.id === id);
  if (!movement) return { eyebrow: 'Materialbewegung', title: 'Bewegung nicht gefunden', missing: true };
  const item = store.state.inventoryItems.find((entry) => entry.id === movement.itemId);
  return {
    eyebrow: 'Materialbewegung',
    title: movement.documentNo || movement.id,
    movement,
    item,
    booking: movement.linkedBookingId ? store.state.bookings.find((entry) => entry.id === movement.linkedBookingId) : null,
    fields: [
      ['Datum', formatDate(movement.date)],
      ['Artikel', item?.name || 'Fehlt'],
      ['Art', movement.type === 'in' ? 'Material rein' : movement.type === 'out' ? 'Material raus' : 'Korrektur'],
      ['Menge', movement.quantity],
      ['Einzelwert', formatCurrency(movement.unitValueNet)]
    ]
  };
}

function logContent(id) {
  const entry = store.state.auditLog.find((item) => item.id === id);
  if (!entry) return { eyebrow: 'Protokoll', title: 'Protokolleintrag nicht gefunden', missing: true };
  return {
    eyebrow: 'Protokoll',
    title: entry.title,
    entry,
    fields: [
      ['Zeitpunkt', formatDateTime(entry.timestamp)],
      ['Aktion', labels.actions[entry.action] || entry.action],
      ['Datensatz', labels.entities[entry.entityType] || entry.entityType],
      ['Beschreibung', entry.summary || '-']
    ]
  };
}

function snapshotRows(snapshot) {
  if (!snapshot) return [];
  return Object.entries(snapshot).map(([key, value]) => [snapshotLabel(key), snapshotValue(key, value)]);
}

function snapshotLabel(key) {
  return {
    date: 'Datum',
    documentNo: 'Beleg',
    description: 'Beschreibung',
    debitAccountId: 'Zielkonto',
    creditAccountId: 'Gegenkonto',
    amount: 'Eingabebetrag',
    netAmount: 'Netto',
    taxAmount: 'Steuer',
    grossAmount: 'Brutto',
    taxType: 'Steuerart',
    taxMode: 'Steuermodus',
    inventoryItemId: 'Artikel',
    inventoryLinkType: 'Lagerwirkung',
    quantity: 'Menge',
    accountNo: 'Nummer',
    name: 'Name',
    type: 'Typ',
    accounts: 'Bereiche',
    bookings: 'Vorgänge',
    inventoryItems: 'Artikel',
    inventoryMovements: 'Materialbewegungen'
  }[key] || key;
}

function snapshotValue(key, value) {
  if (value === null || value === undefined || value === '') return '-';
  if (key.endsWith('AccountId')) return accountLabel(value);
  if (key === 'taxType') return labels.taxes[value] || value;
  if (key === 'inventoryLinkType') return labels.inventoryLinks[value] || value;
  if (key === 'type') return labels.accountTypes[value] || value;
  if (['amount', 'netAmount', 'taxAmount', 'grossAmount'].includes(key)) return formatCurrency(value);
  return String(value);
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title" tabindex="-1">
      <header class="detail-modal__header">
        <div>
          <p class="detail-modal__eyebrow">{{ content.eyebrow }}</p>
          <h2 id="detail-modal-title">{{ content.title }}</h2>
        </div>
        <button type="button" class="detail-modal__close" aria-label="Details schließen" @click="emit('close')">×</button>
      </header>

      <div class="detail-modal__body">
        <p v-if="content.missing" class="detail-warning">Verknüpfter Datensatz wurde nicht gefunden.</p>

        <dl v-if="content.fields" class="field-list">
          <div v-for="[label, value] in content.fields" :key="label">
            <dt>{{ label }}</dt>
            <dd>{{ value }}</dd>
          </div>
        </dl>

        <template v-if="content.booking">
          <h3>Buchungswirkung</h3>
          <div class="timeline compact">
            <button v-for="line in content.lines" :key="line.accountId + line.side" class="timeline-item" type="button" @click="emit('open', 'account', line.accountId)">
              <span class="timeline-date">{{ line.side === 'debit' ? 'Ziel' : 'Quelle' }}</span>
              <strong>{{ accountLabel(line.accountId) }}</strong>
              <span>{{ line.label }} · {{ formatCurrency(line.amount) }}</span>
            </button>
          </div>
        </template>

        <template v-if="content.account">
          <h3>Letzte Vorgänge</h3>
          <div class="timeline compact">
            <button v-for="booking in content.relatedBookings" :key="booking.id" class="timeline-item" type="button" @click="emit('open', 'booking', booking.id)">
              <span class="timeline-date">{{ formatDate(booking.date) }}</span>
              <strong>{{ booking.description }}</strong>
              <span>{{ formatCurrency(booking.grossAmount) }}</span>
            </button>
            <p v-if="!content.relatedBookings.length" class="empty-state">Keine Vorgänge für diesen Bereich vorhanden.</p>
          </div>
          <h3>Änderungen</h3>
          <div class="timeline compact">
            <button v-for="entry in content.auditEntries" :key="entry.id" class="timeline-item" type="button" @click="emit('open', 'log-entry', entry.id)">
              <span class="timeline-date">{{ formatDateTime(entry.timestamp) }}</span>
              <strong>{{ labels.actions[entry.action] || entry.action }}</strong>
              <span>{{ entry.summary || entry.title }}</span>
            </button>
            <p v-if="!content.auditEntries.length" class="empty-state">Keine Änderungen für diesen Bereich vorhanden.</p>
          </div>
        </template>

        <template v-if="content.item">
          <h3>Materialbewegungen</h3>
          <div class="timeline compact">
            <button v-for="movement in content.movements" :key="movement.id" class="timeline-item" type="button" @click="emit('open', 'inventory-movement', movement.id)">
              <span class="timeline-date">{{ formatDate(movement.date) }}</span>
              <strong>{{ movement.type === 'in' ? 'Material rein' : movement.type === 'out' ? 'Material raus' : 'Korrektur' }}</strong>
              <span>{{ movement.quantity }} · {{ movement.description }}</span>
            </button>
          </div>
        </template>

        <template v-if="content.movement">
          <div class="detail-actions">
            <button v-if="content.item" type="button" class="secondary" @click="emit('open', 'inventory-item', content.item.id)">Artikel öffnen</button>
            <button v-if="content.booking" type="button" class="secondary" @click="emit('open', 'booking', content.booking.id)">Vorgang öffnen</button>
          </div>
        </template>

        <template v-if="content.entry">
          <h3>Betroffene Bereiche</h3>
          <div class="chip-row">
            <button v-for="accountId in content.entry.accountIds" :key="accountId" class="chip button-chip" type="button" @click="emit('open', 'account', accountId)">
              {{ accountLabel(accountId) }}
            </button>
            <span v-if="!content.entry.accountIds.length" class="empty-state">Keine einzelnen Bereiche betroffen.</span>
          </div>
          <div class="snapshot-grid">
            <section v-if="content.entry.before">
              <h3>Vorher</h3>
              <dl class="field-list">
                <div v-for="[label, value] in snapshotRows(content.entry.before)" :key="label">
                  <dt>{{ label }}</dt>
                  <dd>{{ value }}</dd>
                </div>
              </dl>
            </section>
            <section v-if="content.entry.after">
              <h3>Nachher</h3>
              <dl class="field-list">
                <div v-for="[label, value] in snapshotRows(content.entry.after)" :key="label">
                  <dt>{{ label }}</dt>
                  <dd>{{ value }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </template>
      </div>

      <footer class="detail-modal__footer">
        <button v-if="content.booking" type="button" class="secondary" @click="emit('edit-booking', content.booking.id)">Bearbeiten</button>
        <button v-if="content.booking" type="button" class="secondary" @click="emit('duplicate-booking', content.booking.id)">Duplizieren</button>
        <button v-if="content.booking" type="button" class="danger" @click="emit('delete-booking', content.booking.id)">Löschen</button>
        <button v-if="content.movement && !content.movement.linkedBookingId" type="button" class="danger" @click="emit('delete-movement', content.movement.id)">Bewegung löschen</button>
      </footer>
    </section>
  </div>
</template>
