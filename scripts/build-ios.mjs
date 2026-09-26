import { cp, mkdir, rm, writeFile, symlink, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { verifyArtifactSecrets } from "./release-security.mjs";
import { writeDesktopNotices } from "./desktop-notices.mjs";
const root = process.cwd();
const staging = path.join(root, "work/ios-source");
const output = path.join(root, "outputs/Mingli-iOS");
await rm(staging, { recursive: true, force: true });
await rm(output, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await cp(path.join(root, "ios/Mingli"), path.join(output, "Mingli"), { recursive: true });
await cp(path.join(root, "ios/Mingli.xcodeproj"), path.join(output, "Mingli.xcodeproj"), { recursive: true });
for (const item of ["app", "components", "lib", "types", "public", "data", "package.json", "tsconfig.json", "postcss.config.mjs", "next-env.d.ts"]) await cp(path.join(root, item), path.join(staging, item), { recursive: true });
await rm(path.join(staging, "app/api"), { recursive: true, force: true });
await symlink(path.join(root, "node_modules"), path.join(staging, "node_modules"));
await writeFile(path.join(staging, "next.config.mjs"), 'export default { output: "export", poweredByHeader: false, images: { unoptimized: true }, env: { MINGLI_DESKTOP_BUILD: "1" } };\n');
const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "LANG", "SHELL"].filter(k => process.env[k]).map(k => [k, process.env[k]]));
Object.assign(env, { MINGLI_DESKTOP_BUILD: "1", NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" });
const result = spawnSync(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"], { cwd: staging, stdio: "inherit", env });
if (result.status !== 0) process.exit(result.status ?? 1);
const web = path.join(output, "Mingli/Web");
await cp(path.join(staging, "out"), web, { recursive: true });
// WKWebView local assets: no remote scripts, images, frames, or renderer API access.
async function secureHTML(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await secureHTML(file); continue; }
    if (!entry.name.endsWith(".html")) continue;
    let html = await readFile(file, "utf8");
    const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].filter(m => m[1]).map(m => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`);
    const csp = `default-src 'none'; script-src mingli: ${hashes.join(" ")}; style-src mingli: 'unsafe-inline'; img-src mingli: data: blob:; font-src mingli:; connect-src mingli:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
    html = html.replace("<head>", `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`);
    await writeFile(file, html);
  }
}
await secureHTML(web);
await build({ entryPoints: [path.join(root, "ios/bridge.ts")], bundle: true, platform: "browser", format: "iife", target: "safari17", outfile: path.join(output, "Mingli/bridge.js"), minify: true, sourcemap: false });
await writeDesktopNotices(path.join(web, "THIRD_PARTY_NOTICES.txt"));
await verifyArtifactSecrets(output, root);
await cp(path.join(root, "ios/README.md"), path.join(output, "安裝說明.md"));
console.log("iOS Xcode project ready; bundled assets passed local-secret scan.");
