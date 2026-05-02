import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadBrainContext } from "../../privatebrain/index.js";
import { runSenseCheck } from "../index.js";
import { ProposedActionSchema } from "../schema.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "fixtures", "founder-brain");
const CASES_PATH = join(HERE, "cases.json");

const CaseSchema = z.object({
  name: z.string(),
  action: z.object({
    toolName: z.string(),
    toolInput: z.record(z.unknown()),
  }),
  expected: z.object({
    decision: z.string().optional(),
    decisionIn: z.array(z.string()).optional(),
    citedSourcesIncludes: z.string().optional(),
  }),
});
type EvalCase = z.infer<typeof CaseSchema>;

async function main(): Promise<void> {
  const raw = await readFile(CASES_PATH, "utf8");
  const cases = z.array(CaseSchema).parse(JSON.parse(raw));

  const brain = await loadBrainContext({
    userVaultPath: FIXTURE,
    projectVaultPath: "/__nonexistent__",
  });

  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const c of cases) {
    const action = ProposedActionSchema.parse({
      toolName: c.action.toolName,
      toolInput: c.action.toolInput,
      hookEventName: "PreToolUse",
      actionSignature: signature(c),
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await runSenseCheck(action, "observe", { brainOverride: brain });
      const ok = matches(result.decision, c.expected);
      if (ok) {
        pass++;
        console.log(
          `PASS  ${c.name}  -> ${result.decision.decision}  (cost $${result.costUsd.toFixed(4)})`,
        );
      } else {
        fail++;
        failures.push(
          `FAIL  ${c.name}  expected ${describe(c.expected)} got ${result.decision.decision} | ${result.decision.reasoning}`,
        );
        console.log(failures[failures.length - 1]);
      }
    } catch (err) {
      fail++;
      failures.push(`ERROR ${c.name}: ${(err as Error).message}`);
      console.log(failures[failures.length - 1]);
    }
  }

  console.log(`\n${pass}/${cases.length} passed`);
  if (pass < 9) {
    console.error("Eval gate: at least 9/10 must pass before plumbing is wired.");
    process.exit(1);
  }
}

function matches(
  decision: { decision: string; citedSources: string[] },
  expected: EvalCase["expected"],
): boolean {
  if (expected.decision && decision.decision !== expected.decision) return false;
  if (expected.decisionIn && !expected.decisionIn.includes(decision.decision)) return false;
  if (
    expected.citedSourcesIncludes &&
    !decision.citedSources.some((s) => s.includes(expected.citedSourcesIncludes!))
  )
    return false;
  return true;
}

function describe(e: EvalCase["expected"]): string {
  if (e.decision) return e.decision;
  if (e.decisionIn) return `one of ${e.decisionIn.join("|")}`;
  return "?";
}

function signature(c: EvalCase): string {
  return createHash("sha256")
    .update(`${c.action.toolName}|${JSON.stringify(c.action.toolInput)}`)
    .digest("hex");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
