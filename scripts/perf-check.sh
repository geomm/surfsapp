#!/bin/bash
# scripts/perf-check.sh — Perf regression check vs scripts/perf-baseline.json
#
# Usage:
#   ./scripts/perf-check.sh                # frontend + backend
#   ./scripts/perf-check.sh --frontend     # frontend only
#   ./scripts/perf-check.sh --backend      # backend only (requires backend running)
#   ./scripts/perf-check.sh --help
#
# Frontend  : `yarn build` -> chunk gzip sizes; preview server + 3x Lighthouse mobile (median Performance)
# Backend   : 60-sample p50/p95 on `/beaches` and `/beaches/:id/forecast`, idle and during a forecast fetch
# Compares  : current vs scripts/perf-baseline.json
# Thresholds: hard floor + relative regression budget (see baseline JSON `thresholds` block)
# Exit code : 0 if no regression beyond thresholds, 1 otherwise

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="$REPO/scripts/perf-baseline.json"
RESULTS="$REPO/scripts/perf-current.json"
PREVIEW_PORT=4173
BACKEND_BASE="${BENCH_BASE:-http://127.0.0.1:3000}"
BENCH_BEACH_ID="${BENCH_BEACH_ID:-mesachti-ikaria}"

MODE="all"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --frontend) MODE="frontend"; shift ;;
    --backend)  MODE="backend"; shift ;;
    --all)      MODE="all"; shift ;;
    -h|--help)
      sed -n '2,15p' "$0" | sed 's|^# \?||'
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing dep: $1" >&2; exit 2; }
}
require jq
require node
require curl
[[ "$MODE" != "backend" ]] && require yarn
[[ "$MODE" != "backend" ]] && require lighthouse
[[ "$MODE" != "backend" ]] && require gzip

[[ -f "$BASELINE" ]] || { echo "Missing baseline: $BASELINE" >&2; exit 2; }

# ------------------------------------------------------------------ helpers

gzipped_kb() {
  local f="$1"
  [[ -f "$f" ]] || { echo "0"; return; }
  gzip -c "$f" | wc -c | awk '{printf "%.0f", $1/1024}'
}

# Newest-mtime match for a glob pattern; empty if none.
newest() {
  ls -t $1 2>/dev/null | head -1 || true
}

med3() {
  printf '%s\n%s\n%s\n' "$1" "$2" "$3" | sort -n | sed -n '2p'
}

# Parse a "url ... p50=Xms p95=Yms ..." line and emit "p50 p95"
parse_p50_p95() {
  echo "$1" | sed -E 's/.*p50=([0-9.]+)ms.*p95=([0-9.]+)ms.*/\1 \2/'
}

# regression flag for a numeric metric; prints OK/REGR
flag_pct_increase() {
  local current="$1" baseline="$2" pct_budget="$3"
  awk -v c="$current" -v b="$baseline" -v p="$pct_budget" \
    'BEGIN { if (b == 0) { print "OK"; exit } if ((c - b) / b * 100 > p) print "REGR"; else print "OK" }'
}
flag_point_drop() {
  local current="$1" baseline="$2" point_budget="$3"
  awk -v c="$current" -v b="$baseline" -v p="$point_budget" \
    'BEGIN { if (b - c > p) print "REGR"; else print "OK" }'
}
flag_floor() {
  local current="$1" floor="$2"
  awk -v c="$current" -v f="$floor" 'BEGIN { if (c < f) print "FAIL"; else print "OK" }'
}

# ------------------------------------------------------------------ frontend

run_frontend() {
  echo "▶ Building ui/ ..."
  (cd "$REPO/ui" && yarn --silent build) >/dev/null

  echo "▶ Measuring chunk gzip sizes..."
  local entry_js entry_css mlib_js mlib_css map_view bd_view
  entry_js=$(gzipped_kb  "$(newest "$REPO/ui/dist/assets/index-*.js")")
  entry_css=$(gzipped_kb "$(newest "$REPO/ui/dist/assets/index-*.css")")
  mlib_js=$(gzipped_kb   "$(newest "$REPO/ui/dist/assets/maplibre-gl-*.js")")
  mlib_css=$(gzipped_kb  "$(newest "$REPO/ui/dist/assets/maplibre-gl-*.css")")
  map_view=$(gzipped_kb  "$(newest "$REPO/ui/dist/assets/MapView-*.js")")
  bd_view=$(gzipped_kb   "$(newest "$REPO/ui/dist/assets/BeachDetailView-*.js")")

  echo "▶ Starting preview server on :$PREVIEW_PORT ..."
  (cd "$REPO/ui" && yarn --silent preview --port "$PREVIEW_PORT" >/dev/null 2>&1) &
  local preview_pid=$!
  trap 'kill '"$preview_pid"' 2>/dev/null || true' RETURN

  for _ in $(seq 1 15); do
    curl -sf "http://127.0.0.1:$PREVIEW_PORT/" -o /dev/null && break
    sleep 1
  done

  echo "▶ Lighthouse mobile (3x, median Performance)..."
  local s1 s2 s3
  for i in 1 2 3; do
    local s
    s=$(lighthouse "http://127.0.0.1:$PREVIEW_PORT/" \
        --output=json --output-path=- --quiet \
        --chrome-flags="--headless=new --no-sandbox --disable-gpu" 2>/dev/null \
      | jq -r '.categories.performance.score * 100')
    eval "s$i=$s"
    echo "    run $i: $s"
  done
  local lh_perf
  lh_perf=$(med3 "$s1" "$s2" "$s3")

  kill "$preview_pid" 2>/dev/null || true
  trap - RETURN

  jq -n \
    --arg lh "$lh_perf" \
    --arg ej "$entry_js" --arg ec "$entry_css" \
    --arg mj "$mlib_js" --arg mc "$mlib_css" \
    --arg mv "$map_view" --arg bv "$bd_view" \
    '{
      lighthousePerformance: ($lh | tonumber),
      chunksGzipKB: {
        indexEntry:       ($ej | tonumber),
        indexEntryCss:    ($ec | tonumber),
        maplibreLazyJs:   ($mj | tonumber),
        maplibreLazyCss:  ($mc | tonumber),
        mapView:          ($mv | tonumber),
        beachDetailView:  ($bv | tonumber)
      }
    }'
}

# ------------------------------------------------------------------ backend

run_backend() {
  if ! curl -sf "$BACKEND_BASE/health" -o /dev/null; then
    echo "▶ Backend not reachable at $BACKEND_BASE (set BENCH_BASE to override). Skipping backend bench." >&2
    echo "null"
    return 0
  fi

  echo "▶ Backend idle bench (N=60)..."
  local idle_out
  idle_out=$(BENCH_BASE="$BACKEND_BASE" BENCH_N=60 \
    node "$REPO/scripts/bench-backend.mjs" \
      "$BACKEND_BASE/beaches" \
      "$BACKEND_BASE/beaches/$BENCH_BEACH_ID/forecast")
  echo "$idle_out"

  echo "▶ Backend during-fetch bench (BENCH_TRIGGERS=1, N=60)..."
  local fetch_out
  fetch_out=$(BENCH_BASE="$BACKEND_BASE" BENCH_N=60 BENCH_TRIGGERS=1 \
    node "$REPO/scripts/bench-during-fetch.mjs")
  echo "$fetch_out"

  local idle_beaches idle_forecast during_beaches during_forecast
  idle_beaches=$(parse_p50_p95   "$(echo "$idle_out"   | grep -E "/beaches\s")")
  idle_forecast=$(parse_p50_p95  "$(echo "$idle_out"   | grep -E "/forecast")")
  during_beaches=$(parse_p50_p95 "$(echo "$fetch_out"  | grep -E "/beaches\s")")
  during_forecast=$(parse_p50_p95 "$(echo "$fetch_out" | grep -E "/forecast")")

  jq -n \
    --argjson ib   "[${idle_beaches/ /,}]" \
    --argjson ibf  "[${idle_forecast/ /,}]" \
    --argjson db   "[${during_beaches/ /,}]" \
    --argjson dbf  "[${during_forecast/ /,}]" \
    '{
      idle: {
        "GET /beaches":              {p50Ms: $ib[0],  p95Ms: $ib[1]},
        "GET /beaches/:id/forecast": {p50Ms: $ibf[0], p95Ms: $ibf[1]}
      },
      duringFetch: {
        "GET /beaches":              {p50Ms: $db[0],  p95Ms: $db[1]},
        "GET /beaches/:id/forecast": {p50Ms: $dbf[0], p95Ms: $dbf[1]}
      }
    }'
}

# ------------------------------------------------------------------ run

RESULT='{}'
if [[ "$MODE" == "all" || "$MODE" == "frontend" ]]; then
  fe="$(run_frontend)"
  RESULT=$(jq --argjson fe "$fe" '. + {frontend: $fe}' <<< "$RESULT")
fi
if [[ "$MODE" == "all" || "$MODE" == "backend" ]]; then
  be="$(run_backend)"
  RESULT=$(jq --argjson be "$be" '. + {backend: $be}' <<< "$RESULT")
fi

echo "$RESULT" | jq '.' > "$RESULTS"

# ------------------------------------------------------------------ compare

LH_FLOOR=$(jq -r '.thresholds.lighthousePerformanceHardFloor' "$BASELINE")
LH_DROP=$(jq -r '.thresholds.lighthousePerformanceRegressionPoints' "$BASELINE")
CHUNK_PCT=$(jq -r '.thresholds.entryChunkGzipRegressionPct' "$BASELINE")
P95_PCT=$(jq -r '.thresholds.backendP95RegressionPct' "$BASELINE")

EXIT=0
echo ""
echo "=========================================="
echo "  Perf check vs scripts/perf-baseline.json"
echo "=========================================="
printf "%-46s %10s %10s %8s %s\n" "metric" "baseline" "current" "Δ" "status"
echo "--------------------------------------------------------------------------------"

report_floor() {
  local label="$1" base="$2" cur="$3" floor="$4"
  local f="$(flag_floor "$cur" "$floor")"
  printf "%-46s %10s %10s %8s %s\n" "$label" "$base" "$cur" "—" "$f (floor $floor)"
  [[ "$f" == "FAIL" ]] && EXIT=1 || true
}
report_drop() {
  local label="$1" base="$2" cur="$3" budget="$4"
  local delta f
  delta=$(awk -v c="$cur" -v b="$base" 'BEGIN { printf "%+.1f", c - b }')
  f="$(flag_point_drop "$cur" "$base" "$budget")"
  printf "%-46s %10s %10s %8s %s\n" "$label" "$base" "$cur" "$delta" "$f (drop ≤ ${budget}pt)"
  [[ "$f" == "REGR" ]] && EXIT=1 || true
}
report_pct() {
  local label="$1" base="$2" cur="$3" budget="$4"
  local delta f
  delta=$(awk -v c="$cur" -v b="$base" 'BEGIN { if (b == 0) print "—"; else printf "%+.1f%%", (c - b) / b * 100 }')
  f="$(flag_pct_increase "$cur" "$base" "$budget")"
  printf "%-46s %10s %10s %8s %s\n" "$label" "$base" "$cur" "$delta" "$f (≤ ${budget}%)"
  [[ "$f" == "REGR" ]] && EXIT=1 || true
}

# Frontend
if jq -e '.frontend' <<< "$RESULT" >/dev/null; then
  base_lh=$(jq -r '.frontend.lighthouseMobile.performance' "$BASELINE")
  cur_lh=$(jq -r  '.frontend.lighthousePerformance' <<< "$RESULT")
  report_floor "Lighthouse mobile Performance"          "$base_lh" "$cur_lh" "$LH_FLOOR"
  report_drop  "Lighthouse mobile Performance (vs base)" "$base_lh" "$cur_lh" "$LH_DROP"

  for k in indexEntry indexEntryCss maplibreLazyJs maplibreLazyCss mapView beachDetailView; do
    b=$(jq -r ".frontend.chunksGzipKB.$k" "$BASELINE")
    c=$(jq -r ".frontend.chunksGzipKB.$k" <<< "$RESULT")
    report_pct "chunk gzip KB: $k" "$b" "$c" "$CHUNK_PCT"
  done
fi

# Backend
if jq -e '.backend' <<< "$RESULT" >/dev/null && [[ "$(jq -r '.backend' <<< "$RESULT")" != "null" ]]; then
  for ep in "GET /beaches" "GET /beaches/:id/forecast"; do
    for state in idle duringFetch; do
      b=$(jq -r ".backend.${state}[\"$ep\"].p95Ms" "$BASELINE")
      c=$(jq -r ".backend.${state}[\"$ep\"].p95Ms" <<< "$RESULT")
      report_pct "$ep $state p95 ms" "$b" "$c" "$P95_PCT"
    done
  done
fi

echo ""
echo "Results written to: $RESULTS"
if [[ "$EXIT" -eq 0 ]]; then
  echo "✅ No regression beyond thresholds."
else
  echo "❌ Regression detected — see rows flagged REGR/FAIL."
fi
exit "$EXIT"
