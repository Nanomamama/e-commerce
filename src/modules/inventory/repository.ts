import type { DbClient } from "@/server/db/pool";
import type { InventoryAvailability, InventoryReservationLine } from "./types";

export async function lockInventoryItem(
  client: DbClient,
  line: InventoryReservationLine
): Promise<InventoryAvailability | null> {
  const result = await client.query<{
    variant_id: string;
    warehouse_id: string;
    on_hand: number;
    reserved: number;
    safety_stock: number;
    available: number;
  }>(
    `
      select
        variant_id,
        warehouse_id,
        on_hand,
        reserved,
        safety_stock,
        on_hand - reserved - safety_stock as available
      from inventory_items
      where variant_id = $1 and warehouse_id = $2
      for update
    `,
    [line.variantId, line.warehouseId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    variantId: row.variant_id,
    warehouseId: row.warehouse_id,
    onHand: row.on_hand,
    reserved: row.reserved,
    safetyStock: row.safety_stock,
    available: row.available
  };
}

export async function increaseReservedStock(
  client: DbClient,
  line: InventoryReservationLine
) {
  await client.query(
    `
      update inventory_items
      set reserved = reserved + $3
      where variant_id = $1 and warehouse_id = $2
    `,
    [line.variantId, line.warehouseId, line.quantity]
  );
}
