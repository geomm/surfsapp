#!/usr/bin/env node
// Trigger forecast fetches in the background and bench API endpoints concurrently.
// Used to measure backend latency during an active forecast cycle.
import { performance } from 'node:perf_hooks';

const base = process.env.BENCH_BASE ?? 'http://localhost:3000';
const N = parseInt(process.env.BENCH_N ?? '60', 10);
const triggers = parseInt(process.env.BENCH_TRIGGERS ?? '5', 10);

function pct(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

let stop = false;
async function loadLoop() {
  while (!stop) {
    await Promise.all(
      Array.from({ length: triggers }, () =>
        fetch(`${base}/admin/fetch-forecasts`, { method: 'POST' }).then((r) => r.text()),
      ),
    );
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function bench(url) {
  const samples = [];
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    const res = await fetch(url);
    await res.text();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const p50 = pct(samples, 50).toFixed(1);
  const p95 = pct(samples, 95).toFixed(1);
  const min = samples[0].toFixed(1);
  const max = samples[samples.length - 1].toFixed(1);
  console.log(`${url}  N=${N}  min=${min}ms  p50=${p50}ms  p95=${p95}ms  max=${max}ms`);
}

const endpoints = [`${base}/beaches`, `${base}/beaches/mesachti-ikaria/forecast`];

const loadPromise = loadLoop();
// Brief delay so the first fetches start hitting the CPU before we begin sampling.
await new Promise((r) => setTimeout(r, 100));
for (const url of endpoints) {
  await bench(url);
}
stop = true;
await loadPromise.catch(() => {});
