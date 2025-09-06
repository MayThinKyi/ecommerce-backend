import { Worker } from "bullmq";
import sharp from "sharp";
import { redis } from "../../../config/redisClient";

export const imageWorker = new Worker(
  "ImageQueue",
  async (job) => {
    const { filePath, optimizeFilePath, width, height, quality } = job.data;
    await sharp(filePath)
      .resize({ width: width ?? 200, height: height ?? 200 })
      .webp({ quality: quality ?? 100 })
      .toFile(optimizeFilePath);
  },
  { connection: redis }
);

imageWorker.on("completed", (job) => {
  console.log(`Job with ID ${job.id} completed.`);
});

imageWorker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} failed with ${err.message}`);
});
