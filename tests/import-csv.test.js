import { describe, expect, it } from 'vitest';
import { toCsv } from '../src/csv.js';
import { normalizeState, validateState } from '../src/state.js';

describe('Import und CSV', () => {
  it('validiert fehlende Konto-Referenzen', () => {
    const state = normalizeState({
      accounts: [{ id: 'a1', accountNo: '1000', name: 'Kasse', type: 'asset' }],
      bookings: [{ id: 'b1', date: '2026-01-01', description: 'Test', debitAccountId: 'a1', creditAccountId: 'missing', amount: 1 }],
      inventoryItems: [],
      inventoryMovements: []
    });
    expect(validateState(state)).toContain('fehlendes Konto');
  });

  it('ergaenzt Standardkonten ohne Kontonummern zu duplizieren', () => {
    const state = normalizeState({
      accounts: [{ id: 'custom-cash', accountNo: '1000', name: 'Eigene Kasse', type: 'asset' }],
      bookings: [],
      inventoryItems: [],
      inventoryMovements: []
    });
    const accountNumbers = state.accounts.map((account) => account.accountNo);
    expect(new Set(accountNumbers).size).toBe(accountNumbers.length);
  });

  it('escaped CSV-Zellen und entschaerft Formeln', () => {
    expect(toCsv([['Beschreibung'], ['=1+1;"x"']])).toBe('"Beschreibung"\n"\'=1+1;""x"""');
  });
});
