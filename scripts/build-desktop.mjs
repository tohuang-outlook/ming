import { cp, mkdir, rm, writeFile, symlink } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { writeDesktopNotices } from "./desktop-notices.mjs";
import { verifyArtifactSecrets } from "./release-security.mjs";
const root = process.cwd();
const staging = path.join(root, "work/desktop-source");
const output = path.join(root, "work/desktop-app");
await rm(staging, { recursive: true, force: true });
await rm(output, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await mkdir(output, { recursive: true });
for (const item of ["app", "components", "lib", "types", "public", "data", "package.json", "tsconfig.json", "postcss.config.mjs", "next-env.d.ts"]) {
  await cp(path.join(root, item), path.join(staging, item), { recursive: true });
}
await rm(path.join(staging, "app/api"), { recursive: true, force: true });
await symlink(path.join(root, "node_modules"), path.join(staging, "node_modules"));
await writeFile(path.join(staging, "next.config.mjs"), 'export default { output: "export", poweredByHeader: false, images: { unoptimized: true }, env: { MINGLI_DESKTOP_BUILD: "1" } };\n');
// Only explicitly allowed build variables are inherited. Never copy .env files into staging.
const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "LANG", "SHELL"].filter(k => process.env[k]).map(k => [k, process.env[k]]));
Object.assign(env, { MINGLI_DESKTOP_BUILD: "1", NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" });
const result = spawnSync(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build", "--webpack"], { cwd: staging, stdio: "inherit", env });
if (result.status !== 0) process.exit(result.status ?? 1);
await cp(path.join(staging, "out"), path.join(output, "renderer"), { recursive: true });
for (const entry of ["main", "preload"]) await build({ entryPoints: [path.join(root, `desktop/${entry}.ts`)], bundle: true, platform: "node", format: "cjs", target: "node24", external: ["electron"], outfile: path.join(output, `${entry}.cjs`), sourcemap: false, minify: false });
await writeFile(path.join(output, "package.json"), JSON.stringify({ name: "zhonghua-mingli-desktop", productName: "中華命理 AI", version: "1.6.0", description: "本機易經、八字與紫微排盤，DeepSeek AI 解讀", author: "Tony Huang", main: "main.cjs", private: true }, null, 2));
await cp(path.join(root, "LICENSE"), path.join(output, "LICENSE")).catch(e => { if (e.code !== "ENOENT") throw e; });
await mkdir(path.join(output, "native"), { recursive: true });
const native = spawnSync("xcrun", ["swiftc", "-O", "-target", "arm64-apple-macos13.0", "-module-cache-path", path.join(root, "work/swift-cache"), path.join(root, "desktop/face-landmarks.swift"), "-o", path.join(output, "native/face-landmarks")], { stdio: "inherit" });
if (native.status !== 0) process.exit(native.status ?? 1);
await writeDesktopNotices(path.join(output, "THIRD_PARTY_NOTICES.txt"));
await verifyArtifactSecrets(output, root);
console.log("Desktop payload built; no local secrets found.");
