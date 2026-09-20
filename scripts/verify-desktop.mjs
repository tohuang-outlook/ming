import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { extractAll, listPackage } from "@electron/asar";
import { verifyArtifactSecrets } from "./release-security.mjs";
function command(binary, args, capture = false) {
  const result = spawnSync(binary, args, { encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.status !== 0) throw new Error(`${binary} verification failed.`);
  return (result.stdout ?? "") + (result.stderr ?? "");
}
const requireNotarized = process.argv.includes("--require-notarized");
const app = path.resolve("outputs/desktop-build/mac-arm64/中華命理 AI.app");
const archive = path.join(app, "Contents/Resources/app.asar");
await mkdir("work", { recursive: true });
const extracted = await mkdtemp(path.resolve("work/release-check-"));
try {
  const files = listPackage(archive);
  if (files.some(name => /(?:node_modules|\.env|\.dev\.vars|\.enc$|test-data|face-test)/.test(name))) throw new Error("Unexpected private or development files in App.");
  extractAll(archive, extracted);
  await verifyArtifactSecrets(extracted);
  await verifyArtifactSecrets(path.join(app, "Contents/Resources/native"));
  for (const name of ["main.cjs", "preload.cjs"]) {
    if (!(await readFile(path.join(extracted, name))).equals(await readFile(path.join("work/desktop-app", name)))) throw new Error("Packaged code differs from the built payload.");
  }
  const { version } = JSON.parse(await readFile(path.join(extracted, "package.json"), "utf8"));
  const filename = `Zhonghua-Mingli-AI-${version}-arm64.dmg`;
  const dmg = path.resolve("outputs/desktop-build", filename);
  command("codesign", ["--verify", "--deep", "--strict", app]);
  const signature = command("codesign", ["-dv", "--verbose=2", app], true);
  command("hdiutil", ["verify", dmg], true);
  const notary = spawnSync("xcrun", ["stapler", "validate", dmg], { encoding: "utf8", stdio: "pipe" });
  const notarized = notary.status === 0;
  if (requireNotarized) {
    if (!notarized || !signature.includes("Authority=Developer ID Application:")) throw new Error("Developer ID signature and stapled notarization ticket are required.");
    command("xcrun", ["stapler", "validate", app], true);
    command("spctl", ["--assess", "--type", "execute", "--verbose", app], true);
  }
  const minimumMacOS = command("plutil", ["-extract", "LSMinimumSystemVersion", "raw", "-o", "-", path.join(app, "Contents/Info.plist")], true).trim();
  const runtimeMinimum = command("plutil", ["-extract", "LSMinimumSystemVersion", "raw", "-o", "-", "node_modules/electron/dist/Electron.app/Contents/Info.plist"], true).trim();
  const versionNumber = value => value.split(".").reduce((total, part, index) => total + Number(part) / (100 ** index), 0);
  if (versionNumber(minimumMacOS) < versionNumber(runtimeMinimum)) throw new Error("App declares an older macOS version than its Electron runtime supports.");
  const bytes = await readFile(dmg); const sha256 = createHash("sha256").update(bytes).digest("hex");
  await writeFile(dmg + ".sha256", `${sha256}  ${filename}\n`);
  const commit = command("git", ["rev-parse", "HEAD"], true).trim();
  const dirty = command("git", ["status", "--porcelain"], true).trim().length > 0;
  const report = { version, checkedAt: new Date().toISOString(), sourceCommit: commit, sourceDirty: dirty, architecture: "arm64", minimumMacOS, bytes: bytes.length, sha256, secretScanPassed: true, signatureValid: true, signing: signature.includes("Signature=adhoc") ? "ad-hoc" : "Developer ID", notarized, releaseClass: notarized ? "notarized-distribution" : "private-local-use", dmgVerified: true };
  await writeFile("outputs/desktop-build/release-manifest.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await rm(extracted, { recursive: true, force: true }); }
