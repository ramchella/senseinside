import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, posix, relative, sep } from "node:path";
import matter from "gray-matter";
import type { BrainContext, BrainSection, TrustTier } from "../sensecheck/schema.js";

export interface BrainReaderOptions {
  userVaultPath?: string;
  projectVaultPath?: string;
}

interface CacheEntry {
  context: BrainContext;
  hash: string;
  signature: string;
}

const cache = new Map<string, CacheEntry>();

const TIER_BY_FOLDER: Record<string, TrustTier> = {
  identity: "T0",
  governor: "T1",
  memory: "T2",
  feedback: "T2",
  inbox: "T3",
  research: "T3",
};

export async function loadBrainContext(
  options: BrainReaderOptions = {},
): Promise<{ context: BrainContext; hash: string }> {
  const userVault = options.userVaultPath ?? defaultUserVault();
  const projectVault = options.projectVaultPath ?? defaultProjectVault();

  const signature = await directorySignature([userVault, projectVault]);
  const cacheKey = `${userVault}::${projectVault}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.signature === signature) {
    return { context: cached.context, hash: cached.hash };
  }

  const userSections = await readVault(userVault, "user");
  const projectSections = await readVault(projectVault, "project");
  const merged = mergeWithProjectPrecedence(userSections, projectSections);

  const trusted = merged.filter((s) => s.trustTier !== "T3");

  const context: BrainContext = {
    identity: trusted.filter((s) => s.trustTier === "T0"),
    governor: trusted.filter((s) => s.trustTier === "T1"),
    memory: trusted.filter((s) => s.trustTier === "T2" && s.path.includes("/memory/")),
    feedback: trusted.filter((s) => s.trustTier === "T2" && s.path.includes("/feedback/")),
  };

  const hash = hashContext(context);
  cache.set(cacheKey, { context, hash, signature });
  return { context, hash };
}

export function defaultUserVault(): string {
  return join(homedir(), ".senseinside", "private-brain");
}

export function defaultProjectVault(): string {
  return join(process.cwd(), ".senseinside", "private-brain");
}

async function readVault(
  vaultPath: string,
  origin: "user" | "project",
): Promise<Array<BrainSection & { origin: "user" | "project" }>> {
  if (!(await pathExists(vaultPath))) return [];
  const files = await walkMarkdown(vaultPath);
  const sections: Array<BrainSection & { origin: "user" | "project" }> = [];

  for (const absPath of files) {
    try {
      const raw = await readFile(absPath, "utf8");
      const { data, content } = matter(raw);
      const stats = await stat(absPath);

      const relPath = "/" + relative(vaultPath, absPath).split(sep).join(posix.sep);
      const tier = resolveTier(relPath, data);
      if (!tier) continue;

      sections.push({
        path: relPath,
        trustTier: tier,
        content: content,
        lastModified: stats.mtime.toISOString(),
        origin,
      });
    } catch (err) {
      logWarn(`brain-reader: skipped ${absPath} (${(err as Error).message})`);
    }
  }
  return sections;
}

function resolveTier(relPath: string, frontmatter: Record<string, unknown>): TrustTier | null {
  const folder = relPath.split("/").filter(Boolean)[0]?.toLowerCase();
  const folderTier = folder ? TIER_BY_FOLDER[folder] : undefined;

  const fmTierRaw = frontmatter.tier;
  const fmTier =
    typeof fmTierRaw === "number"
      ? (`T${fmTierRaw}` as TrustTier)
      : typeof fmTierRaw === "string" && /^T?[0-3]$/.test(fmTierRaw)
        ? ((fmTierRaw.startsWith("T") ? fmTierRaw : `T${fmTierRaw}`) as TrustTier)
        : undefined;

  if (folderTier && fmTier && folderTier !== fmTier) {
    logWarn(
      `brain-reader: ${relPath} frontmatter tier ${fmTier} disagrees with folder tier ${folderTier}; using folder tier (defense in depth).`,
    );
    return folderTier;
  }
  return folderTier ?? fmTier ?? null;
}

function mergeWithProjectPrecedence(
  userSections: Array<BrainSection & { origin: "user" | "project" }>,
  projectSections: Array<BrainSection & { origin: "user" | "project" }>,
): BrainSection[] {
  const byPath = new Map<string, BrainSection>();
  for (const s of userSections) byPath.set(s.path, stripOrigin(s));
  for (const s of projectSections) byPath.set(s.path, stripOrigin(s));
  return [...byPath.values()];
}

function stripOrigin(s: BrainSection & { origin: unknown }): BrainSection {
  return {
    path: s.path,
    trustTier: s.trustTier,
    content: s.content,
    lastModified: s.lastModified,
  };
}

async function walkMarkdown(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: Awaited<ReturnType<typeof readdir>>;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "logs" || entry.name.startsWith(".")) continue;
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function directorySignature(roots: string[]): Promise<string> {
  const h = createHash("sha256");
  for (const root of roots) {
    if (!(await pathExists(root))) {
      h.update(`${root}::missing\n`);
      continue;
    }
    const files = await walkMarkdown(root);
    files.sort();
    for (const f of files) {
      const s = await stat(f);
      h.update(`${f}::${s.mtimeMs}::${s.size}\n`);
    }
  }
  return h.digest("hex");
}

export function hashContext(context: BrainContext): string {
  const stable = JSON.stringify(context, (_, v) =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? Object.keys(v)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = (v as Record<string, unknown>)[k];
            return acc;
          }, {})
      : v,
  );
  return createHash("sha256").update(stable).digest("hex");
}

function logWarn(msg: string): void {
  if (process.env.SENSEINSIDE_DEBUG) console.warn(`[senseinside] ${msg}`);
}
