#!/usr/bin/env bash
set -euo pipefail

SERIAL_PORT="${1:-/dev/ttyACM0}"
BAUD="${2:-115200}"
HOST="${3:-0.0.0.0}"
WS_PORT="${4:-8770}"

ensure_serial_access() {
  if [ ! -e "$SERIAL_PORT" ]; then
    echo "[bridge] warn: serial device not found: $SERIAL_PORT"
    return
  fi

  if [ -r "$SERIAL_PORT" ] && [ -w "$SERIAL_PORT" ]; then
    return
  fi

  chmod 666 "$SERIAL_PORT" 2>/dev/null || true

  if [ ! -r "$SERIAL_PORT" ] || [ ! -w "$SERIAL_PORT" ]; then
    sudo -n chmod 666 "$SERIAL_PORT" 2>/dev/null || true
  fi
}

while true; do
  ensure_serial_access
  echo "[bridge] start port=$WS_PORT serial=$SERIAL_PORT baud=$BAUD"
  python3 -u ws_bridge_v1.py --serial "$SERIAL_PORT" --baud "$BAUD" --host "$HOST" --port "$WS_PORT"
  echo "[bridge] exited, restart in 2s..."
  sleep 2
done
