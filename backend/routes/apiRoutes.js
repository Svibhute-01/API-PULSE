
import express from 'express';

import {
    registerApi,
    getAllApis,
    getApiById,
    updateApi,
    deleteApi
} from '../controller/apiController.js';
import { runManualCheck } from "../controller/monitorController.js";

const router = express.Router();

router.post('/', registerApi);
router.get('/', getAllApis);
router.get('/:id', getApiById);
router.put('/:id', updateApi);
router.delete('/:id', deleteApi);
router.post('/:id/check', runManualCheck);

export default router;
