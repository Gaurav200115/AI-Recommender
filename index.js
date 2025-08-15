import express from 'express';
import recommendationRoutes from './route/Recommendation_Routes.js';

const app = express();
app.use(express.json());

// Routes
app.use('/', recommendationRoutes);

app.listen(3000, () => console.log('✅ Backend running on port 3000'));
