import { parentPort } from 'node:worker_threads';
import { connectDB } from '../db/connection';
import { fetchAllBeaches } from '../services/forecastFetcher';
import { log } from '../lib/log';

if (!parentPort) {
  throw new Error('forecastFetcher worker must be spawned via worker_threads');
}

const port = parentPort;

let mongoReady: Promise<void> | null = null;

type TriggerMessage = { type: 'trigger'; jobId: string };
type ResultMessage = { type: 'done' | 'error'; jobId: string; error?: string };

port.on('message', (msg: TriggerMessage) => {
  if (msg.type !== 'trigger') return;
  void runJob(msg.jobId);
});

async function runJob(jobId: string): Promise<void> {
  try {
    if (!mongoReady) mongoReady = connectDB();
    await mongoReady;
    log.info('forecast_fetch_worker_start', { jobId });
    await fetchAllBeaches();
    log.info('forecast_fetch_worker_finish', { jobId });
    const ok: ResultMessage = { type: 'done', jobId };
    port.postMessage(ok);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('forecast_fetch_worker_error', { jobId, error: message });
    const fail: ResultMessage = { type: 'error', jobId, error: message };
    port.postMessage(fail);
  }
}
