const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { app, BrowserWindow, ipcMain } = require("electron");

const STATUS_PUSH_INTERVAL_MS = 5000;
let mainWindow = null;
let statusTimer = null;
let lastCpuSample = sampleCpuTimes();
let lastSnapshot = null;

function sampleCpuTimes() {
  return os.cpus().reduce(
    (acc, cpu) => {
      const times = cpu.times;
      acc.idle += times.idle;
      acc.total +=
        times.user + times.nice + times.sys + times.idle + times.irq;
      return acc;
    },
    { idle: 0, total: 0 }
  );
}

function computeCpuPercent() {
  const next = sampleCpuTimes();
  const totalDelta = next.total - lastCpuSample.total;
  const idleDelta = next.idle - lastCpuSample.idle;
  lastCpuSample = next;

  if (totalDelta <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Number((((totalDelta - idleDelta) / totalDelta) * 100).toFixed(1)))
  );
}

function computeMemoryPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  if (total <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Number((((total - free) / total) * 100).toFixed(1)))
  );
}

function computeNetworkOnline() {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces).some((entries) =>
    (entries || []).some((entry) => {
      if (!entry || entry.internal) {
        return false;
      }
      if (entry.family !== "IPv4" && entry.family !== 4 && entry.family !== "IPv6" && entry.family !== 6) {
        return false;
      }
      if (typeof entry.address === "string" && entry.address.startsWith("169.254.")) {
        return false;
      }
      return true;
    })
  );
}

function loadBatterySnapshot() {
  if (process.platform !== "win32") {
    return Promise.resolve({});
  }

  const command = "Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining,BatteryStatus | ConvertTo-Json -Compress";
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-Command", command],
      { timeout: 2500, windowsHide: true },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve({});
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          const battery = Array.isArray(parsed) ? parsed[0] : parsed;
          if (!battery || typeof battery !== "object") {
            resolve({});
            return;
          }

          const batteryPercent = Number(battery.EstimatedChargeRemaining);
          const batteryStatus = Number(battery.BatteryStatus);
          resolve({
            batteryPercent: Number.isFinite(batteryPercent)
              ? Math.max(0, Math.min(100, batteryPercent))
              : undefined,
            batteryCharging: [6, 7, 8, 9].includes(batteryStatus)
          });
        } catch {
          resolve({});
        }
      }
    );
  });
}

async function buildSystemSnapshot() {
  const battery = await loadBatterySnapshot();
  return {
    cpuPercent: computeCpuPercent(),
    memoryPercent: computeMemoryPercent(),
    networkOnline: computeNetworkOnline(),
    windowFocused: mainWindow ? mainWindow.isFocused() : false,
    timestamp: Date.now(),
    ...battery
  };
}

async function pushSystemSnapshot(force = false) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const snapshot = await buildSystemSnapshot();
  lastSnapshot = snapshot;

  if (force || mainWindow.webContents) {
    mainWindow.webContents.send("petDesktop:statusChanged", snapshot);
  }
}

function startStatusUpdates() {
  if (statusTimer != null) {
    clearInterval(statusTimer);
  }

  statusTimer = setInterval(() => {
    void pushSystemSnapshot();
  }, STATUS_PUSH_INTERVAL_MS);
}

function stopStatusUpdates() {
  if (statusTimer != null) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow = win;
  win.loadFile(path.join(__dirname, "cubism_app", "dist", "index.html"));
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
  win.webContents.on("did-fail-load", (_event, code, desc, url) => {
    console.log(`[load-failed] ${code} ${desc} ${url}`);
  });
  win.on("focus", () => {
    void pushSystemSnapshot(true);
  });
  win.on("blur", () => {
    void pushSystemSnapshot(true);
  });
  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

ipcMain.handle("petDesktop:getSnapshot", async () => {
  if (lastSnapshot != null) {
    return { ...lastSnapshot, windowFocused: mainWindow ? mainWindow.isFocused() : false };
  }

  const snapshot = await buildSystemSnapshot();
  lastSnapshot = snapshot;
  return snapshot;
});

app.whenReady().then(() => {
  createWindow();
  startStatusUpdates();
  void pushSystemSnapshot(true);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopStatusUpdates();
});
