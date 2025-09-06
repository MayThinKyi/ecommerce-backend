import { redis } from "./../../../config/redisClient";
import { Queue } from "bullmq";

export const imageQueue = new Queue("ImageQueue", {
  connection: redis,
});
