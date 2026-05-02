const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petDesktop", {
  getSnapshot: () => ipcRenderer.invoke("petDesktop:getSnapshot"),
  onStatusChanged: (listener) => {
    const wrapped = (_event, snapshot) => {
      listener(snapshot);
    };

    ipcRenderer.on("petDesktop:statusChanged", wrapped);
    return () => {
      ipcRenderer.removeListener("petDesktop:statusChanged", wrapped);
    };
  }
});
