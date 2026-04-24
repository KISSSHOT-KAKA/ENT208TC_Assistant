import sys
import json
import serial
from parser_v1 import EventParser

def main():
    port = sys.argv[1] if len(sys.argv) > 1 else "/dev/ttyACM0"
    baud = int(sys.argv[2]) if len(sys.argv) > 2 else 115200

    parser = EventParser()
    print(f"[INFO] open serial: {port} @ {baud}")

    with serial.Serial(port, baudrate=baud, timeout=1) as ser:
        while True:
            line = ser.readline()
            if not line:
                continue
            raw = line.decode("utf-8", errors="ignore").strip()
            evt = parser.parse_line(raw)
            if evt is not None:
                print(json.dumps(evt, ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
