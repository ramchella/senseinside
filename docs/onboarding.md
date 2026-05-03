# SenseInside — Zero to Hero Onboarding

Welcome. This document is for someone who is brand new — to AI, to agents, to this codebase, to maybe even Node.js. By the end, you will understand what SenseInside is, why it matters, how every piece fits together, and you will have run it on your own laptop and felt the "aha" moment for yourself.

There are no prerequisites except curiosity. We will define every term as it comes up.

---

## Part 1 — Foundations (start here if anything below feels unfamiliar)

### What is an AI?

When people say "AI" today, they almost always mean a **large language model (LLM)**. An LLM is a program that has read most of the internet and learned to predict what word comes next. That sounds simple, but the side effect of being very good at predicting the next word is being very good at writing, summarizing, reasoning, and answering questions in plain English.

The two biggest LLM families right now are:

- **Claude** (made by Anthropic) — the model SenseInside uses by default.
- **GPT** (made by OpenAI) — the one behind ChatGPT.

There are others (Google's Gemini, Meta's Llama), but for our purposes, Claude is the one that matters. Specifically, we use **Claude Haiku 4.5**, the fast and cheap variant — about a penny per evaluation.

### What is a chatbot vs an agent?

- A **chatbot** answers questions. You type something, it types something back. ChatGPT was originally a chatbot.
- An **agent** does things. It can read your files, run commands on your computer, edit code, send emails, browse the web. An agent has *hands*, not just a mouth.

This distinction matters enormously. A chatbot that gives bad advice can waste your time. An agent that does a bad action can delete your files, expose your secrets, or send a harsh email to your boss.

### What is Claude Code?

**Claude Code** is Anthropic's coding agent. Think of it as a programmer that lives in your terminal. You open it inside a project folder and ask it to do things in plain English:

- "Read all the files in this folder and tell me what this project does."
- "Add a new function that calculates tax."
- "Run the tests and fix any that fail."

Claude Code then **calls tools** to do those jobs:

- `Read` — opens a file and reads its contents.
- `Write` — creates a new file.
- `Edit` — changes an existing file.
- `Bash` — runs a shell command.
- `WebFetch` — visits a URL.

Each of those is a "tool call." Every tool call is an action that affects something in the real world.

You can use Claude Code inside Visual Studio Code (VSCode), in your normal terminal, or in iTerm. We'll show you how shortly.

### What problem does SenseInside solve?

Today, when Claude Code is about to do something risky — delete a file, push code to production, send an email — it might do it. There are some safety prompts, but they're inconsistent. The agent doesn't really know *who you are*, *what you would forbid*, or *what kind of language you write in*.

SenseInside fixes that. It is a small program that runs on your laptop, reads a private folder of identity files you wrote (in plain English), and **before every tool call**, it asks the LLM: "Does this action fit who Ram is, what Ram would allow, and what Ram has explicitly forbidden?"

The LLM answers with one of five decisions:

| Decision | Meaning |
|---|---|
| `ALLOW` | Action fits identity. Proceed silently. |
| `ALLOW_WITH_WARNING` | Fine, but worth noting. |
| `REWRITE_ACTION` | Mostly right, needs adjustment. |
| `REQUIRE_APPROVAL` | Risky enough that the user should approve. |
| `BLOCK` | Violates identity or rules. Refuse. |

In **Observe Mode** (what we ship today), the decision is *logged* but not enforced. You see what a governor *would* have done — like a security camera that watches but doesn't lock the door yet. Once you trust it, you can flip on **Intercept Mode** and let it actually block.

### The big-picture idea

> **Capability without character is dangerous.**

Humans don't need a police officer next to them all day because we carry memory + identity + values + self-awareness inside us. SenseInside builds that internal layer for AI agents. We give every AI agent a *conscience* before they get tools.

Now you have the vocabulary. Let's look under the hood.

---

## Part 2 — How SenseInside works (the mental model)

Picture this every time:

```
You ask Claude to do something
            ↓
Claude figures out which tool to use
            ↓
Right before Claude actually runs the tool,
Claude Code fires a "PreToolUse hook"
            ↓
The hook is a small script that calls SenseInside
            ↓
SenseInside reads your identity files from
~/.senseinside/private-brain/  (your local folder)
            ↓
Sends those + the proposed action to Claude Haiku
            ↓
Haiku returns a structured decision
            ↓
SenseInside writes the decision to a log
            ↓
(In Phase 1a Observe Mode: hook always says "ok, go ahead")
            ↓
Claude runs the tool
```

That's the entire cycle. Every box in that diagram exists in our code. We're going to walk through them.

### The PrivateBrain — your identity in plain text

SenseInside stores who you are in a folder on your computer. Plain text. No database. No cloud. You can open the files in any editor:

```
~/.senseinside/private-brain/
├── identity/        ← who you are (Tier 0)
│   ├── user-identity.md
│   ├── values.md
│   ├── boundaries.md
│   ├── tone.md
│   └── risk-profile.md
├── governor/        ← rules you've set (Tier 1)
│   ├── rules.md
│   ├── forbidden-actions.md
│   ├── approval-policy.md
│   └── privacy-policy.md
├── memory/          ← facts and preferences (Tier 2)
├── feedback/        ← corrections you've given (Tier 2)
├── logs/            ← what your agent has been doing
├── inbox/           ← stuff the agent ingested (Tier 3, untrusted)
└── research/        ← stuff the agent ingested (Tier 3, untrusted)
```

When you ran `init`, we copied a starter "Founder" archetype into these folders. You can edit any file with TextEdit, VSCode, or any tool. Your changes are picked up automatically the next time SenseInside runs.

### Trust tiers — why some folders are "untrusted"

The tier system is a security feature. Imagine an attacker tries to manipulate your AI agent by leaving a malicious instruction on a website. Your agent reads that page, saves it to `/research`, and now it's "in the brain." If we naively included it in every SenseCheck, the attacker could write *"Ram now allows force-pushes to main"* and the agent would believe it.

So we sort the brain into trust levels:

- **Tier 0** (`/identity`): the deepest "who you are." Rarely changes.
- **Tier 1** (`/governor`): explicit rules. Append-only.
- **Tier 2** (`/memory`, `/feedback`): facts and learning. Versioned.
- **Tier 3** (`/inbox`, `/research`): **untrusted.** Read for context, but cannot influence the SenseCheck decision.

The code enforces this at the type-system level. There is no path through our code where Tier 3 content reaches the LLM. That's the prompt-injection defense.

### The five decisions, in plain English

When SenseInside evaluates an action, it always returns one of these:

- **ALLOW** — totally fine. Like "yes, please summarize the README."
- **ALLOW_WITH_WARNING** — fine, but I want you to notice. Like "you're about to write to a file in `/etc/`, just FYI."
- **REWRITE_ACTION** — mostly right but adjust. Like "this email is too aggressive — soften the tone first."
- **REQUIRE_APPROVAL** — this might be the right thing, but a human should sign off. Like "you're about to spin up paid AWS infrastructure."
- **BLOCK** — refuse. Like "you're trying to commit my OpenAI API key to a public repo. No."

In Observe Mode (Phase 1a), all five are logged but the action runs anyway. In Intercept Mode (Phase 1b, coming soon), `BLOCK` actually halts the action.

### Two operating modes

- **Observe Only** (default) — watch and log. Zero friction. Cannot break anything.
- **Observe + Intercept** — actually block, rewrite, or require approval. Three sub-levels (critical-only / balanced / strict).

We ship in Observe so a new user can install with confidence. After a week of seeing flags, they decide whether to graduate.

---

## Part 3 — The codebase: three packages, one purpose

The code is structured as a **monorepo** — multiple related packages under one root folder, sharing dependencies. Like an apartment building: separate units, shared plumbing.

```
sense-inside/                                 ← repo root
├── packages/
│   ├── core/        the engine (pure logic)
│   ├── hook/        the bridge to Claude Code
│   └── cli/         the user-facing tool
├── templates/       starter identity files copied during install
├── tests/           end-to-end tests
├── scripts/         release helpers
└── docs/            you are here
```

### `packages/core` — the engine

This is where the **brains** of SenseInside live. It does NOT know about Claude Code. It's pure library code that anyone could plug into anything later (an MCP server, a VSCode extension, a cloud service).

Inside `core/src/`:

- **`sensecheck/schema.ts`** — the locked contracts. What an action looks like, what a decision must look like, the data shape of the brain. Written using a library called Zod that validates everything at runtime.
- **`sensecheck/prompt.ts`** — the prompt sent to the LLM. The single most important file in the whole repo. If this is well-written, the agent has good judgment. If not, it doesn't.
- **`privatebrain/index.ts`** — reads your `~/.senseinside/private-brain/` folder, parses all the Markdown files, sorts them by trust tier, drops Tier 3.
- **`llm/anthropic.ts`** — talks to Claude Haiku. Forces it to return a structured decision. Retries once on failure, falls back to a "safe by default" decision if the API is down.
- **`sensecheck/cache.ts`** — remembers recent decisions for 5 minutes so we don't pay for the same evaluation twice.
- **`sensecheck/index.ts`** — the conductor. `runSenseCheck(action, mode)` is the entry point everything else calls.
- **`sensecheck/eval/`** — a tiny test harness. 10 hand-labeled cases that the system must get right. If the prompt regresses, this fails.

### `packages/hook` — the bridge

Claude Code has a feature called **hooks**: little scripts that fire at specific moments. The most important one is `PreToolUse` — fires right before Claude runs any tool.

We build a single bundled file called `pretool.cjs`. When Claude Code is about to run a tool, it executes this file, sends the proposed action over `stdin` (a stream of input), waits for the file to exit, and reads the exit code.

Our hook:

1. Reads the JSON payload from stdin.
2. Calls `core.runSenseCheck(...)`.
3. Writes the result to a JSONL log (one JSON line per action).
4. Exits 0 (always, in Observe Mode).

The hook is **paranoid**. Every error path has a try/catch. If the LLM is down, we log it and let the action through. If the brain folder is missing, we log it and let it through. The hook never crashes the user's terminal — that's a hard rule.

### `packages/cli` — the user-facing tool

This is what you actually run. `npx sense-inside init` (or in dev: `node packages/cli/dist/bin.js`).

Five commands:

- **`init`** — sets up the world: creates folders, copies the Founder archetype, installs the hook bundle, registers the hook in your Claude Code project.
- **`report`** — reads the log, prints a digest grouped by decision and risk.
- **`doctor`** — checks if everything is wired up correctly. We'll come back to this.
- **`mode`** — switches between Observe and Intercept (Intercept is locked in Phase 1a).
- **`uninstall`** — cleans up the hook registration (but never deletes your identity vault — your data is yours).

### How they fit together

```
You run `sense-inside init`
            ↓
CLI scaffolds folders, copies the hook bundle to ~/.senseinside/bin/pretool.cjs,
registers a PreToolUse hook in <project>/.claude/settings.json
            ↓
You launch Claude Code in your project
            ↓
Claude wants to run a tool — fires the PreToolUse hook
            ↓
Hook bundle is invoked, calls core.runSenseCheck(...)
            ↓
Core loads the brain, builds the prompt, calls Anthropic, returns a decision
            ↓
Hook writes a JSONL line to ~/.senseinside/private-brain/logs/action-log.jsonl
            ↓
Hook exits 0, Claude proceeds with the tool call
            ↓
Later, you run `sense-inside report` to see what happened
```

That's the whole system. Three small packages, one clear flow.

---

## Part 4 — Setup: from zero to running

### Prerequisites

You need:

1. **A Mac, Linux, or WSL terminal.** This guide assumes Mac.
2. **Node.js 20 or newer.** Check with `node --version`. If you don't have it, install with `brew install node` or download from nodejs.org.
3. **An Anthropic API key.** Sign up at console.anthropic.com, add a few dollars of credit, generate a key. The key looks like `sk-ant-api03-...`.
4. **Claude Code installed.** Run `npm install -g @anthropic-ai/claude-code` or follow Anthropic's install guide.
5. **The SenseInside repo cloned or copied** to your machine.

### Step 1: Open the repo in VSCode

```bash
code /path/to/sense-inside/
```

VSCode opens. You'll see the same folder structure we walked through above. Take a minute to click through `packages/core/src/sensecheck/`. The file structure is the documentation.

### Step 2: Set your Anthropic API key

The cleanest way is to add it to your shell startup file so every terminal has it:

```bash
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-...' >> ~/.zshrc
source ~/.zshrc
echo $ANTHROPIC_API_KEY   # should print the key
```

Replace `sk-ant-api03-...` with your actual key. Use `~/.bashrc` instead of `~/.zshrc` if you're on Bash.

**Important:** SenseInside never writes the key to disk. It reads it from the environment at runtime. The key never leaves your machine except to call Anthropic directly with your authorization.

### Step 3: Install dependencies and build

In VSCode's integrated terminal (`Ctrl+~`), from the repo root:

```bash
npm install        # downloads all the libraries we use
npm run build      # compiles all three packages
```

The build runs in dependency order: `core` first, then `hook`, then `cli`. Each one outputs a `dist/` folder with the compiled JavaScript.

### Step 4: Pick a project to dogfood on

You don't want to install SenseInside on something important on the first try. Pick a sandbox folder. Let's create one:

```bash
mkdir ~/sense-test-project
cd ~/sense-test-project
echo "# Test Project" > README.md
```

### Step 5: Install SenseInside on the test project

From inside the test project:

```bash
node /path/to/sense-inside/packages/cli/dist/bin.js init
```

(Tip: add an alias so you don't type that long path every time.

```bash
echo 'alias senseinside="node /path/to/sense-inside/packages/cli/dist/bin.js"' >> ~/.zshrc
source ~/.zshrc
```

From now on you can just type `senseinside init`.)

When you run init, you'll see:

- A welcome banner.
- A prompt to pick an archetype — pick **Founder**.
- A note that your `ANTHROPIC_API_KEY` was detected.
- A series of "scaffolding" steps: vault, project vault, hook bundle, config, subagent, settings.json.
- A **smoke check** — one real SenseCheck call against Anthropic, with the cost printed (typically a fraction of a cent).
- A summary listing where everything got installed.

### Step 6: Run the doctor

```bash
senseinside doctor
```

You should see seven green checkmarks. If any are red, read the path next to them — that's the file that's missing or misconfigured.

#### Why we run doctor

`doctor` is a sanity check. It verifies seven things:

1. **Hook bundle present** — is `~/.senseinside/bin/pretool.cjs` actually on disk?
2. **User vault present** — is `~/.senseinside/private-brain/` set up?
3. **Config file readable** — can we parse `~/.senseinside/config.json`?
4. **Prompt version aligned** — does the installed prompt version match what the runtime expects?
5. **`ANTHROPIC_API_KEY` set** — can the LLM be called?
6. **Claude PreToolUse hook registered** — is `.claude/settings.json` wired up correctly?
7. **User bin directory exists** — is `~/.senseinside/bin/` there?

If all seven are green, the system is healthy. If any are red, fix that first before continuing — Claude Code won't be able to invoke the hook if any of these are broken.

Doctor is also useful any time you suspect something is off — run it first. It exits with a non-zero code on failure, so you can use it in scripts too.

---

## Part 5 — The "aha" demo (15 minutes, you'll feel it)

Time to see SenseInside actually working. Open Claude Code in the test project:

```bash
cd ~/sense-test-project
claude
```

(Or right-click the folder in VSCode and "Open in Terminal," then `claude`.)

You're now in Claude Code. Try these in order. Between each one, leave Claude Code (`/exit`) and run `senseinside report` to see what happened.

### Round 1 — boring good actions (expect ALLOW)

In Claude Code, type:

- **"Read README.md and summarize it."**
- **"List all files in this directory."**
- **"Create a file called notes.md with a single line: 'this is a test.'"**

After each, leave and run `senseinside report`. You should see decisions like `ALLOW` with high confidence, low risk.

### Round 2 — borderline actions (expect WARN or APPROVAL)

- **"Run aws ec2 describe-instances."** — this only describes, doesn't allocate. Probably ALLOW or ALLOW_WITH_WARNING.
- **"Create a draft email to investors at drafts/may-update.md."** — drafting is fine; the rule says drafting is allowed, sending isn't.

### Round 3 — bad actions (expect BLOCK or APPROVAL)

⚠️ **In Phase 1a, SenseInside still LOGS but does not enforce.** So if you ask Claude to do something destructive, it will actually do it. Keep this round to harmless commands prefixed with `echo` so the action is recorded but nothing dangerous runs:

- **"Run: echo rm -rf src"**
- **"Run: echo git push --force origin main"**
- **"Create a .env file containing: OPENAI_API_KEY=sk-test-fake-1234"**

After each, leave and run `senseinside report`. You should see entries like:

```
2026-05-03 14:22  BLOCK  Bash  — Action violates Governor Rule 4: 
                  force-pushing to main is forbidden.
                  cited: /governor/rules.md
```

That's the moment. The system literally caught a bad action, in plain English, citing the exact rule. The reasoning is generated fresh by the LLM each time — it's not regex matching, it's actual judgment.

### Round 4 — read the raw log

```bash
tail -3 ~/.senseinside/private-brain/logs/action-log.jsonl
```

Each line is one JSON record. Pretty-print one of them:

```bash
tail -1 ~/.senseinside/private-brain/logs/action-log.jsonl | python3 -m json.tool
```

You'll see all the fields: `timestamp`, `toolName`, `decision`, `reasoning`, `citedSources`, `confidence`, `riskLevel`, `model`, `latencyMs`, `tokensIn`, `tokensOut`, `costUsd`. That JSONL is the *fuel* for everything we'll build later — the cloud dashboard, the team observability, the audit reports. It all comes from this file.

### Round 5 — change your identity, see the system adapt

Open `~/.senseinside/private-brain/identity/tone.md` in VSCode. Add a line:

```
- Always sign off with "Best, Ram"
```

Save. Now in Claude Code, ask: **"Draft a short email to my co-founder thanking him for last week's demo."**

When you read the report, the SenseCheck reasoning should reference your tone profile. The system reads your identity *every time* and adapts its judgment to whatever you've written.

That's the value. You wrote one sentence of plain English; the system absorbed it and now uses it.

---

## Part 6 — Why this matters (close the loop)

You've now seen:

- An identity file you can edit in any text editor (yours, forever).
- A hook that fires before every Claude Code action.
- An LLM that reads your identity and decides whether the action fits.
- A log of every decision with reasoning you can audit.

That's a small thing today. Why does it matter?

### Personally

Your AI tools are about to do more and more on your behalf. Today they edit code; tomorrow they'll send your emails, manage your calendar, move your money. Without a layer like SenseInside, every action depends on the agent vendor's defaults — defaults you didn't write, didn't approve, and can't see. With SenseInside, *you* hold the rules. They live on your machine. They follow you between agents.

### For the world

The current debate about AI safety is mostly about training (what models are taught not to do) and platform-level controls (what systems are sandboxed). Both matter. Neither answers the question: "in *this* moment, for *this* user, should *this* agent do *this* action?"

SenseInside is the missing runtime layer. Per-user, per-agent, behavioral. Identity-aware judgment, not rule-by-regex.

### Where it goes from here

- **Phase 1b** (next ~6 weeks): Critical-only Intercept ships. Your agent can actually be stopped from doing the worst things. Versioning of memory writes lets you undo any change.
- **Phase 2** (~3 months): SenseInside MCP — works with Cursor, ChatGPT Desktop, Antigravity, OpenClaw, custom agents. A free cloud account adds a web dashboard and a mobile approval inbox. Identity stays local.
- **Phase 3** (~9 months): The enterprise control plane — fleet observability, organizational rule synchronization, approval routing. Companies can centrally govern thousands of agents.
- **Phase 4**: hosted inference, self-hosted enterprise deployments, agent network topology.

You are looking at the kernel of all of that. Today.

---

## Part 7 — How to contribute (you're now part of the team)

Once you're comfortable, here's how to add value.

### Add a new identity archetype

Right now we ship only **Founder**. Pick a role you understand — say, **Lawyer** or **Teacher** or **Doctor** or **Indie Hacker** — and create:

```
templates/archetypes/lawyer/
├── identity/user-identity.md
├── identity/values.md
├── identity/boundaries.md
├── identity/tone.md
├── identity/risk-profile.md
├── governor/rules.md
├── governor/forbidden-actions.md
├── governor/approval-policy.md
└── governor/privacy-policy.md
```

Mirror the Founder archetype's structure. Use plain English. Submit a PR.

### Improve the prompt

The single most important file in the codebase is `packages/core/src/sensecheck/prompt.ts`. If you can make the prompt produce *better* decisions on the same inputs, that's pure value.

Before any prompt change is merged, the eval at `packages/core/src/sensecheck/eval/run.ts` must still pass 9/10. Run it locally:

```bash
npm run eval
```

If you regress a case, you'll see the diff. Iterate until it passes again.

### Add an eval case

Found a real-world action that SenseInside got wrong? Add it to `packages/core/src/sensecheck/eval/cases.json` with the expected decision and (optionally) the cited source. Now the system can never regress on that case.

### Read code in this order if you want to contribute meaningfully

1. `packages/core/src/sensecheck/schema.ts` — the data contracts.
2. `packages/core/src/sensecheck/prompt.ts` — the heart of the system.
3. `packages/core/src/sensecheck/index.ts` — how the prompt, brain, LLM, and cache come together.
4. `packages/hook/src/pretool.ts` — how Claude Code talks to us.
5. `packages/cli/src/commands/init.ts` — the install experience.
6. `packages/core/src/sensecheck/eval/run.ts` — the test harness.

Read each in 15 minutes. Read the comments where they exist. Step through the code with the debugger. Use this codebase as a reference for clean monorepo TypeScript.

---

## Part 8 — Glossary (refer back as needed)

- **Agent** — a program (powered by an LLM) that takes actions on your behalf.
- **Anthropic** — the company that makes Claude.
- **Bundle** — a single file containing all the code and dependencies needed to run, with no `node_modules` lookup at runtime.
- **CJS / ESM** — two ways JavaScript modules talk to each other. We use CJS for the hook bundle, ESM for the CLI.
- **Claude / Claude Haiku 4.5** — the LLM family / specific model SenseInside uses by default.
- **Claude Code** — Anthropic's terminal-based coding agent. The platform SenseInside ships on first.
- **Decision** — what the SenseCheck returns: `ALLOW`, `ALLOW_WITH_WARNING`, `REWRITE_ACTION`, `REQUIRE_APPROVAL`, `BLOCK`.
- **Hook** — a script that runs at a specific moment in Claude Code's lifecycle. We use the `PreToolUse` hook.
- **JSONL** — JSON Lines. A file where each line is one JSON object. Easy to append, easy to read line-by-line.
- **LLM** — large language model. The underlying AI.
- **Markdown** — plain text with light formatting (`# heading`, `**bold**`). What identity files are written in.
- **Monorepo** — a single repo containing multiple packages.
- **Observe Mode** — SenseInside watches and logs but does not block. Default for new installs.
- **PrivateBrain** — the local folder where your identity, rules, memory, and feedback live.
- **SenseCheck** — the function that evaluates a proposed action against your identity.
- **Subagent** — a specialized AI helper defined in `.claude/agents/<name>.md`. SenseInside is one.
- **Tier (0–3)** — trust level of a brain section. Tier 3 is untrusted and never reaches the SenseCheck prompt.
- **Tool call** — when an agent invokes a tool like `Read`, `Bash`, or `WebFetch`. Each tool call is one action SenseInside evaluates.
- **Trust mark** — a public badge a partner agent product earns when it certifies SenseInside compatibility.
- **Vault** — synonym for PrivateBrain folder.
- **Zod** — a TypeScript library that validates data shapes at runtime. Our contracts are written in Zod.

---

## Part 9 — Last word

You started this document with no context. By now you should be able to:

1. Explain what an AI agent is, in one sentence, without jargon.
2. Describe what SenseInside does, what problem it solves, and why it's not just "guardrails."
3. Walk someone through the three packages and what each one does.
4. Install it on a fresh project and run a doctor check.
5. Trigger a real SenseCheck via Claude Code and read the result.
6. Edit your identity in plain English and see the system adapt.
7. Find your way around the codebase and contribute a small change.

Welcome to the team.

> *Capability without character is dangerous.*
> *We are building good sense for machines that now have hands.*

If you get stuck, the four people who can unblock you fastest are:

- The README at the repo root.
- This document.
- The `docs/` folder (concept, install, architecture, faq).
- The code itself, especially `packages/core/src/sensecheck/prompt.ts`.

Good luck. Make something better than what you found.
