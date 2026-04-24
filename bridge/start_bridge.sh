#!/usr/bin/env bash
set -u

SERIAL_PORT="${1:-/dev/ttyACM0}"
BAUD="${2:-115200}"
HOST="${3:-0.0.0.0}"
WS_PORT="${4:-8766}"

while true; do
  sudo chmod 666 "$SERIAL_PORT" || true
  echo "[bridge] start port=$WS_PORT serial=$SERIAL_PORT baud=$BAUD"
  python3 ws_bridge_v1.py --serial "$SERIAL_PORT" --baud "$BAUD" --host "$HOST" --port "$WS_PORT"
  echo "[bridge] exited, restart in 2s..."
  sleep 2
done
