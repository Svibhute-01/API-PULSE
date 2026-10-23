
import pool from "../db/db.js";
import { performance } from "node:perf_hooks";

export async function checkEndpoint(endpoint) {
    const { id, url } = endpoint;

    const method = endpoint.method || "GET";
    const timeoutMs =
        Number(endpoint.timeout_ms) > 0
            ? Number(endpoint.timeout_ms)
            : 5000;

    let statusCode = null;
    let latencyMs = null;
    let isSuccess = false;
    let errorType = null;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    const startTime = performance.now();

    try {
        const response = await fetch(url, {
            method,
            signal: controller.signal,
        });

        latencyMs = Math.round(
            performance.now() - startTime
        );

        statusCode = response.status;
        isSuccess = response.ok;

        if (!response.ok) {
            errorType = `HTTP_ERROR_${response.status}`;
        }

        // Release the response body safely.
        if (response.body) {
            await response.body.cancel().catch(() => {});
        }

    } catch (error) {
        latencyMs = Math.round(
            performance.now() - startTime
        );

        if (error.name === "AbortError") {
            errorType = "TIMEOUT";
        } else {
            errorType = "NETWORK_ERROR";
        }

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
        errorType,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}
