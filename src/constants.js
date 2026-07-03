export const STORAGE_KEY = 'buchhaltungs-uebung-data-v2';
export const DATA_FILE_URL = `${import.meta.env.BASE_URL}data/app-data.json`;
export const DATA_TEMPLATES = [
  {
    id: 'dentist',
    label: 'Zahnarztpraxis',
    description: 'Behandlungshonorare, KZV-Abschläge, Privatleistungen, Prophylaxeartikel und Praxislager.',
    url: `${import.meta.env.BASE_URL}data/templates/zahnarztpraxis.json`
  },
  {
    id: 'general-practice',
    label: 'Hausarztpraxis',
    description: 'KV-Abschläge, Privatatteste, Impfstoff-/Praxisbedarf, Labor, Miete und Software.',
    url: `${import.meta.env.BASE_URL}data/templates/hausarztpraxis.json`
  },
  {
    id: 'physiotherapy',
    label: 'Physiotherapie',
    description: 'Therapieerlöse, Selbstzahler, Kursangebote, Verbrauchsmaterial und Praxisbetrieb.',
    url: `${import.meta.env.BASE_URL}data/templates/physiotherapie.json`
  }
];

export const ACCOUNT_IDS = {
  cash: 'account-cash',
  bank: 'account-bank',
  receivables: 'account-receivables',
  payables: 'account-payables',
  purchases: 'account-purchases',
  sales: 'account-sales',
  productSales: 'account-product-sales',
  inventory: 'account-inventory',
  expenses: 'account-expenses',
  rent: 'account-rent',
  lab: 'account-lab',
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
  asset: 'Geld oder Bestand',
  liability: 'Offene Rechnung',
  revenue: 'Einnahme',
  expense: 'Ausgabe',
  tax: 'Steuer'
};

export const TAX_LABELS = {
  none: 'Keine Steuer',
  vat19: '19 % Umsatzsteuer (Verkauf)',
  vat7: '7 % Umsatzsteuer (Verkauf)',
  input19: '19 % Vorsteuer (Einkauf)',
  input7: '7 % Vorsteuer (Einkauf)'
};

export const INVENTORY_LINK_LABELS = {
  none: 'Kein Lager',
  in: 'Material kommt rein',
  out: 'Material geht raus'
};

export const DEFAULT_ACCOUNTS = [
  { id: ACCOUNT_IDS.cash, accountNo: '1000', name: 'Kasse', type: 'asset' },
  { id: ACCOUNT_IDS.bank, accountNo: '1200', name: 'Bank', type: 'asset' },
  { id: ACCOUNT_IDS.receivables, accountNo: '1400', name: 'Offene Patientenrechnungen', type: 'asset' },
  { id: ACCOUNT_IDS.payables, accountNo: '1600', name: 'Offene Lieferantenrechnungen', type: 'liability' },
  { id: ACCOUNT_IDS.inputVat, accountNo: '1576', name: 'Vorsteuer aus Einkäufen 19 %', type: 'tax' },
  { id: ACCOUNT_IDS.vat, accountNo: '1776', name: 'Umsatzsteuer aus Verkäufen 19 %', type: 'tax' },
  { id: ACCOUNT_IDS.equity, accountNo: '0800', name: 'Eigenkapital', type: 'liability' },
  { id: ACCOUNT_IDS.inventory, accountNo: '3980', name: 'Praxislager', type: 'asset' },
  { id: ACCOUNT_IDS.purchases, accountNo: '3400', name: 'Praxis- und Verbrauchsmaterial', type: 'expense' },
  { id: ACCOUNT_IDS.lab, accountNo: '4780', name: 'Laborrechnungen', type: 'expense' },
  { id: ACCOUNT_IDS.rent, accountNo: '4210', name: 'Praxisräume / Miete', type: 'expense' },
  { id: ACCOUNT_IDS.expenses, accountNo: '4900', name: 'Sonstige Praxiskosten', type: 'expense' },
  { id: ACCOUNT_IDS.sales, accountNo: '8000', name: 'Behandlungshonorare', type: 'revenue' },
  { id: ACCOUNT_IDS.productSales, accountNo: '8400', name: 'Verkauf Prophylaxeartikel', type: 'revenue' }
];
