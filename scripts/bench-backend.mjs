#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('Usage: bench-backend.mjs <url> [<url>...]   (env BENCH_N to override sample count, default 60)');
  process.exit(1);
}

const N = parseInt(process.env.BENCH_N ?? '60', 10);

function pct(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

for (const url of urls) {
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
