
import pool from "../db/db.js";
import { performance } from "node:perf_hooks";

export async function checkEndpoint(endpoint) {
  const { id, url, timeout_ms = 5000 } = endpoint;

  let statusCode = null;
  let latencyMs = null;
  let isSuccess = false;
  let errorMessage = null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeout_ms
  );

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    latencyMs = Math.round(performance.now() - startTime);
    statusCode = response.status;
    isSuccess = response.ok;

    if (!response.ok) {
      errorMessage = `HTTP error: ${response.status}`;
    }

    // Release the response body without downloading it all.
    await response.body?.cancel();
  } catch (error) {
    latencyMs = Math.round(performance.now() - startTime);

    errorMessage =
      error.name === "AbortError"
        ? `Request timed out after ${timeout_ms} ms`
        : error.message;
  } finally {
    clearTimeout(timeout);
  }
const query = `
    INSERT INTO check_results (
        endpoint_id,
        status_code,
        response_time_ms,
        is_success,
        error_type
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
`;
  const values = [
    id,
    statusCode,
    latencyMs,
    isSuccess,
    errorMessage,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}
