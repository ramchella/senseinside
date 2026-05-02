import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { type ActionLogEntry, ActionLogEntrySchema } from "@senseinside/core/schema";
import { pathExists } from "../util/fs.js";

export interface ReportOptions {
  days?: number;
}

export async function reportCommand(opts: ReportOptions = {}): Promise<void> {
  const days = opts.days ?? 7;
  const path = join(homedir(), ".senseinside", "private-brain", "logs", "action-log.jsonl");
  if (!(await pathExists(path))) {
    console.log(chalk.gray("No action log yet. Trigger any Claude Code tool call to begin populating."));
    return;
  }

  const raw = await readFile(path, "utf8");
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries: ActionLogEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = ActionLogEntrySchema.parse(JSON.parse(line));
      if (Date.parse(parsed.timestamp) >= cutoff) entries.push(parsed);
    } catch {
      // skip malformed line
    }
  }

  if (entries.length === 0) {
    console.log(chalk.gray(`No entries in the last ${days} days.`));
    return;
  }

  const totalCost = entries.reduce((s, e) => s + e.costUsd, 0);
  const totalTokensIn = entries.reduce((s, e) => s + e.tokensIn, 0);
  const totalTokensOut = entries.reduce((s, e) => s + e.tokensOut, 0);
  const avgLatency = Math.round(entries.reduce((s, e) => s + e.latencyMs, 0) / entries.length);

  const byDecision = countBy(entries, (e) => e.decision);
  const byRisk = countBy(entries, (e) => e.riskLevel);
  const byTool = countBy(entries, (e) => e.toolName);

  console.log(chalk.bold.cyan(`\nSenseInside — last ${days} days`));
  console.log(chalk.gray(`${entries.length} actions observed`));
  console.log("");
  console.log(chalk.bold("Decision breakdown"));
  for (const [k, v] of decisionOrder(byDecision)) {
    console.log(`  ${decisionColor(k)(k.padEnd(22))} ${v}`);
  }
  console.log("");
  console.log(chalk.bold("Risk level"));
  for (const [k, v] of riskOrder(byRisk)) {
    console.log(`  ${riskColor(k)(k.padEnd(10))} ${v}`);
  }
  console.log("");
  console.log(chalk.bold("Top tools"));
  for (const [k, v] of byTool.slice(0, 10)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
  console.log("");
  console.log(chalk.bold("Cost & performance"));
  console.log(`  Total cost:        $${totalCost.toFixed(4)}`);
  console.log(`  Tokens in/out:     ${totalTokensIn.toLocaleString()} / ${totalTokensOut.toLocaleString()}`);
  console.log(`  Avg latency:       ${avgLatency}ms`);
  console.log("");

  const flagged = entries.filter((e) => e.decision !== "ALLOW").slice(-5).reverse();
  if (flagged.length > 0) {
    console.log(chalk.bold("Most recent non-ALLOW decisions"));
    for (const e of flagged) {
      const when = new Date(e.timestamp).toISOString().slice(0, 16).replace("T", " ");
      console.log(
        `  ${chalk.gray(when)}  ${decisionColor(e.decision)(e.decision)}  ${e.toolName}  — ${truncate(e.reasoning, 100)}`,
      );
      if (e.citedSources.length > 0) {
        console.log(`    ${chalk.gray("cited:")} ${e.citedSources.join(", ")}`);
      }
    }
  }
}

function countBy<T>(items: T[], keyFn: (t: T) => string): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const i of items) {
    const k = keyFn(i);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const DECISION_RANK: Record<string, number> = {
  ALLOW: 0,
  ALLOW_WITH_WARNING: 1,
  REWRITE_ACTION: 2,
  REQUIRE_APPROVAL: 3,
  BLOCK: 4,
};
function decisionOrder(pairs: Array<[string, number]>): Array<[string, number]> {
  return [...pairs].sort((a, b) => (DECISION_RANK[a[0]] ?? 99) - (DECISION_RANK[b[0]] ?? 99));
}

const RISK_RANK: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
function riskOrder(pairs: Array<[string, number]>): Array<[string, number]> {
  return [...pairs].sort((a, b) => (RISK_RANK[a[0]] ?? 99) - (RISK_RANK[b[0]] ?? 99));
}

function decisionColor(k: string): (s: string) => string {
  switch (k) {
    case "ALLOW":
      return chalk.green;
    case "ALLOW_WITH_WARNING":
      return chalk.yellow;
    case "REWRITE_ACTION":
      return chalk.blue;
    case "REQUIRE_APPROVAL":
      return chalk.magenta;
    case "BLOCK":
      return chalk.red;
    default:
      return (s) => s;
  }
}

function riskColor(k: string): (s: string) => string {
  switch (k) {
    case "LOW":
      return chalk.green;
    case "MEDIUM":
      return chalk.yellow;
    case "HIGH":
      return chalk.magenta;
    case "CRITICAL":
      return chalk.red;
    default:
      return (s) => s;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
