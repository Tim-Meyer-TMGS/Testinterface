export const STORAGE_KEY = 'buchhaltungs-uebung-data-v2';
export const DATA_FILE_URL = './data/app-data.json';

export const ACCOUNT_IDS = {
  cash: 'account-cash',
  bank: 'account-bank',
  receivables: 'account-receivables',
  payables: 'account-payables',
  purchases: 'account-purchases',
  sales: 'account-sales',
  inventory: 'account-inventory',
  expenses: 'account-expenses',
  vat: 'account-vat',
  inputVat: 'account-input-vat',
  equity: 'account-equity'
};

export const ACCOUNT_TYPES = ['asset', 'liability', 'revenue', 'expense', 'tax'];
export const TAX_TYPES = ['none', 'vat19', 'vat7', 'input19', 'input7'];
export const TAX_MODES = ['net', 'gross'];
export const INVENTORY_LINK_TYPES = ['none', 'in', 'out'];
export const MOVEMENT_TYPES = ['in', 'out', 'adjustment'];

export const TYPE_LABELS = {
  asset: 'Aktivkonto',
  liability: 'Passivkonto',
  revenue: 'Ertragskonto',
  expense: 'Aufwandskonto',
  tax: 'Steuerkonto'
};

export const TAX_LABELS = {
  none: 'Keine Steuer',
  vat19: '19 % Umsatzsteuer',
  vat7: '7 % Umsatzsteuer',
  input19: '19 % Vorsteuer',
  input7: '7 % Vorsteuer'
};

export const INVENTORY_LINK_LABELS = {
  none: 'Kein Lager',
  in: 'Wareneingang',
  out: 'Lagerabgang'
};

export const DEFAULT_ACCOUNTS = [
  { id: ACCOUNT_IDS.cash, accountNo: '1000', name: 'Kasse', type: 'asset' },
  { id: ACCOUNT_IDS.bank, accountNo: '1200', name: 'Bank', type: 'asset' },
  { id: ACCOUNT_IDS.receivables, accountNo: '1400', name: 'Forderungen aus Lieferungen und Leistungen', type: 'asset' },
  { id: ACCOUNT_IDS.payables, accountNo: '1600', name: 'Verbindlichkeiten aus Lieferungen und Leistungen', type: 'liability' },
  { id: ACCOUNT_IDS.inputVat, accountNo: '1576', name: 'Abziehbare Vorsteuer 19 %', type: 'tax' },
  { id: ACCOUNT_IDS.vat, accountNo: '1776', name: 'Umsatzsteuer 19 %', type: 'tax' },
  { id: ACCOUNT_IDS.equity, accountNo: '0800', name: 'Eigenkapital', type: 'liability' },
  { id: ACCOUNT_IDS.inventory, accountNo: '3980', name: 'Warenbestand', type: 'asset' },
  { id: ACCOUNT_IDS.purchases, accountNo: '3400', name: 'Wareneingang 19 % Vorsteuer', type: 'expense' },
  { id: ACCOUNT_IDS.expenses, accountNo: '4900', name: 'Sonstige betriebliche Aufwendungen', type: 'expense' },
  { id: ACCOUNT_IDS.sales, accountNo: '8400', name: 'Erlöse 19 % Umsatzsteuer', type: 'revenue' }
];
