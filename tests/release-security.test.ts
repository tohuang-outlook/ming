import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { stripBuildEnvironment, verifyArtifactSecrets } from "../scripts/release-security.mjs";

it("release strips all compiled env values and rejects leaked local secrets", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mingli-release-test-"));
  try {
    const output = path.join(root, "dist");
    await mkdir(output);
    await writeFile(path.join(root, ".env"), "DEEPSEEK_API_KEY=test-only-private-key-123456\n");
    const compiled = path.join(output, "next-env.mjs");
    await writeFile(compiled, 'export const production = {DEEPSEEK_API_KEY:"test-only-private-key-123456"};');
    await expect(verifyArtifactSecrets(output, root)).rejects.toThrow("Release blocked");
    await stripBuildEnvironment(compiled);
    expect(await readFile(compiled, "utf8")).not.toContain("test-only-private-key");
    await expect(verifyArtifactSecrets(output, root)).resolves.toBeUndefined();
    await writeFile(path.join(output, ".env"), "OTHER=value");
    await expect(verifyArtifactSecrets(output, root)).rejects.toThrow("environment file");
  } finally { await rm(root, { recursive: true, force: true }); }
});
