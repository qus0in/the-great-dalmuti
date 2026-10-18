#!/bin/sh
# Health probe helpers for health.sh (S20): tail-only provider signals + stalled check.
# Provider patterns cover key-expired, request-failed, limits, HTTP 5xx (case-insensitive).
# Stalled: report missing/in-progress + worker idle/done + no progress older than N min.
# Pane input is always truncated to the last 8 visible lines (S26 false-positive guard).
set -u
HEALTH_PROBE_TAIL=${HEALTH_PROBE_TAIL:-8}
HEALTH_PROVIDER_RE='api key.*expired|provider request failed|rate.?limit|quota|capacity|unavailable|http[^0-9]*5[0-9][0-9]'
health_ts_epoch() {
  date -u -d "${1:-}" +%s 2>/dev/null && return 0
  date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "${1:-}" +%s 2>/dev/null && return 0
  echo 0
}
health_provider_match() {
  printf '%s\n' "${1:-}" | tail -n "$HEALTH_PROBE_TAIL" | grep -Eio "$HEALTH_PROVIDER_RE" 2>/dev/null | head -n 1
}
health_stalled_finding() {
  tdir=${1:-}; u=${2:-}; st=${3:-}; dts=${4:-}; rf=${5:-}; th=${6:-}
  case "$st" in idle|done) ;; *) return 1;; esac
  case "$th" in ''|*[!0-9]*) th=10;; esac
  if [ -n "$rf" ] && [ -f "$rf" ]; then
    case "$(head -n 1 "$rf" 2>/dev/null)" in "status: in-progress") ;; *) return 1;; esac
    miss=0
  else
    miss=1
  fi
  last=""
  if [ -f "$tdir/progress-$u.md" ]; then
    last=$(tail -n 1 "$tdir/progress-$u.md" 2>/dev/null | cut -d ' ' -f1)
  fi
  [ -n "$last" ] || last=$dts
  le=$(health_ts_epoch "$last"); now=$(date +%s)
  case "$le" in ''|*[!0-9]*) le=0;; esac
  if [ $((now - le)) -gt $((th * 60)) ]; then
    if [ "$miss" -eq 1 ]; then echo "no report >${th}m"; else echo "no progress >${th}m"; fi
    return 0
  fi
  return 1
}
