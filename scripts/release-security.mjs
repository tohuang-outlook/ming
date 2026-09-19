import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

export async function stripBuildEnvironment(filename) {
  await writeFile(filename, "export const production = {};\nexport const development = {};\nexport const test = {};\n");
}

export async function verifyArtifactSecrets(directory, root = process.cwd()) {
  const secrets = new Set();
  const collect = (env) => {
    for (const [key, value] of Object.entries(env)) {
      if (/(?:KEY|TOKEN|SECRET|PASSWORD)/i.test(key) && value && value.length >= 12)
        secrets.add(value);
    }
  };
  collect(process.env);
  for (const name of await readdir(root)) {
    if ((name === ".env" || name.startsWith(".env.") || name === ".dev.vars") && !name.endsWith(".example")) {
      collect(parseEnv(await readFile(path.join(root, name), "utf8")));
    }
  }
  async function scan(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Release contains an unsupported symbolic link.");
      if (entry.isDirectory()) { await scan(filename); continue; }
      if (entry.name === ".env" || entry.name.startsWith(".env.") || entry.name.startsWith(".dev.vars"))
        throw new Error("Release contains an environment file.");
      const data = await readFile(filename);
      for (const secret of secrets) {
        if (data.includes(Buffer.from(secret))) throw new Error("Release blocked: a local secret was found in build output. No secret value has been logged.");
      }
    }
  }
  await scan(directory);
}
