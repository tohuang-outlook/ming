import { mkdir, open, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/** Replace only after a complete, flushed write; never reuse a predictable temp file. */
export async function atomicWrite(filename: string, contents: string | Buffer) {
  const directory = path.dirname(filename);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `.${path.basename(filename)}.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(contents);
    await handle.sync();
    await handle.close();
    await rename(temporary, filename);
  } finally {
    await handle.close().catch(() => {});
    await rm(temporary, { force: true });
  }
}
