#!/usr/bin/env node
// Trigger a single forecast fetch and bench API endpoints during that one cycle.
// Reflects realistic cron-driven load (one cycle every N hours), not a sustained loop.
import { performance } from 'node:perf_hooks';

const base = process.env.BENCH_BASE ?? 'http://localhost:3000';
const N = parseInt(process.env.BENCH_N ?? '60', 10);

function pct(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
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
  console.log(
    `${url}  N=${N}  min=${samples[0].toFixed(1)}ms  p50=${pct(samples, 50).toFixed(1)}ms  p95=${pct(samples, 95).toFixed(1)}ms  max=${samples[samples.length - 1].toFixed(1)}ms`,
  );
}

const endpoints = [`${base}/beaches`, `${base}/beaches/mesachti-ikaria/forecast`];

// Fire-and-forget a single fetch trigger, then immediately start sampling.
await fetch(`${base}/admin/fetch-forecasts`, { method: 'POST' }).then((r) => r.text());
for (const url of endpoints) {
  await bench(url);
}
