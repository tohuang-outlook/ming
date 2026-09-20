import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("mingliDesktop", {
  analyzeFace: (bytes: Uint8Array) => ipcRenderer.invoke("mingli:analyze-face", bytes),
  exportFace: (report: unknown) => ipcRenderer.invoke("mingli:export-face", report),
  exportBackup: (raw: string) => ipcRenderer.invoke("mingli:export-backup", raw),
  status: () => ipcRenderer.invoke("mingli:status"),
  saveKey: (key: string, remember: boolean) => ipcRenderer.invoke("mingli:save-key", key, remember),
  clearKey: () => ipcRenderer.invoke("mingli:clear-key"),
  interpret: (input: unknown) => ipcRenderer.invoke("mingli:interpret", input),
});
