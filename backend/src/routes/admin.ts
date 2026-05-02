import { Router } from 'express';
import { triggerForecastFetch } from '../services/forecastWorker';

export const adminRouter = Router();

adminRouter.post('/fetch-forecasts', (_req, res) => {
  triggerForecastFetch().catch(() => {
    // errors are logged inside the worker; the HTTP caller already got a 200
  });
  res.json({ message: 'Forecast fetch triggered' });
});
