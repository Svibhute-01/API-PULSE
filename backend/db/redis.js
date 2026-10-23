
import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (error) => {
    console.error("[Redis] Client error:", error.message);
});

export async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }

    console.log("[Redis] Connected successfully");
}

export default redisClient;
