<script setup>
import { reactive } from 'vue';
import {
  formatCurrency,
  formatDate,
  itemOptions,
  saveInventoryItem,
  saveInventoryMovement,
  store,
  today
} from '../appStore.js';

const props = defineProps({
  run: { type: Function, required: true }
});

const emit = defineEmits(['open-detail']);

const itemForm = reactive(defaultItemForm());
const movementForm = reactive(defaultMovementForm());
movementForm.itemId = store.state.inventoryItems[0]?.id || '';

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

async function submitItem() {
  await props.run(async () => {
    await saveInventoryItem({ ...itemForm });
    Object.assign(itemForm, defaultItemForm());
    movementForm.itemId = store.state.inventoryItems[0]?.id || '';
  }, 'Artikel gespeichert.');
}

async function submitMovement() {
  await props.run(async () => {
    await saveInventoryMovement({ ...movementForm });
    Object.assign(movementForm, defaultMovementForm(), { itemId: store.state.inventoryItems[0]?.id || '' });
  }, 'Materialbewegung gespeichert.');
}
</script>

<template>
  <section class="view active">
    <div class="dashboard-grid">
      <section class="card">
        <h3>Materialartikel</h3>
        <div class="resource-list">
          <button v-for="item in store.state.inventoryItems" :key="item.id" class="resource-item" :class="{ 'needs-attention': item.needsReorder }" type="button" @click="emit('open-detail', 'inventory-item', item.id)">
            <span><strong>{{ item.name }}</strong><small>{{ item.currentStock }} {{ item.unit }} · {{ formatCurrency(item.currentValue) }}</small></span>
            <span class="status-pill" :class="item.needsReorder ? 'critical' : 'ok'">{{ item.status }}</span>
          </button>
        </div>
      </section>
      <section class="card">
        <h3>Bewegungen</h3>
        <div class="timeline compact">
          <button v-for="movement in store.state.inventoryMovements.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)" :key="movement.id" class="timeline-item" type="button" @click="emit('open-detail', 'inventory-movement', movement.id)">
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
</template>
