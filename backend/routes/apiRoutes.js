
import express from 'express';

import {
    registerApi,
    getAllApis,
    getApiById,
    updateApi,
    deleteApi
} from '../controller/apiController.js';

const router = express.Router();

router.post('/', registerApi);
router.get('/', getAllApis);
router.get('/:id', getApiById);
router.put('/:id', updateApi);
router.delete('/:id', deleteApi);

export default router;
