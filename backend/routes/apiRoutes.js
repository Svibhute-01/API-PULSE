
import express from 'express';

import {
    registerApi,
    getAllApis,
    getApiById,
    updateApi,
    deleteApi
} from '../controller/apiController.js';
import {
    runManualCheck,
    getCheckHistory,
    getApiStats
} from "../controller/monitorController.js";

const router = express.Router();

router.post('/', registerApi);
router.get('/', getAllApis);

router.put('/:id', updateApi);
router.delete('/:id', deleteApi);
router.post('/:id/check', runManualCheck);
router.get('/:id/history', getCheckHistory);
router.get("/:id/stats", getApiStats);
router.get('/:id', getApiById);


export default router;
