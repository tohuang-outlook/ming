import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { stripBuildEnvironment, verifyArtifactSecrets } from "./release-security.mjs";
// Wrangler resolves OpenNext's absolute WASM/binary references into portable modules.
// OpenNext compiles local .env files into this module by default. All runtime
// configuration must instead come from hosting bindings, never the archive.
await stripBuildEnvironment(".open-next/cloudflare/next-env.mjs");
await rm("dist", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "deploy", "--dry-run", "--outdir", "dist/server"], { stdio: "inherit" });
await rm("dist/server/worker.js.map", { force: true });
await writeFile("dist/server/index.js", 'export { default } from "./worker.js";\n');
await cp(".open-next/assets", "dist/client", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/.openai/drizzle", { recursive: true });
await verifyArtifactSecrets("dist");
