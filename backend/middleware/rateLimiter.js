
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../db/redis.js";

export const manualCheckLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: "api-pulse:rate-limit:manual-check:"
    }),

    message: {
        success: false,
        message: "Too many manual checks. Please try again in a minute."
    }
});
