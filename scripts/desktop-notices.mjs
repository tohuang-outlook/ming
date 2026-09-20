import { readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
export async function writeDesktopNotices(destination) {
  const seen = new Set(); const notices = [];
  async function visit(name, from) {
    const require = createRequire(path.join(from, "package.json"));
    let filename;
    try { filename = require.resolve(`${name}/package.json`); }
    catch {
      try {
        let dir = path.dirname(require.resolve(name));
        while (true) {
          try { const p = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")); if (p.name === name) { filename = path.join(dir, "package.json"); break; } } catch {}
          const parent = path.dirname(dir); if (parent === dir) return; dir = parent;
        }
      } catch { return; }
    }
    if (seen.has(filename)) return; seen.add(filename);
    const dir = path.dirname(filename); const pkg = JSON.parse(await readFile(filename, "utf8"));
    const files = (await readdir(dir)).filter(n => /^(licen[sc]e|copying|notice)(\.|$)/i.test(n));
    notices.push(`\n${"=".repeat(70)}\n${pkg.name} ${pkg.version}\nLicense: ${JSON.stringify(pkg.license ?? "See package license")}\n`);
    for (const file of files) { try { notices.push(await readFile(path.join(dir, file), "utf8")); } catch {} }
    for (const dependency of Object.keys(pkg.dependencies ?? {})) await visit(dependency, dir);
  }
  for (const name of ["next", "react", "react-dom", "lucide-react", "zod", "@js-temporal/polyfill", "lunar-typescript", "iztro", "openai"]) await visit(name, process.cwd());
  await writeFile(destination, "Third-party software notices for 中華命理 AI.\nSome listed packages support build-time rendering. Electron/Chromium notices are included in the app framework.\n" + notices.join("\n"));
}
