import argparse
import asyncio
import json
from datetime import datetime, timezone

import serial
import websockets

from parser_v1 import EventParser

clients = set()

INTENT_PRIORITY = [
    "dance",
    "greeting",
    "positive",
    "negative",
    "question",
    "sleep",
]

INTENT_KEYWORDS = {
    "greeting": ["你好", "早安", "晚安", "嗨", "hi", "hello"],
    "question": ["?", "？", "为什么", "怎么", "是否", "吗", "呢"],
    "positive": ["好", "喜欢", "开心", "可以", "太棒了", "真棒", "不错", "厉害"],
    "negative": ["不行", "失败", "错误", "糟糕", "抱歉", "不好", "麻烦"],
    "dance": ["跳舞", "唱歌", "表演", "动一动", "来一段", "摇摆", "秀一下"],
    "sleep": ["睡觉", "晚安", "安静", "休息", "睡吧", "困"],
}

INTENT_TO_EMOTION = {
    "greeting": "happy",
    "question": "curious",
    "positive": "happy",
    "negative": "sad",
    "dance": "excited",
    "sleep": "calm",
    "neutral": "calm",
}


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
            "detail": detail,
        },
        "raw": detail,
        "uptime_ms": None,
    }


def infer_intent_from_text(text: str) -> str:
    source = (text or "").lower()
    if not source:
        return "neutral"

    for intent in INTENT_PRIORITY:
        if any(keyword.lower() in source for keyword in INTENT_KEYWORDS[intent]):
            return intent

    return "neutral"


def infer_emotion_from_intent(intent: str) -> str:
    return INTENT_TO_EMOTION.get(intent, "calm")


def infer_tts_energy(text: str, intent: str) -> float:
    source = text or ""
    base = {
        "dance": 0.95,
        "greeting": 0.72,
        "positive": 0.78,
        "negative": 0.42,
        "question": 0.58,
        "sleep": 0.24,
        "neutral": 0.62,
    }.get(intent, 0.62)

    if "！" in source or "!" in source:
        base += 0.08
    if len(source) >= 18:
        base += 0.05

    return max(0.0, min(1.0, round(base, 2)))


def make_extra_event(parser: EventParser, event: str, payload: dict, source_evt: dict):
    parser.seq += 1
    return {
        "version": "v1",
        "event": event,
        "ts": now_iso(),
        "seq": parser.seq,
        "source": "signal_bridge",
        "payload": payload,
        "raw": source_evt.get("raw"),
        "uptime_ms": source_evt.get("uptime_ms"),
    }


def derive_richer_events(parser: EventParser, evt: dict, last_state):
    derived = []
    event_type = evt.get("event")
    payload = evt.get("payload", {})

    if event_type == "assistant_text":
        text = str(payload.get("text", ""))
        intent = infer_intent_from_text(text)
        emotion = infer_emotion_from_intent(intent)
        energy = infer_tts_energy(text, intent)
        derived.append(
            make_extra_event(
                parser,
                "assistant_intent",
                {"intent": intent, "source_event_seq": evt.get("seq")},
                evt,
            )
        )
        derived.append(
            make_extra_event(
                parser,
                "assistant_emotion",
                {"emotion": emotion, "source_event_seq": evt.get("seq")},
                evt,
            )
        )
        derived.append(
            make_extra_event(
                parser,
                "tts_energy",
                {"energy": energy, "source_event_seq": evt.get("seq")},
                evt,
            )
        )

    if event_type == "state_changed":
        state = str(payload.get("state", "")).strip().lower()
        if state == "speaking" and last_state != "speaking":
            derived.append(
                make_extra_event(
                    parser,
                    "tts_start",
                    {
                        "energy": 0.75,
                        "state": state,
                        "source_event_seq": evt.get("seq"),
                    },
                    evt,
                )
            )
        elif last_state == "speaking" and state != "speaking":
            derived.append(
                make_extra_event(
                    parser,
                    "tts_end",
                    {
                        "energy": 0.0,
                        "state": state,
                        "source_event_seq": evt.get("seq"),
                    },
                    evt,
                )
            )

    return derived


async def ws_handler(websocket, *args):
    clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        clients.discard(websocket)


async def serial_loop(port: str, baud: int):
    parser = EventParser()
    last_state = None

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
                    if evt is None:
                        continue

                    outbound = [evt]
                    outbound.extend(derive_richer_events(parser, evt, last_state))

                    if evt.get("event") == "state_changed":
                        last_state = str(
                            evt.get("payload", {}).get("state", "")
                        ).strip().lower()

                    for outgoing in outbound:
                        msg = json.dumps(outgoing, ensure_ascii=False)
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
        ping_timeout=20,
    ):
        print(
            f"[INFO] websocket listening: ws://{args.host}:{args.port}",
            flush=True,
        )
        await serial_loop(args.serial, args.baud)


if __name__ == "__main__":
    asyncio.run(main())
