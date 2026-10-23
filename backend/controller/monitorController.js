
import pool from "../db/db.js";
import { checkEndpoint } from "../service/monitoringServices.js";
import redisClient from "../db/redis.js";

export async function runManualCheck(req, res) {
  try {
    const { id } = req.params;

    // Validate the UUID before querying PostgreSQL.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        message: "Invalid endpoint ID format",
      });
    }

    // Find the endpoint registered by the user.
  const result = await pool.query(
    `SELECT id, url, method, timeout_ms
     FROM monitored_endpoints
     WHERE id = $1`,
    [id]
);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Endpoint not found",
      });
    }

    const endpoint = result.rows[0];

    // Execute the check and save its result.
    const checkResult = await checkEndpoint(endpoint);

    return res.status(201).json({
      message: "Endpoint checked successfully",
      data: checkResult,
    });
  } catch (error) {
    console.error("Manual endpoint check failed:", error);

    return res.status(500).json({
      message: "Failed to check endpoint",
    });
  }
}





export async function getCheckHistory(req, res) {
    try {
            const { id } = req.params;

            const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid endpoint ID format"
            });
        }
        

        const result = await pool.query(
            `SELECT *
             FROM check_results
             WHERE endpoint_id = $1
             ORDER BY checked_at DESC
             LIMIT 50`,
            [id]
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Error fetching check history:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch check history"
        });
    }
}




export async function getApiStats(req, res) {
    try {
        const { id } = req.params;

        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid endpoint ID format"
            });
        }

        // 1. Verify that the endpoint exists.
        const endpoint = await pool.query(
            `SELECT id
             FROM monitored_endpoints
             WHERE id = $1`,
            [id]
        );

        if (endpoint.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Endpoint not found"
            });
        }

        // 2. Check Redis for cached statistics.
        const cacheKey = `stats:${id}`;

        if (redisClient.isReady) {
            try {
                const cachedStats = await redisClient.get(cacheKey);

                if (cachedStats) {
                    console.log("[Redis] Stats cache HIT:", id);

                    return res.status(200).json({
                        success: true,
                        data: JSON.parse(cachedStats),
                        cached: true
                    });
                }
            } catch (error) {
                console.error(
                    "[Redis] Cache read failed:",
                    error.message
                );
            }
        }

        console.log("[Redis] Stats cache MISS:", id);

        // 3. Calculate statistics using PostgreSQL.
        const result = await pool.query(
            `SELECT
                COUNT(*) AS total_checks,
                COUNT(*) FILTER (
                    WHERE is_success = TRUE
                ) AS successful_checks,
                COUNT(*) FILTER (
                    WHERE is_success = FALSE
                ) AS failed_checks,
                ROUND(
                    COALESCE(
                        100.0 * COUNT(*) FILTER (
                            WHERE is_success = TRUE
                        ) / NULLIF(COUNT(*), 0),
                        0
                    ),
                    2
                ) AS uptime_percentage,
                ROUND(
                    COALESCE(AVG(response_time_ms), 0)::numeric,
                    2
                ) AS average_response_time_ms
             FROM check_results
             WHERE endpoint_id = $1`,
            [id]
        );

        const stats = result.rows[0];

        // 4. Store the statistics in Redis for 30 seconds.
        if (redisClient.isReady) {
            try {
                await redisClient.set(
                    cacheKey,
                    JSON.stringify(stats),
                    { EX: 30 }
                );

                console.log("[Redis] Stats cached:", id);
            } catch (error) {
                console.error(
                    "[Redis] Cache write failed:",
                    error.message
                );
            }
        }

        // 5. Return the statistics.
        return res.status(200).json({
            success: true,
            data: stats,
            cached: false
        });

    } catch (error) {
        console.error(
            "Error fetching API statistics:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch API statistics"
        });
    }
}

