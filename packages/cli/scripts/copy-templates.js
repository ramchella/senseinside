import { cp, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");
const REPO_ROOT = resolve(PKG_ROOT, "..", "..");

async function main() {
  const src = join(REPO_ROOT, "templates");
  const dst = join(PKG_ROOT, "dist", "templates");
  await mkdir(dst, { recursive: true });
  await cp(src, dst, { recursive: true });
  console.log(`copied templates -> ${dst}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
