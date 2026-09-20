// Opt-in Developer ID release. Credentials stay in the macOS Keychain.
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
function run(command, args, capture = false) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed; the notarized release is not complete.`);
  return result.stdout;
}
try {
  if (process.platform !== "darwin") throw new Error("A macOS signing host is required.");
  const identity = process.env.MINGLI_SIGN_IDENTITY;
  const profile = process.env.APPLE_KEYCHAIN_PROFILE;
  if (!identity?.startsWith("Developer ID Application:") || !profile)
    throw new Error("Missing MINGLI_SIGN_IDENTITY (Developer ID Application identity) or APPLE_KEYCHAIN_PROFILE (existing notarytool Keychain profile). No fallback to ad-hoc signing is allowed.");
  const identities = run("security", ["find-identity", "-v", "-p", "codesigning"], true);
  if (!identities.includes(`"${identity}"`)) throw new Error("The requested valid Developer ID identity and private key were not found in Keychain.");
  run("xcrun", ["notarytool", "history", "--keychain-profile", profile, "--output-format", "json"], true);
  if (process.argv.includes("--check")) { console.log("Developer ID and notarization credentials are available."); }
  else {
    run(process.execPath, ["scripts/build-desktop.mjs"]);
    // electron-builder notarizes and staples the signed .app before building the DMG.
    run("node_modules/.bin/electron-builder", ["--config", "desktop/electron-builder.yml", "--mac", "dmg", "--arm64", "--config.forceCodeSigning=true", `--config.mac.identity=${identity}`, "--config.mac.notarize=true", "--config.dmg.sign=true"]);
    const { version } = JSON.parse(await readFile("work/desktop-app/package.json", "utf8"));
    const dmg = `outputs/desktop-build/Zhonghua-Mingli-AI-${version}-arm64.dmg`;
    const app = "outputs/desktop-build/mac-arm64/中華命理 AI.app";
    run("xcrun", ["stapler", "validate", app]);
    const result = JSON.parse(run("xcrun", ["notarytool", "submit", dmg, "--keychain-profile", profile, "--wait", "--output-format", "json"], true));
    if (result.status !== "Accepted") throw new Error("Apple did not accept the DMG. It must not be published as notarized.");
    run("xcrun", ["stapler", "staple", dmg]);
    run(process.execPath, ["scripts/verify-desktop.mjs", "--require-notarized"]);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
