import { describe, expect, it } from 'vitest';
import { appendAuditEntries, bookingAccountIds, createAuditEntry, snapshotBooking, systemSnapshot } from '../src/audit.js';
import { normalizeState } from '../src/state.js';

describe('Änderungsprotokoll', () => {
  const booking = {
    id: 'booking-audit-1',
    date: '2026-06-30',
    documentNo: 'BE-AUDIT',
    description: 'Testverkauf',
    debitAccountId: 'account-bank',
    creditAccountId: 'account-sales',
    amount: 119,
    taxType: 'vat19',
    taxMode: 'gross'
  };

  it('ergänzt fehlendes auditLog rückwärtskompatibel', () => {
    const state = normalizeState({ accounts: [], bookings: [], inventoryItems: [], inventoryMovements: [] });
    expect(state.auditLog).toEqual([]);
  });

  it('ermittelt betroffene Konten inklusive Steuerkonto', () => {
    expect(bookingAccountIds(booking)).toEqual(['account-bank', 'account-sales', 'account-vat']);
  });

  it('speichert before und after für Bearbeitungen', () => {
    const before = { ...booking, amount: 100, taxType: 'none', taxMode: 'net' };
    const entry = createAuditEntry('update', 'booking', booking.id, {
      title: booking.documentNo,
      accountIds: [...new Set([...bookingAccountIds(before), ...bookingAccountIds(booking)])],
      before: snapshotBooking(before),
      after: snapshotBooking(booking)
    });

    expect(entry.before.grossAmount).toBe(100);
    expect(entry.after.grossAmount).toBe(119);
    expect(entry.accountIds).toContain('account-vat');
  });

  it('speichert before für Löschungen', () => {
    const entry = createAuditEntry('delete', 'booking', booking.id, {
      title: booking.documentNo,
      accountIds: bookingAccountIds(booking),
      before: snapshotBooking(booking)
    });

    expect(entry.before.documentNo).toBe('BE-AUDIT');
    expect(entry.after).toBeNull();
  });

  it('hängt Systemeinträge an ein bestehendes Protokoll an', () => {
    const previous = createAuditEntry('create', 'booking', booking.id, { title: booking.documentNo });
    const reset = createAuditEntry('reset', 'system', null, {
      title: 'Daten zurückgesetzt',
      before: systemSnapshot({ accounts: [1], bookings: [1], inventoryItems: [], inventoryMovements: [] }),
      after: systemSnapshot({ accounts: [1, 2], bookings: [], inventoryItems: [], inventoryMovements: [] })
    });
    const state = appendAuditEntries({ auditLog: [previous] }, [reset]);

    expect(state.auditLog).toHaveLength(2);
    expect(state.auditLog[0].action).toBe('create');
    expect(state.auditLog[1].action).toBe('reset');
  });
});
