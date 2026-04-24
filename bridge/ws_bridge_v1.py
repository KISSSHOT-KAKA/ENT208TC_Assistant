import argparse
import asyncio
import json
from datetime import datetime, timezone

import serial
import websockets

from parser_v1 import EventParser

clients = set()


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


async def broadcast(message: str):
    if not clients:
        return
    dead = []
    for ws in list(clients):
        try:
            await ws.send(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)


def make_network_error(seq: int, detail: str):
    return {
        "version": "v1",
        "event": "network_error",
        "ts": now_iso(),
        "seq": seq,
        "source": "serial_bridge",
        "payload": {
            "code": "serial_error",
            "detail": detail
        },
        "raw": detail,
        "uptime_ms": None
    }


async def ws_handler(websocket, *args):
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.discard(websocket)


async def serial_loop(port: str, baud: int):
    parser = EventParser()

    while True:
        try:
            print(f"[INFO] open serial: {port} @ {baud}", flush=True)
            with serial.Serial(port, baudrate=baud, timeout=1) as ser:
                while True:
                    line = ser.readline()
                    if not line:
                        await asyncio.sleep(0)
                        continue

                    raw = line.decode("utf-8", errors="ignore").strip()
                    evt = parser.parse_line(raw)
                    if evt is not None:
                        msg = json.dumps(evt, ensure_ascii=False)
                        print(msg, flush=True)
                        await broadcast(msg)
        except Exception as e:
            parser.seq += 1
            err_evt = make_network_error(parser.seq, str(e))
            err_msg = json.dumps(err_evt, ensure_ascii=False)
            print(err_msg, flush=True)
            await broadcast(err_msg)
            await asyncio.sleep(2)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serial", default="/dev/ttyACM0")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8770)
    args = ap.parse_args()

    async with websockets.serve(
        ws_handler,
        args.host,
        args.port,
        ping_interval=20,
        ping_timeout=20
    ):
        print(f"[INFO] websocket listening: ws://{args.host}:{args.port}", flush=True)
        await serial_loop(args.serial, args.baud)


if __name__ == "__main__":
    asyncio.run(main())
