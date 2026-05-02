import { Router } from 'express';
import { fetchAllBeaches } from '../services/forecastFetcher';

export const adminRouter = Router();

adminRouter.post('/fetch-forecasts', (_req, res) => {
  fetchAllBeaches();
  res.json({ message: 'Forecast fetch triggered' });
});
