
import cron from "node-cron";
import pool from "../db/db.js";
import { checkEndpoint } from "../service/monitoringServices.js";

const inFlight = new Set();
let schedulerStarted = false;

async function runSchedulerTick() {
    try {
        // Get active APIs and their most recent check time.
        const result = await pool.query(`
            SELECT
                me.*,
                latest.checked_at AS last_checked_at
            FROM monitored_endpoints AS me
            LEFT JOIN LATERAL (
                SELECT checked_at
                FROM check_results
                WHERE endpoint_id = me.id
                ORDER BY checked_at DESC
                LIMIT 1
            ) AS latest ON TRUE
            WHERE me.is_active = TRUE
        `);

        const now = Date.now();

        for (const endpoint of result.rows) {
            const intervalMs =
                Number(endpoint.interval_seconds) * 1000;

            const lastChecked = endpoint.last_checked_at
                ? new Date(endpoint.last_checked_at).getTime()
                : null;

            const isDue =
                lastChecked === null ||
                now - lastChecked >= intervalMs;

            if (!isDue || inFlight.has(endpoint.id)) {
                continue;
            }

            // Prevent duplicate concurrent checks in this process.
            inFlight.add(endpoint.id);

            // Check independently so one failure doesn't stop others.
            void checkEndpoint(endpoint)
                .then((result) => {
                    console.log(
                        `[Scheduler] Checked ${endpoint.name}:`,
                        result
                    );
                })
                .catch((error) => {
                    console.error(
                        `[Scheduler] Failed for ${endpoint.id}:`,
                        error.message
                    );
                })
                .finally(() => {
                    inFlight.delete(endpoint.id);
                });
        }
    } catch (error) {
        console.error(
            "[Scheduler] Could not fetch active APIs:",
            error.message
        );
    }
}

export function startMonitoringScheduler() {
    if (schedulerStarted) {
        return;
    }

    schedulerStarted = true;

    console.log("[Scheduler] Automated monitoring started");

    // Run once at startup.
    void runSchedulerTick();

    // Recheck which APIs are due every five seconds.
    cron.schedule("*/5 * * * * *", () => {
        void runSchedulerTick();
    });
}
