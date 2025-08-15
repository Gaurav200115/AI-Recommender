import express from 'express';
import recommendationRoutes from './route/Recommendation_Routes.js';

const app = express();
app.use(express.json());

// Routes
app.use('/', recommendationRoutes);

app.get('/testing', (req, res) => {
  res.send('Hello World');
});

app.listen(3000, () => console.log('✅ Backend running on port 3000'));
export default app;
