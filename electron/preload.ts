import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("engine", {
  // Start engine polling
  start: (config: Record<string, unknown>) =>
    ipcRenderer.invoke("engine:start", config),

  // Stop engine
  stop: () => ipcRenderer.invoke("engine:stop"),

  // Subscribe to state updates
  onStateUpdate: (callback: (state: Record<string, unknown>) => void) => {
    ipcRenderer.on("engine:state-update", (_, state) => callback(state));
  },

  // Manual actions
  reloadDrive: (driveName: string) =>
    ipcRenderer.invoke("engine:reload-drive", driveName),

  analyzeMix: () => ipcRenderer.invoke("engine:analyze-mix"),
});
