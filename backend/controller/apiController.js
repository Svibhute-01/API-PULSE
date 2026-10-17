
import pool from '../db/db.js';

export const registerApi = async (req, res, next) => {
    try {
        const {
            name,
            url,
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

        const result = await pool.query(
            `INSERT INTO monitored_endpoints
            (name, url, interval_sec, timeout_ms, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [name, url, interval_sec, timeout_ms, is_active]
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

        if(!/^[1-9]\d*$/.test(id)){
            return res.status(400).json({
                success:false,
                message:'Invalis API ID'
            })
        }

        const result = await pool.query(
            'select * from monitored_endpoints where id =$',[id]
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
            interval_sec,
            timeout_ms,
            is_active
        } = req.body;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid API ID'
            });
        }

        // Only allow approved fields to be updated
        const fields = {
            name,
            url,
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

            if (key === 'url') {
                if (typeof value !== 'string') {
                    return res.status(400).json({
                        success: false,
                        message: 'URL must be a string'
                    });
                }

                try {
                    const parsedUrl = new URL(value);

                    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                        throw new Error('Invalid protocol');
                    }
                } catch {
                    return res.status(400).json({
                        success: false,
                        message: 'A valid HTTP or HTTPS URL is required'
                    });
                }
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

        const values = updates.map(([key, value]) =>
            key === 'name' ? value.trim() : value
        );

        // Build SQL using only the allowlisted column names
        const setClause = updates
            .map(([key], index) => `${key} = $${index + 1}`)
            .join(', ');

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

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid API ID'
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
                message: 'Monitored API not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'API deleted successfully',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};



