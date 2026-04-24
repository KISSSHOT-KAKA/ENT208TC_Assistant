const WebSocket = require("ws");

const url = process.env.WS_URL || "ws://192.168.133.140:8765";
let retryMs = 2000;

function connect() {
  console.log("[ws] connecting:", url);
  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("[ws] connected");
    retryMs = 2000;
  });

  ws.on("message", (data) => {
    console.log(data.toString());
  });

  ws.on("close", () => {
    console.log("[ws] closed, retry in", retryMs, "ms");
    setTimeout(connect, retryMs);
    retryMs = Math.min(Math.floor(retryMs * 1.5), 10000);
  });

  ws.on("error", (err) => {
    console.log("[ws] error:", err.message);
  });
}

connect();
