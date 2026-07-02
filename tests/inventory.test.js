import { describe, expect, it } from 'vitest';
import { calculateInventoryItems, syncMovementForBooking, validateMovement } from '../src/inventory.js';

describe('Lagerlogik', () => {
  const state = {
    inventoryItems: [{ id: 'item-1', openingStock: 10, purchasePriceNet: 5 }],
    inventoryMovements: []
  };

  it('berechnet Bestand und Wert', () => {
    const [item] = calculateInventoryItems(state.inventoryItems, [{ itemId: 'item-1', type: 'out', quantity: 3 }]);
    expect(item.currentStock).toBe(7);
    expect(item.currentValue).toBe(35);
  });

  it('verhindert Lagerabgänge über Bestand', () => {
    expect(validateMovement({ date: '2026-01-01', itemId: 'item-1', type: 'out', quantity: 11, unitValueNet: 5 }, state)).toContain('reicht');
  });

  it('synchronisiert Buchungsbewegungen deterministisch', () => {
    const booking = { id: 'b1', date: '2026-01-01', documentNo: 'BE-1', inventoryItemId: 'item-1', inventoryLinkType: 'out', quantity: 2 };
    const next = syncMovementForBooking(state, booking);
    expect(next.inventoryMovements).toHaveLength(1);
    expect(next.inventoryMovements[0].linkedBookingId).toBe('b1');
  });
});
