#!/bin/sh
# Unreceived callbacks reporting helper for health.sh (S17, S26, S30).
# Lists failed/legacy callbacks and pending retries older than ten minutes.
health_unreceived_lines() {
  task_dir=$1; clog="$task_dir/callbacks.log"
  [ -f "$clog" ] || return 0
  rows=$(awk -v td="$task_dir" '
    function canon(name,   c) {
      c = name
      while (c ~ /^p[0-9A-Za-z]+-/ || c ~ /^review[-_]/) {
        sub(/^p[0-9A-Za-z]+-/, "", c); sub(/^review[-_]/, "", c)
      }
      return c
    }
    BEGIN { n = 0 }
    /^\[/ {
      ts = substr($1, 2, length($1)-2); u = "?"; w = "?"; st = "?"; del = "unknown"; rep = "?"
      for (i=2; i<=NF; i++) {
        if ($i ~ /^unit=/) u = substr($i, 6); else if ($i ~ /^worker=/) w = substr($i, 8)
        else if ($i ~ /^status=/) st = substr($i, 8); else if ($i ~ /^report=/) rep = substr($i, 8)
        else if ($i ~ /^delivered=/) del = substr($i, 11)
      }
      if (!(u in seen)) { order[++n] = u; seen[u] = 1 }
      u_ts[u] = ts; u_w[u] = w; u_st[u] = st; u_del[u] = del; u_rep[u] = rep
    }
    END {
      df = td "/dispatch.log"; dc = 0
      while ((getline dl < df) > 0) {
        if (dl ~ / dispatched /) { split(dl, p, " "); d_ts[++dc] = p[1]; d_u[dc] = p[4] }
      }
      close(df)
      for (j=1; j<=n; j++) {
        u = order[j]; d = u_del[u]; un = (d == "no" || d == "pending")
        if (d == "unknown") {
          pr = 0; uc = canon(u)
          for (k=1; k<=dc; k++) {
            if (d_ts[k] <= u_ts[u]) continue
            dc_name = canon(d_u[k])
            if (dc_name == uc || dc_name ~ ("^" uc "[-_]?(r[0-9]+|fix)$") || d_u[k] == u) {
              pr = 1; break
            }
          }
          if (!pr) un = 1
        }
        if (un) printf "%s\t%s\t%s\t%s\t%s\t%s\n", u, u_w[u], d, u_st[u], u_rep[u], u_ts[u]
      }
    }
  ' "$clog")
  [ -n "$rows" ] || return 0
  now=$(date +%s)
  printf '%s\n' "$rows" | while IFS="$(printf '\t')" read -r u w d st rep ts; do
    [ -n "$u" ] || continue
    if [ "$d" = pending ]; then
      started=$(health_ts_epoch "$ts")
      case "$started" in ''|*[!0-9]*) started=0;; esac
      [ $((now - started)) -gt 600 ] || continue
      d='pending>10m'
    fi
    printf "%-16.16s %-11.11s %-11.11s %-8.8s %s\n" "$u" "$w" "$d" "$st" "$rep"
  done
}
