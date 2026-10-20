
import pool from "../db/db.js";
import { checkEndpoint } from "../service/monitoringServices.js";

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
      `SELECT id, url, timeout_ms
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
