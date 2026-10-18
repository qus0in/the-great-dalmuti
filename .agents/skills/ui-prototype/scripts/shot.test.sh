#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
FIX="$ROOT/tmp/shot-test-$$"; mkdir -p "$FIX"
SHOT="$HERE/shot.sh"

cat << 'EOF' > "$FIX/server.py"
import http.server, socketserver, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/404':
            self.send_response(404); self.end_headers(); self.wfile.write(b'Not Found')
        elif self.path == '/redirect-404':
            self.send_response(302); self.send_header('Location', '/404'); self.end_headers()
        elif self.path == '/500':
            self.send_response(500); self.end_headers(); self.wfile.write(b'Server Error')
        elif self.path == '/ok.html':
            self.send_response(200); self.send_header('Content-Type', 'text/html'); self.end_headers()
            self.wfile.write(b'<!doctype html><html><body><h1>OK</h1></body></html>')
        else:
            self.send_response(404); self.end_headers()

server = socketserver.TCPServer(('127.0.0.1', 0), Handler)
sys.stdout.write(f'{server.server_address[1]}\n'); sys.stdout.flush()
server.serve_forever()
EOF

python3 -u "$FIX/server.py" > "$FIX/port.txt" 2>&1 &
SPID=$!; trap 'kill "$SPID" 2>/dev/null || true; wait "$SPID" 2>/dev/null || true; rm -rf "$FIX"' EXIT
tries=0; port=""
while [ "$tries" -lt 50 ]; do
  port=$(head -n 1 "$FIX/port.txt" 2>/dev/null || true)
  [ -z "$port" ] || break
  sleep 0.1; tries=$((tries + 1))
done
[ -n "$port" ] || { echo "failed to start test server" >&2; exit 1; }

# 1. 404 URL -> rc=1 and 0 PNGs
out_dir="$FIX/out-404"; mkdir -p "$out_dir"
rc=0; "$SHOT" "$out_dir" "http://127.0.0.1:$port/404" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || { echo "expected rc 1 on 404, got $rc" >&2; exit 1; }
png_count=$(find "$out_dir" -name '*.png' | wc -l | tr -d ' ')
[ "$png_count" -eq 0 ] || { echo "expected 0 pngs on 404, got $png_count" >&2; exit 1; }

# 2. redirect to 404 -> rc=1 and 0 PNGs
out_dir="$FIX/out-redir"; mkdir -p "$out_dir"
rc=0; "$SHOT" "$out_dir" "http://127.0.0.1:$port/redirect-404" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || { echo "expected rc 1 on redirect 404, got $rc" >&2; exit 1; }
png_count=$(find "$out_dir" -name '*.png' | wc -l | tr -d ' ')
[ "$png_count" -eq 0 ] || { echo "expected 0 pngs on redirect 404, got $png_count" >&2; exit 1; }

# 3. 500 URL -> rc=1 and 0 PNGs
out_dir="$FIX/out-500"; mkdir -p "$out_dir"
rc=0; "$SHOT" "$out_dir" "http://127.0.0.1:$port/500" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || { echo "expected rc 1 on 500, got $rc" >&2; exit 1; }
png_count=$(find "$out_dir" -name '*.png' | wc -l | tr -d ' ')
[ "$png_count" -eq 0 ] || { echo "expected 0 pngs on 500, got $png_count" >&2; exit 1; }

# 4. 200 URL -> rc=0 and 5 PNGs generated
out_dir="$FIX/out-200"; mkdir -p "$out_dir"
rc=0; "$SHOT" "$out_dir" "http://127.0.0.1:$port/ok.html" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 0 ] || { echo "expected rc 0 on ok.html, got $rc" >&2; exit 1; }
png_count=$(find "$out_dir" -name '*.png' | wc -l | tr -d ' ')
[ "$png_count" -eq 5 ] || { echo "expected 5 pngs on ok.html, got $png_count" >&2; exit 1; }

# 5. closed port -> rc=1 and 0 PNGs
out_dir="$FIX/out-closed"; mkdir -p "$out_dir"
rc=0; "$SHOT" "$out_dir" "http://127.0.0.1:1" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || { echo "expected rc 1 on closed port, got $rc" >&2; exit 1; }
png_count=$(find "$out_dir" -name '*.png' | wc -l | tr -d ' ')
[ "$png_count" -eq 0 ] || { echo "expected 0 pngs on closed port, got $png_count" >&2; exit 1; }

echo "shot.test.sh: ok"
