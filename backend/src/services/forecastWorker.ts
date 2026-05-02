import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { log } from '../lib/log';

let workerInstance: Worker | null = null;
const pending = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();
let inflight: Promise<void> | null = null;

type ResultMessage = { type: 'done' | 'error'; jobId: string; error?: string };

function spawnWorker(): Worker {
  // tsx preserves the original file extension on __filename; in compiled output it's .js.
  const isTs = __filename.endsWith('.ts');
  const ext = isTs ? '.ts' : '.js';
  const workerPath = path.resolve(__dirname, '..', 'workers', `forecastFetcher.worker${ext}`);
  const worker = new Worker(workerPath, {
    execArgv: isTs ? ['-r', 'tsx/cjs'] : [],
  });

  worker.on('message', (msg: ResultMessage) => {
    const handlers = pending.get(msg.jobId);
    if (!handlers) return;
    pending.delete(msg.jobId);
    if (msg.type === 'done') handlers.resolve();
    else handlers.reject(new Error(msg.error ?? 'forecast worker error'));
  });

  worker.on('error', (err) => {
    log.error('forecast_worker_thread_error', { error: err.message });
    for (const { reject } of pending.values()) reject(err);
    pending.clear();
    workerInstance = null;
  });

  worker.on('exit', (code) => {
    if (code !== 0) log.warn('forecast_worker_exit', { code });
    for (const { reject } of pending.values()) {
      reject(new Error(`forecast worker exited with code ${code}`));
    }
    pending.clear();
    workerInstance = null;
  });

  return worker;
}

function getWorker(): Worker {
  if (!workerInstance) workerInstance = spawnWorker();
  return workerInstance;
}

export function triggerForecastFetch(): Promise<void> {
  // Coalesce overlapping triggers: while one fetch is running, callers share the same promise.
  if (inflight) return inflight;
  const worker = getWorker();
  const jobId = randomUUID();
  const promise = new Promise<void>((resolve, reject) => {
    pending.set(jobId, { resolve, reject });
    worker.postMessage({ type: 'trigger', jobId });
  });
  inflight = promise.finally(() => {
    inflight = null;
  });
  return inflight;
}
