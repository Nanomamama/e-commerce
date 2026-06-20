import { withTransaction } from "@/server/db/tx";
import { insertShipment } from "./repository";
import type { CreateShipmentInput } from "./types";

export async function createShipment(input: CreateShipmentInput): Promise<string> {
  return withTransaction((client) => insertShipment(client, input));
}
