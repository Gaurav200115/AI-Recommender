import express from 'express';
import { getRecommendation, putProducts, testing } from '../controller/Recommendation_controller.js';

const router = express.Router();

router.post('/recommend', getRecommendation);
router.post('/data', putProducts);
router.get('/', testing);

export default router;
