#!/bin/sh
# Unreceived callbacks reporting helper for health.sh (S17, S26).
# Lists callbacks marked delivered=no, or legacy/unknown callbacks without orchestrator processing.
health_unreceived_lines() {
  task_dir=$1; clog="$task_dir/callbacks.log"
  [ -f "$clog" ] || return 0
  awk -v td="$task_dir" '
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
        u = order[j]; d = u_del[u]; un = (d == "no")
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
        if (un) printf "%-16.16s %-11.11s %-11.11s %-8.8s %s\n", u, u_w[u], d, u_st[u], u_rep[u]
      }
    }
  ' "$clog"
}
