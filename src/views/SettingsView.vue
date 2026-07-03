<script setup>
import { ref } from 'vue';
import {
  dataTemplates,
  formatDateTime,
  labels,
  loadDataTemplate,
  resetData,
  sortedAudit,
  startBlankData,
  store
} from '../appStore.js';

const props = defineProps({
  run: { type: Function, required: true }
});

const emit = defineEmits(['set-view', 'open-detail']);

const auditFilter = ref('all');

async function confirmReset() {
  if (!confirm('Alle Daten wirklich zurücksetzen? Das Änderungsprotokoll bleibt erhalten.')) return;
  await props.run(resetData, 'Daten zurückgesetzt.');
}

async function confirmBlankMode() {
  if (!confirm('Leeren Übungsmodus starten? Alle Bereiche, Vorgänge, Artikel und Bewegungen werden geleert.')) return;
  await props.run(async () => {
    await startBlankData();
    emit('set-view', 'accounts');
  }, 'Leerer Übungsmodus gestartet.');
}

async function loadTemplateAndPrepare(templateId) {
  await props.run(async () => {
    await loadDataTemplate(templateId);
  }, 'Vorlage geladen.');
}
</script>

<template>
  <section class="view active">
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
        <button v-for="entry in sortedAudit(50, auditFilter)" :key="entry.id" class="timeline-item" type="button" @click="emit('open-detail', 'log-entry', entry.id)">
          <span class="timeline-date">{{ formatDateTime(entry.timestamp) }}</span>
          <strong>{{ labels.actions[entry.action] || entry.action }} · {{ labels.entities[entry.entityType] || entry.entityType }}</strong>
          <span>{{ entry.summary || entry.title }}</span>
        </button>
        <p v-if="!sortedAudit(50, auditFilter).length" class="empty-state">Noch keine Änderungen protokolliert.</p>
      </div>
    </section>
  </section>
</template>
