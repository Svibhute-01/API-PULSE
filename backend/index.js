
import express from "express";
import pool from "./db/db.js";
import { startMonitoringScheduler } from "./scheduler/monitorScheduler.js";
import { connectRedis } from "./db/redis.js";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "API Pulse backen is running" });
});

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT NOW()");

        res.status(200).json({
            message: "Database Connected"
        });
    } catch (err) {
        console.error("Health check failed:", err.message);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

app.get("/test-500", (req, res) => {
    res.status(500).json({
        message: "Simulated internal server error"
    });
});

app.get("/test-timeout", async (req, res) => {
    await new Promise(resolve => setTimeout(resolve, 8000));

    res.status(200).json({
        message: "Response returned after 8 seconds"
    });
});

async function startServer() {
    try {
        // 1. Connect Redis first
        await connectRedis();

        // 2. Load routes only after Redis connects
        const { default: apiRoutes } =
            await import("./routes/apiRoutes.js");

        app.use("/api/apis", apiRoutes);

        // 3. Start automated monitoring
        startMonitoringScheduler();

        // 4. Start Express
        app.listen(PORT, () => {
            console.log(`App is listening at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start API Pulse:", err);
        process.exit(1);
    }
}

startServer();
