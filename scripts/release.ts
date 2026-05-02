import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
}

const PACKAGES = ["packages/core", "packages/hook", "packages/cli"];

async function main(): Promise<void> {
  step("Typecheck all workspaces");
  run("npm run typecheck");

  step("Build all packages");
  run("npm run build");

  step("Run unit tests");
  run("npm run test --workspaces --if-present");

  step("Verify hook bundle exists");
  const hookBundle = resolve(REPO, "packages/hook/dist/pretool.js");
  await readFile(hookBundle);

  step("Verify CLI bundle exists");
  const cliBundle = resolve(REPO, "packages/cli/dist/bin.js");
  await readFile(cliBundle);

  step("Print versions");
  for (const pkg of PACKAGES) {
    const raw = await readFile(resolve(REPO, pkg, "package.json"), "utf8");
    const json = JSON.parse(raw) as PackageJson;
    console.log(`  ${json.name.padEnd(24)} ${json.version}`);
  }

  step("Dry-run npm publish (no --access yet)");
  for (const pkg of PACKAGES) {
    run(`npm publish --dry-run`, resolve(REPO, pkg));
  }

  console.log(
    "\n✓ Release readiness check passed.\nTo publish for real:\n  cd packages/core && npm publish --access public\n  cd packages/hook && npm publish --access public\n  cd packages/cli  && npm publish --access public",
  );
}

function step(msg: string): void {
  console.log(`\n• ${msg}`);
}

function run(cmd: string, cwd: string = REPO): void {
  execSync(cmd, { cwd, stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
