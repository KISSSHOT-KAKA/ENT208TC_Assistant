import sys
import re
import json
from datetime import datetime, timezone

WAKE_RE = re.compile(r"Application:\s*Wake word detected:\s*(.+)$")
STATE_RE = re.compile(r"Application:\s*STATE:\s*([a-zA-Z_]+)")
USER_RE = re.compile(r"Application:\s*>>\s*(.+)$")
ASSIST_RE = re.compile(r"Application:\s*<<\s*(.+)$")
UPTIME_RE = re.compile(r"\((\d+)\)")

def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def network_error_code(lower_line: str):
    if "bcn_timeout" in lower_line:
        return "wifi_timeout"
    if "mqtt" in lower_line and (
        "disconnect" in lower_line
        or "reconnect" in lower_line
        or "connect failed" in lower_line
        or "error" in lower_line
    ):
        return "mqtt_disconnect"
    if "wifi" in lower_line and (
        "failed" in lower_line
        or "timeout" in lower_line
        or "disconnect" in lower_line
    ):
        return "wifi_error"
    return None

class EventParser:
    def __init__(self):
        self.seq = 0

    def _base(self, event, payload, raw):
        self.seq += 1
        uptime_match = UPTIME_RE.search(raw)
        uptime_ms = int(uptime_match.group(1)) if uptime_match else None
        return {
            "version": "v1",
            "event": event,
            "ts": now_iso(),
            "seq": self.seq,
            "source": "serial_bridge",
            "payload": payload,
            "raw": raw,
            "uptime_ms": uptime_ms,
        }

    def parse_line(self, line: str):
        raw = line.strip()
        if not raw:
            return None

        m = WAKE_RE.search(raw)
        if m:
            return self._base("wake_detected", {"keyword": m.group(1).strip()}, raw)

        m = STATE_RE.search(raw)
        if m:
            return self._base("state_changed", {"state": m.group(1).strip()}, raw)

        m = USER_RE.search(raw)
        if m:
            return self._base("user_text", {"text": m.group(1).strip()}, raw)

        m = ASSIST_RE.search(raw)
        if m:
            return self._base("assistant_text", {"text": m.group(1).strip()}, raw)

        lower_line = raw.lower()
        code = network_error_code(lower_line)
        if code:
            return self._base("network_error", {"code": code, "detail": raw}, raw)

        return None

def main():
    parser = EventParser()
    for line in sys.stdin:
        evt = parser.parse_line(line)
        if evt is not None:
            print(json.dumps(evt, ensure_ascii=False))

if __name__ == "__main__":
    main()
