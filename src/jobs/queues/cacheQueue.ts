import { redis } from "./../../../config/redisClient";
import { Queue } from "bullmq";

export const cacheQueue = new Queue("CacheQueue", {
  connection: redis,
});
