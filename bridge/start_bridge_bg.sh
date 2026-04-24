#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Clean existing bridge process to avoid port conflicts.
pkill -f "ws_bridge_v1.py" || true
sleep 1

nohup ./start_bridge.sh /dev/ttyACM0 115200 0.0.0.0 8770 > bridge.log 2>&1 &

sleep 2
if lsof -iTCP:8770 -sTCP:LISTEN -n -P; then
  echo "bridge started"
else
  echo "no-listener"
  tail -n 80 bridge.log || true
  exit 1
fi
