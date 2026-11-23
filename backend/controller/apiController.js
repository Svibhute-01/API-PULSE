
import pool from '../db/db.js';

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

function isValidHttpUrl(value) {
    if (typeof value !== 'string') return false;
    try {
        const parsed = new URL(value);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false;
    }
}


export const registerApi = async (req, res, next) => {
    try {
        const {
            name,
            url,
            method = 'GET',
            interval_sec = 60,
            timeout_ms = 5000,
            is_active = true
        } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: 'Name and URL are required'
            });
        }

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Name must be a non-empty string'
            });
        }

        if (!isValidHttpUrl(url)) {
            return res.status(400).json({
                success: false,
                message: 'A valid HTTP or HTTPS URL is required'
            });
        }

        const normalizedMethod =
            typeof method === 'string' ? method.toUpperCase() : '';

        if (!ALLOWED_METHODS.includes(normalizedMethod)) {
            return res.status(400).json({
                success: false,
                message: `method must be one of: ${ALLOWED_METHODS.join(', ')}`
            });
        }

        if (!Number.isInteger(interval_sec) || interval_sec <= 0) {
            return res.status(400).json({
                success: false,
                message: 'interval_sec must be a positive integer'
            });
        }

        if (!Number.isInteger(timeout_ms) || timeout_ms <= 0) {
            return res.status(400).json({
                success: false,
                message: 'timeout_ms must be a positive integer'
            });
        }

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'is_active must be a boolean'
            });
        }

        const result = await pool.query(
            `INSERT INTO monitored_endpoints
            (name, url, method, interval_seconds, timeout_ms, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [name.trim(), url, normalizedMethod, interval_sec, timeout_ms, is_active]
        );

        return res.status(201).json({
            success: true,
            message: 'API registered successfully',
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

export const getAllApis = async(req, res, next)=>{
    try {
        const result= await pool.query(
            `select * from monitored_endpoints order by id desc`
        );

        return res.status(200).json({
            success:true,
            count: result.rows.length,
            data: result.rows
        })
    } catch (error) {
        next(error)
    }
}

export const getApiById = async(req, res, next)=>{
    try {
        const {id}= req.params;

        if(!UUID_REGEX.test(id)){
            return res.status(400).json({
                success:false,
                message:'Invalid API ID'
            })
        }

        const result = await pool.query(
            'select * from monitored_endpoints where id = $1',[id]
        );

        if(result.rows.length==0){
            return res.status(404).json({
                success:false,
                message :`Monitored API not found`
            })
        }

        return res.status(200).json({
            success:true,
            data:result.rows[0]
        })
    } catch (error) {
        next(error)
    }
}

export const updateApi = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name,
            url,
            method,
            interval_sec,
            timeout_ms,
            is_active
        } = req.body;

        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid API ID'
            });
        }

        // Only allow approved fields to be updated
        const fields = {
            name,
            url,
            method,
            interval_sec,
            timeout_ms,
            is_active
        };

        const updates = Object.entries(fields)
            .filter(([key, value]) =>
                Object.hasOwn(req.body, key) && value !== undefined
            );

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Provide at least one field to update'
            });
        }

        // Validate supplied values
        for (const [key, value] of updates) {
            if (key === 'name' &&
                (typeof value !== 'string' || !value.trim())) {
                return res.status(400).json({
                    success: false,
                    message: 'Name must be a non-empty string'
                });
            }

            if (key === 'url' && !isValidHttpUrl(value)) {
                return res.status(400).json({
                    success: false,
                    message: 'A valid HTTP or HTTPS URL is required'
                });
            }

            if (key === 'method' &&
                (typeof value !== 'string' ||
                 !ALLOWED_METHODS.includes(value.toUpperCase()))) {
                return res.status(400).json({
                    success: false,
                    message: `method must be one of: ${ALLOWED_METHODS.join(', ')}`
                });
            }

            if (
                ['interval_sec', 'timeout_ms'].includes(key) &&
                (!Number.isInteger(value) || value <= 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: `${key} must be a positive integer`
                });
            }

            if (key === 'is_active' && typeof value !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'is_active must be a boolean'
                });
            }
        }

        const values = updates.map(([key, value]) => {
            if (key === 'name') return value.trim();
            if (key === 'method') return value.toUpperCase();
            return value;
        });

        // Map API field names to real column names (allowlist)
        const COLUMN_MAP = {
            name: 'name',
            url: 'url',
            method: 'method',
            interval_sec: 'interval_seconds',
            timeout_ms: 'timeout_ms',
            is_active: 'is_active'
        };

        const setClause = [
            ...updates.map(
                ([key], index) => `${COLUMN_MAP[key]} = $${index + 1}`
            ),
            'updated_at = NOW()'
        ].join(', ');

        values.push(id);

        const result = await pool.query(
            `UPDATE monitored_endpoints
             SET ${setClause}
             WHERE id = $${values.length}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Monitored API not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'API updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};


// 4. DELETE API

export const deleteApi = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate UUID format
        if (!UUID_REGEX.test(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid API ID"
            });
        }

        const result = await pool.query(
            `DELETE FROM monitored_endpoints
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Monitored API not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "API deleted successfully",
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

