export type InventoryReservationLine = {
  variantId: string;
  warehouseId: string;
  quantity: number;
};

export type InventoryAvailability = {
  variantId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
  available: number;
};
