import { withTransaction } from "@/server/db/tx";
import type { InventoryReservationLine } from "./types";
import { increaseReservedStock, lockInventoryItem } from "./repository";

export async function reserveStock(lines: InventoryReservationLine[]) {
  if (lines.length === 0) {
    return;
  }

  await withTransaction(async (client) => {
    for (const line of lines) {
      const inventory = await lockInventoryItem(client, line);

      if (!inventory) {
        throw new Error(`Inventory item not found for variant ${line.variantId}`);
      }

      if (inventory.available < line.quantity) {
        throw new Error(`Insufficient stock for variant ${line.variantId}`);
      }

      await increaseReservedStock(client, line);
    }
  });
}
