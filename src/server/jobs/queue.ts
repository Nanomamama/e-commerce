import { Queue } from "bullmq";
import { getConfig } from "@/server/config";

const connection = {
  url: getConfig().redisUrl,
  maxRetriesPerRequest: null
};

export const emailQueue = new Queue("email", { connection });
export const inventoryQueue = new Queue("inventory", { connection });
export const webhookRetryQueue = new Queue("webhook-retry", { connection });
