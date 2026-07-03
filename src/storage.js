import { DATA_FILE_URL, DATA_TEMPLATES, STORAGE_KEY } from './constants.js';
import { createInitialState, normalizeState } from './state.js';

export async function loadSeedState() {
  return loadTemplateState('dentist');
}

export async function loadTemplateState(templateId = 'dentist') {
  const template = DATA_TEMPLATES.find((entry) => entry.id === templateId) || DATA_TEMPLATES[0];
  try {
    const response = await fetch(template?.url || DATA_FILE_URL, { cache: 'no-store' });
    if (response.ok) {
      const parsed = await response.json();
      return normalizeState({
        ...parsed,
        settings: {
          ...parsed.settings,
          setupMode: 'template',
          templateId: template?.id || 'dentist'
        }
      });
    }
  } catch (error) {
    console.error('Fehler beim Laden der Vorlagendaten', error);
  }
  return createInitialState();
}

export const localStorageAdapter = {
  async load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const storedState = normalizeState(JSON.parse(raw));
        if (!isEmptyStoredState(storedState)) return storedState;
      }
    } catch (error) {
      console.error('Fehler beim Laden aus localStorage', error);
    }
    return loadSeedState();
  },
  async save(state) {
    const nextState = normalizeState({
      ...state,
      progress: { ...state.progress, lastUpdated: new Date().toISOString() },
      settings: { ...state.settings, lastSavedAt: new Date().toISOString() }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    return nextState;
  },
  async reset() {
    localStorage.removeItem(STORAGE_KEY);
    return loadSeedState();
  }
};

function isEmptyStoredState(state) {
  if (state.settings?.setupMode === 'blank') return false;
  return !state.bookings.length && !state.inventoryItems.length && !state.inventoryMovements.length;
}

export const serverStorageAdapter = {
  async load() {
    const response = await fetch('/api/data', { cache: 'no-store' });
    if (!response.ok) throw new Error('Serverdaten konnten nicht geladen werden.');
    return normalizeState(await response.json());
  },
  async save(state) {
    const response = await fetch('/api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    if (!response.ok) throw new Error('Serverdaten konnten nicht gespeichert werden.');
    return normalizeState(state);
  }
};
