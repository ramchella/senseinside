import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";

export async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

export async function copyDirectory(src: string, dst: string): Promise<void> {
  await mkdir(dst, { recursive: true });
  await cp(src, dst, { recursive: true, force: false, errorOnExist: false });
}

export async function readJson<T>(path: string): Promise<T | null> {
  if (!(await pathExists(path))) return null;
  const raw = await readFile(path, "utf8");
  if (!raw.trim()) return null;
  return JSON.parse(raw) as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
