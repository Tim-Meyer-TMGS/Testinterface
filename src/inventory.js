import { INVENTORY_LINK_TYPES, MOVEMENT_TYPES } from './constants.js';
import { round2 } from './accounting.js';

export function calculateInventoryItems(items, movements) {
  return items.map((item) => {
    const related = movements.filter((movement) => movement.itemId === item.id);
    const totalIn = related.filter((movement) => movement.type === 'in').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const totalOut = related.filter((movement) => movement.type === 'out').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const totalAdjustments = related.filter((movement) => movement.type === 'adjustment').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const currentStock = round2(Number(item.openingStock || 0) + totalIn - totalOut + totalAdjustments);
    const outMovements = related.filter((movement) => movement.type === 'out').sort((a, b) => a.date.localeCompare(b.date));
    const consumedTotal = outMovements.reduce((sum, movement) => sum + Number(movement.quantity || 0), 0);
    const oldestDate = outMovements[0]?.date;
    const newestDate = outMovements[outMovements.length - 1]?.date;
    const rangeDays = oldestDate && newestDate ? Math.max(7, Math.round((new Date(newestDate) - new Date(oldestDate)) / 86400000) + 1) : 7;
    const derivedConsumption = outMovements.length ? consumedTotal * 7 / rangeDays : 0;
    const weeklyConsumption = Number(item.consumptionPerWeek || 0) > 0 ? Number(item.consumptionPerWeek) : derivedConsumption;
    const leadTimeDays = Number(item.leadTimeDays || 7);
    const safetyStock = Number(item.safetyStock || 0) > 0 ? Number(item.safetyStock) : Math.max(0, Math.round(weeklyConsumption * 0.5));
    const reorderPoint = Math.max(0, Math.round((weeklyConsumption * leadTimeDays) / 7 + safetyStock));
    const targetStock = Math.max(reorderPoint, Math.round(weeklyConsumption * 2 + safetyStock));
    const daysUntilEmpty = weeklyConsumption > 0 ? (currentStock / weeklyConsumption) * 7 : null;
    const needsReorder = currentStock <= reorderPoint;

    return {
      ...item,
      currentStock,
      currentValue: round2(currentStock * Number(item.purchasePriceNet || 0)),
      weeklyConsumption,
      leadTimeDays,
      safetyStock,
      reorderPoint,
      targetStock,
      daysUntilEmpty,
      needsReorder,
      recommendedOrderQuantity: Math.max(0, round2(targetStock - currentStock)),
      status: needsReorder ? 'Nachbestellen' : daysUntilEmpty !== null && daysUntilEmpty <= 14 ? 'Achtung' : 'Im Plan'
    };
  });
}

export function getInventoryStock(state, itemId, ignoreLinkedBookingId = null) {
  const items = calculateInventoryItems(
    state.inventoryItems,
    state.inventoryMovements.filter((movement) => movement.linkedBookingId !== ignoreLinkedBookingId)
  );
  return Number(items.find((item) => item.id === itemId)?.currentStock || 0);
}

export function createMovementFromBooking(booking, item) {
  if (!booking.inventoryItemId || booking.inventoryLinkType === 'none') return null;
  if (!INVENTORY_LINK_TYPES.includes(booking.inventoryLinkType)) return null;
  const quantity = Number(booking.quantity || 0);
  if (!item || quantity <= 0) return null;
  return {
    id: `movement-${booking.id}`,
    date: booking.date,
    itemId: booking.inventoryItemId,
    type: booking.inventoryLinkType,
    quantity,
    unitValueNet: Number(item.purchasePriceNet || 0),
    description: booking.inventoryLinkType === 'out' ? 'Material raus aus Vorgang' : 'Material rein aus Vorgang',
    documentNo: booking.documentNo || '',
    linkedBookingId: booking.id
  };
}

export function syncMovementForBooking(state, booking) {
  const item = state.inventoryItems.find((entry) => entry.id === booking.inventoryItemId);
  const next = createMovementFromBooking(booking, item);
  const withoutExisting = state.inventoryMovements.filter((movement) => movement.linkedBookingId !== booking.id);
  return {
    ...state,
    inventoryMovements: next ? [...withoutExisting, next] : withoutExisting
  };
}

export function validateMovement(movement, state, ignoreLinkedBookingId = null) {
  if (!movement.date) return 'Bitte ein Datum eingeben.';
  if (!movement.itemId || !state.inventoryItems.some((item) => item.id === movement.itemId)) return 'Bitte einen vorhandenen Artikel auswählen.';
  if (!MOVEMENT_TYPES.includes(movement.type)) return 'Bitte eine gültige Bewegungsart wählen.';
  if (movement.type !== 'adjustment' && Number(movement.quantity) <= 0) return 'Bitte eine Menge größer als 0 eingeben.';
  if (movement.type === 'adjustment' && Number(movement.quantity) === 0) return 'Bitte eine Bestandskorrektur ungleich 0 eingeben.';
  if (Number(movement.unitValueNet) < 0) return 'Der Einzelwert darf nicht negativ sein.';
  if (movement.type === 'out' && Number(movement.quantity) > getInventoryStock(state, movement.itemId, ignoreLinkedBookingId)) {
    return 'Der Materialbestand reicht für diese Entnahme nicht aus.';
  }
  return null;
}
