<script setup>
import { exportCsv, exportJson, importJsonFile } from '../appStore.js';

const props = defineProps({
  run: { type: Function, required: true }
});

async function handleImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  await props.run(async () => importJsonFile(file), 'Import gespeichert.');
  event.target.value = '';
}
</script>

<template>
  <section class="view active">
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
</template>
