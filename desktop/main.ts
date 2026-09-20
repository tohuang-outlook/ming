import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, safeStorage, session } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { readFile, writeFile, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { interpretWithDeepSeek } from "../lib/interpretation/service";
import { parseBackup } from "../lib/storage";
import { InterpretRequestSchema } from "../lib/interpretation/schema";
import { APP_ORIGIN, trustedURL, assetPath, takeBudget, type Budget } from "./policy";

app.setName("中華命理 AI");
// A test-only data directory isolates automated checks; production has no environment-based configuration.
const testData = !app.isPackaged && process.env.MINGLI_TEST_DATA;
if (testData) app.setPath("userData", path.resolve(testData));
protocol.registerSchemesAsPrivileged([{ scheme: "mingli", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
let mainWindow: BrowserWindow | null = null;
let apiKey = "";
let remembered = false;
let keyError = false;
let aiBusy = false;
let settingsBusy = false;
const keyPath = () => path.join(app.getPath("userData"), "deepseek.enc");
async function atomicWrite(filename: string, contents: string | Buffer) {
  await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
  await writeFile(filename + ".tmp", contents, { mode: 0o600 });
  await rename(filename + ".tmp", filename);
}
async function loadKey() {
  try {
    const encrypted = await readFile(keyPath());
    if (!await safeStorage.isAsyncEncryptionAvailable()) throw new Error();
    const decrypted = await safeStorage.decryptStringAsync(encrypted);
    apiKey = decrypted.result; remembered = true;
    if (decrypted.shouldReEncrypt) await atomicWrite(keyPath(), await safeStorage.encryptStringAsync(apiKey));
  } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") keyError = true; }
}
function assertSender(event: IpcMainInvokeEvent) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || !trustedURL(event.senderFrame.url)) throw new Error("Invalid sender");
}
function handle(channel: string, callback: (...args: unknown[]) => Promise<unknown>) {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    try { assertSender(event); return await callback(...args); }
    catch { return { error: "此操作未完成，請稍後重試。" }; }
  });
}
function installIPC() {
  handle("mingli:export-backup", async (raw) => {
    if (typeof raw !== "string" || raw.length > 8_000_000) return { error: "備份格式或大小不正確。" };
    const backup = parseBackup(raw);
    const result = await dialog.showSaveDialog(mainWindow!, { title: "匯出命盤備份", defaultPath: "中華命理-裝置備份.json", filters: [{ name: "JSON 備份", extensions: ["json"] }] });
    if (result.canceled || !result.filePath) return { canceled: true };
    await writeFile(result.filePath, JSON.stringify(backup, null, 2), { mode: 0o600 });
    return {};
  });
  handle("mingli:status", async () => ({ configured: !!apiKey, remembered, ...(keyError ? { error: "無法解鎖已存金鑰，請重新輸入或移除金鑰。" } : {}) }));
  handle("mingli:save-key", async (value, remember) => {
    if (settingsBusy || aiBusy) return { error: "正在處理，請稍後再試。" };
    if (typeof value !== "string" || !/^sk-[A-Za-z0-9_-]{13,253}$/.test(value.trim()) || typeof remember !== "boolean") return { error: "請輸入有效的 DeepSeek API 金鑰。" };
    settingsBusy = true;
    try {
      const next = value.trim();
      if (remember) {
        if (!await safeStorage.isAsyncEncryptionAvailable()) return { error: "macOS 加密儲存不可用，請取消記住金鑰後重試。" };
        await atomicWrite(keyPath(), await safeStorage.encryptStringAsync(next));
      } else await rm(keyPath(), { force: true });
      apiKey = next; remembered = remember; keyError = false;
      return {};
    } finally { settingsBusy = false; }
  });
  handle("mingli:clear-key", async () => {
    if (settingsBusy || aiBusy) return { error: "正在處理，請稍後再試。" };
    settingsBusy = true;
    try { await rm(keyPath(), { force: true }); apiKey = ""; remembered = false; keyError = false; return {}; }
    finally { settingsBusy = false; }
  });
  handle("mingli:interpret", async (raw) => {
    if (!apiKey) return { error: "請先至設定輸入 DeepSeek API 金鑰。" };
    if (aiBusy || settingsBusy) return { error: "正在處理另一個請求，請稍後再試。" };
    if (JSON.stringify(raw)?.length > 96000) return { error: "命盤資料過大。" };
    const input = InterpretRequestSchema.safeParse(raw);
    if (!input.success) return { error: "命盤資料無效，請重新排盤。" };
    aiBusy = true;
    try {
      const filename = path.join(app.getPath("userData"), "ai-budget.json");
      let previous: Budget | undefined;
      try { previous = JSON.parse(await readFile(filename, "utf8")); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") return { error: "無法讀取本機使用額度，請檢查 App 儲存權限。" }; }
      let next;
      try { next = takeBudget(previous); } catch (e) { return { error: (e as Error).message }; }
      await atomicWrite(filename, JSON.stringify(next));
      try { return await interpretWithDeepSeek(input.data, apiKey); }
      catch { return { error: "DeepSeek 解讀未完成。請檢查網路、金鑰與 API 餘額後重試；原始命盤並未變更。" }; }
    } finally { aiBusy = false; }
  });
}
async function installProtocol() {
  const root = path.join(__dirname, "renderer");
  protocol.handle("mingli", async request => {
    try {
      if (request.method === "OPTIONS" && trustedURL(request.url)) return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": APP_ORIGIN, "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS", "Access-Control-Allow-Headers": "rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, next-url", "Access-Control-Allow-Credentials": "true" } });
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });
      let filename = assetPath(root, request.url);
      if (!path.extname(filename) && (await stat(filename + ".html").catch(() => null))?.isFile()) filename += ".html";
      else if ((await stat(filename).catch(() => null))?.isDirectory()) filename = path.join(filename, "index.html");
      if (!(await stat(filename).catch(() => null))?.isFile()) return new Response("Not found", { status: 404 });
      const bytes = await readFile(filename);
      const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json", ".txt": "text/plain; charset=utf-8" };
      const headers = new Headers({ "Content-Type": mime[path.extname(filename)] ?? "application/octet-stream", "Access-Control-Allow-Origin": APP_ORIGIN, "Access-Control-Allow-Credentials": "true" });
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Cache-Control", "no-store");
      // Hash only build-time inline Next scripts; generated content cannot add executable scripts.
      let body: BodyInit = new Uint8Array(bytes);
      let hashes = "";
      if (filename.endsWith(".html")) {
        const html = bytes.toString("utf8"); body = html;
        hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].filter(m => m[1]).map(m => "'sha256-" + createHash("sha256").update(m[1]).digest("base64") + "'").join(" ");
      }
      headers.set("Content-Security-Policy", `default-src 'none'; script-src 'self' ${hashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; frame-ancestors 'none'`);
      return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
    } catch { return new Response("Not found", { status: 404 }); }
  });
}
function createWindow() {
  mainWindow = new BrowserWindow({ width: 1280, height: 860, minWidth: 820, minHeight: 620, backgroundColor: "#101310", title: "中華命理 AI", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, devTools: !app.isPackaged } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => { if (!trustedURL(url)) event.preventDefault(); });
  mainWindow.webContents.on("will-attach-webview", event => event.preventDefault());
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  void mainWindow.loadURL(APP_ORIGIN + "/");
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (mainWindow?.isMinimized()) mainWindow.restore(); mainWindow?.show(); mainWindow?.focus(); });
  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !(trustedURL(details.url) || details.url.startsWith("blob:mingli://app/")) }));
    await installProtocol(); await loadKey(); installIPC();
    app.setAboutPanelOptions({ applicationName: "中華命理 AI", applicationVersion: app.getVersion(), copyright: "本機排盤 · DeepSeek AI 解讀" });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: "中華命理 AI", submenu: [{ role: "about", label: "關於中華命理 AI" }, { type: "separator" }, { role: "hide", label: "隱藏" }, { role: "quit", label: "結束中華命理 AI" }] },
      { label: "編輯", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
      { label: "顯示", submenu: [{ role: "reload", label: "重新載入" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "togglefullscreen" }] },
      { label: "視窗", submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }] },
    ]));
    createWindow();
    app.on("activate", () => { if (!mainWindow) createWindow(); });
  }).catch(() => { dialog.showErrorBox("中華命理 AI 無法啟動", "請重新開啟 App。若問題持續，請保留本機資料與備份後重新安裝。"); app.quit(); });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
  app.on("will-quit", () => { apiKey = ""; });
}
