import { ACCOUNT_IDS, ACCOUNT_TYPES, TAX_MODES, TAX_TYPES } from './constants.js';

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateTax(amount, mode = 'net', taxType = 'none') {
  const amountNumber = round2(Number(amount || 0));
  if (!TAX_MODES.includes(mode)) mode = 'net';
  if (!TAX_TYPES.includes(taxType)) taxType = 'none';
  if (taxType === 'none') {
    return { netAmount: amountNumber, taxAmount: 0, grossAmount: amountNumber, rate: 0 };
  }

  const rate = taxType.endsWith('7') ? 0.07 : 0.19;
  if (mode === 'gross') {
    const grossAmount = amountNumber;
    const netAmount = round2(grossAmount / (1 + rate));
    return { netAmount, taxAmount: round2(grossAmount - netAmount), grossAmount, rate };
  }

  const netAmount = amountNumber;
  const taxAmount = round2(netAmount * rate);
  return { netAmount, taxAmount, grossAmount: round2(netAmount + taxAmount), rate };
}

export function normalizeBookingAmounts(booking) {
  const tax = calculateTax(booking.amount, booking.taxMode, booking.taxType);
  return {
    ...booking,
    amount: Number(booking.amount || 0),
    taxType: TAX_TYPES.includes(booking.taxType) ? booking.taxType : 'none',
    taxMode: TAX_MODES.includes(booking.taxMode) ? booking.taxMode : 'net',
    netAmount: tax.netAmount,
    taxAmount: tax.taxAmount,
    grossAmount: tax.grossAmount
  };
}

export function buildBookingLines(booking) {
  const normalized = normalizeBookingAmounts(booking);
  const lines = [];
  const debit = (accountId, amount, label) => lines.push({ accountId, side: 'debit', amount: round2(amount), label });
  const credit = (accountId, amount, label) => lines.push({ accountId, side: 'credit', amount: round2(amount), label });

  if (normalized.taxType?.startsWith('vat') && normalized.taxAmount > 0) {
    debit(normalized.debitAccountId, normalized.grossAmount, 'Bruttobetrag');
    credit(normalized.creditAccountId, normalized.netAmount, 'Nettoerlös');
    credit(ACCOUNT_IDS.vat, normalized.taxAmount, 'Umsatzsteuer');
    return lines;
  }

  if (normalized.taxType?.startsWith('input') && normalized.taxAmount > 0) {
    debit(normalized.debitAccountId, normalized.netAmount, 'Nettoaufwand');
    debit(ACCOUNT_IDS.inputVat, normalized.taxAmount, 'Vorsteuer');
    credit(normalized.creditAccountId, normalized.grossAmount, 'Bruttobetrag');
    return lines;
  }

  debit(normalized.debitAccountId, normalized.grossAmount, 'Soll');
  credit(normalized.creditAccountId, normalized.grossAmount, 'Haben');
  return lines;
}

export function calculateAccountBalances(accounts, bookings) {
  const base = new Map(accounts.map((account) => [
    account.id,
    { ...account, debitTotal: 0, creditTotal: 0, balance: 0 }
  ]));

  bookings.forEach((booking) => {
    buildBookingLines(booking).forEach((line) => {
      const account = base.get(line.accountId);
      if (!account) return;
      if (line.side === 'debit') account.debitTotal = round2(account.debitTotal + line.amount);
      if (line.side === 'credit') account.creditTotal = round2(account.creditTotal + line.amount);
    });
  });

  return Array.from(base.values()).map((account) => {
    if (account.type === 'asset' || account.type === 'expense' || account.id === ACCOUNT_IDS.inputVat) {
      account.balance = round2(account.debitTotal - account.creditTotal);
    } else {
      account.balance = round2(account.creditTotal - account.debitTotal);
    }
    return account;
  });
}

export function validateAccount(account) {
  if (!account.id || !account.accountNo || !account.name) return 'Konten benötigen ID, Nummer und Namen.';
  if (!ACCOUNT_TYPES.includes(account.type)) return `Ungültiger Kontotyp: ${account.type}`;
  return null;
}

export function getBookingDisplayAmount(booking) {
  return normalizeBookingAmounts(booking).grossAmount;
}
