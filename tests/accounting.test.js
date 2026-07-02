import { describe, expect, it } from 'vitest';
import { calculateAccountBalances, calculateTax } from '../src/accounting.js';
import { DEFAULT_ACCOUNTS } from '../src/constants.js';

describe('Steuerberechnung', () => {
  it('berechnet 19 Prozent Umsatzsteuer aus Netto', () => {
    expect(calculateTax(100, 'net', 'vat19')).toEqual({ netAmount: 100, taxAmount: 19, grossAmount: 119, rate: 0.19 });
  });

  it('berechnet 19 Prozent Vorsteuer aus Brutto', () => {
    expect(calculateTax(119, 'gross', 'input19')).toEqual({ netAmount: 100, taxAmount: 19, grossAmount: 119, rate: 0.19 });
  });
});

describe('Saldenlogik', () => {
  it('bucht Umsatzsteuer auf das Steuerkonto', () => {
    const accounts = calculateAccountBalances(DEFAULT_ACCOUNTS, [{
      id: 'b1',
      date: '2026-01-01',
      documentNo: 'BE-1',
      description: 'Verkauf',
      debitAccountId: 'account-bank',
      creditAccountId: 'account-sales',
      amount: 119,
      taxType: 'vat19',
      taxMode: 'gross'
    }]);

    expect(accounts.find((account) => account.id === 'account-bank').balance).toBe(119);
    expect(accounts.find((account) => account.id === 'account-sales').balance).toBe(100);
    expect(accounts.find((account) => account.id === 'account-vat').balance).toBe(19);
  });
});
