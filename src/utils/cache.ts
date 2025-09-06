import { redis } from "../../config/redisClient";

const getOrSetCache = async (key: string, cb: any) => {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      console.log("CachedData hit...");
      return JSON.parse(cachedData);
    }
    console.log("CachedData miss...");
    const freshData = await cb();
    await redis.setex(key, 3600, JSON.stringify(freshData));
    return freshData;
  } catch (error) {
    console.log(`getOrSetCache error: ${error}`);
  }
};

export { getOrSetCache };
