# Showcase Runbook

## 1. Goal

Use this runbook before demos, course presentations, or recorded walkthroughs.

The target outcome is:

- bridge alive
- serial device readable
- WebSocket reachable at `8770`
- Electron pet UI starts cleanly
- bilingual switch works
- interaction and system cards are ready for presentation

## 2. Linux side

### Start bridge

```bash
cd ~/ent208tc_bridge
./start_bridge_bg.sh
tail -f bridge.log
```

Expected lines:

```text
[INFO] websocket listening: ws://0.0.0.0:8770
[INFO] open serial: /dev/ttyACM0 @ 115200
```

### If serial permission fails

```bash
ls -l /dev/ttyACM0
sudo chmod 666 /dev/ttyACM0
python3 -c "import serial; serial.Serial('/dev/ttyACM0',115200,timeout=1); print('serial ok')"
```

Then restart bridge:

```bash
pkill -f ws_bridge_v1.py
cd ~/ent208tc_bridge
./start_bridge_bg.sh
tail -f bridge.log
```

### Long-term fix

```bash
sudo usermod -aG dialout dts
```

Log out and log back in after running it.

## 3. Windows side

### Start the desktop pet UI

```powershell
cd "E:\Data Science and Big Data Technology\Stage2\Semester2\ENT208TC\ENT208TC_Assistant\pet_electron"
.\start_pet_ui.bat
```

Alternative:

```powershell
cd "E:\Data Science and Big Data Technology\Stage2\Semester2\ENT208TC\ENT208TC_Assistant\pet_electron"
npm run build:cubism_app
npm start
```

## 4. Presentation flow

Recommended order:

1. Launch the app
2. Verify connection state
3. Switch between `中文` and `EN`
4. Show region-based model interaction
5. Show system status card
6. Show focus timer
7. Trigger a live device interaction and show the WebSocket-linked response

## 5. Quick troubleshooting

### Repeated “auto reconnect”

Usually means one of these:

- bridge is not running
- `8770` is not reachable
- `/dev/ttyACM0` permission failed
- VM or local network changed

### Quick port check on Windows

```powershell
Test-NetConnection 192.168.133.140 -Port 8770
```

### If the device replies but the UI still shows Chinese in English mode

That is expected when the text comes from the upstream backend. The frontend UI and frontend-generated interaction lines are bilingual, but real backend replies still follow the active backend language.

