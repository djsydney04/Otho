# agents.md

A single source of truth for how AI agents should work in this repo (Cursor + CLI agents).  
Treat this file like an engineering spec: predictable, testable, and hard to misinterpret.

---

## 0) Prime Directive

1. **Don’t guess. Verify.** Prefer reading repo files, schemas, and docs over assumptions.
2. **Small diffs win.** Make incremental changes; keep PRs/commits reviewable.
3. **Make it testable.** Every behavioral change should come with tests or a reproducible check.
4. **Keep data safe.** No secrets in logs, prompts, or commits. No copying proprietary data to external tools.
5. **Be explicit.** If you must assume, state the assumption and isolate it behind config.

---

## 1) Standard Agent Workflow

### 1.1 Understand the task
- Restate the goal in one sentence.
- Identify constraints (language/framework, performance, security, deadlines).
- Identify the “definition of done.”

### 1.2 Inspect the codebase first
Before writing new code:
- Search for existing implementations, helpers, patterns, and conventions.
- Identify where the feature *should* live (avoid duplication).

### 1.3 Plan the change
- Proposed approach (2–5 bullets).
- Files you’ll touch.
- Tests you’ll add/update.

### 1.4 Implement with guardrails
- Prefer the simplest correct solution.
- Add telemetry/logging only if it’s needed and non-sensitive.
- Handle edge cases: empty inputs, null/undefined, timeouts, network failures.

### 1.5 Validate
- Run unit/integration tests.
- Run typecheck/lint.
- Provide a minimal repro and verification steps.

### 1.6 Document
- Update README/docs only when behavior or usage changes.
- Add code comments only where intent is non-obvious.

---

## 2) Engineering Conventions

### 2.1 Style
- Follow existing repo lint/format rules.
- Prefer explicit types at module boundaries (API handlers, DB, adapters).
- Avoid cleverness; optimize for readability.

### 2.2 Error handling
- Use typed/structured errors at boundaries.
- Include actionable context (operation name, ids), **never** secrets.
- Differentiate:
  - **User errors** (400/422): validation, missing params
  - **Auth errors** (401/403)
  - **Not found** (404)
  - **System errors** (5xx): network, DB, unexpected

### 2.3 Logging
- No PII/secrets.
- Include correlation ids where available.
- Prefer structured logs (JSON) in server contexts.

### 2.4 API design
- Keep responses stable and versioned if needed.
- Validate input with a schema (zod or equivalent).
- Return consistent envelopes for errors.

### 2.5 Database
- Prefer migrations over ad-hoc schema changes.
- Keep RLS (if using Supabase) correct by default.
- Add indexes when access patterns justify it.

---

## 3) Testing Conventions

### 3.1 Required coverage (practical)
- Core business logic: unit tests.
- API routes: integration tests (happy path + at least 2 failure paths).
- AI features: eval harness (see Section 6).

### 3.2 Test qualities
- Deterministic: no reliance on real time or network unless explicitly marked.
- Fast: default test suite should run locally quickly.
- Minimal mocking: mock boundaries, not internals.

---

## 4) Security + Privacy Rules (Non-Negotiable)

- Never commit `.env*`, private keys, tokens, service accounts.
- Never paste secrets into prompts.
- Redact logs: emails, access tokens, auth headers, full request bodies.
- Use least privilege for external services.
- For user content: store only what’s required; follow retention rules.

---

## 5) Tool Use Rules (Search, Browsing, Sources)

### 5.1 Internal-first
Prefer:
- repo docs (`README`, `/docs`, `.agents/*`)
- source code
- schema/migrations
- existing tests

### 5.2 External info
If a feature depends on fast-changing APIs/specs, link to official docs in comments/docs.

### 5.3 Citations & grounding (for user-visible “facts”)
If the app surfaces “facts” (company details, news, etc.):
- Always attach sources.
- Prefer primary sources (official sites, filings) and reputable outlets.
- Keep a clear separation between:
  - retrieved evidence (quoted/paraphrased w/ URL)
  - model inference (explicitly labeled)

---

## 6) AI Feature Quality: Evals & Regression Testing

AI features must be tested like product surfaces, not “vibes”.

### 6.1 Required eval artifacts
- `evals/datasets/*.jsonl` (or similar):
  - input prompt/context
  - expected traits (not just exact output)
  - allowed variance rules
- `evals/runner.ts`:
  - deterministic runner
  - stable seeds where possible
  - snapshot + scoring

### 6.2 What to test
- **Correctness:** does it answer the question?
- **Grounding:** does it cite sources where required?
- **Safety:** no hallucinated claims presented as fact
- **Robustness:** empty/malformed inputs, long context, irrelevant context
- **Latency + cost:** track token usage & response time budgets

### 6.3 Scoring (practical)
Use a mix of:
- rule-based checks (JSON schema, presence of citations, disallowed phrases)
- semantic similarity checks (for flexible phrasing)
- human spot checks for top workflows

### 6.4 Golden tests for structured outputs
If the agent produces JSON:
- enforce a schema
- validate in tests
- fail fast on parse errors
- include “repair” path only if absolutely necessary and tested

---

## 7) Agent Architecture (Recommended Pattern)

### 7.1 Roles
- **Router:** decide which specialist to call
- **Retriever:** pulls internal + web evidence
- **Reasoner/Writer:** synthesizes answer
- **Verifier:** checks citations, schema validity, contradictions
- **Formatter:** enforces UI/UX output format

### 7.2 Prompt hygiene
- Keep system prompts short and stable.
- Put changing behavior in versioned “policy” files under `.agents/`.
- Prefer tool-based retrieval over stuffing prompts.

---

## 8) Repo-Specific Integration Points (Fill in)

> Update these once per repo and keep them accurate.

- Frontend: `./apps/web` (or `./src`)
- API routes: `./app/api` (Next.js) or `./server`
- DB schema/migrations: `./supabase/migrations` or `./prisma`
- Shared libs: `./lib`, `./packages/*`
- Evals: `./evals`
- Agent policies: `./.agents`

---

## 9) Pinecone (Vector Database)

⚠️ **MANDATORY: If you need to help with Pinecone, vector databases, embeddings, semantic search, RAG, or recommendations, you MUST read `.agents/PINECONE.md` first** to determine:

- What questions to ask the user
- How to select the programming language
- Which guide files to consult for implementation details

Do not proceed with Pinecone-related tasks without consulting the appropriate guide files. Use `.agents/PINECONE.md` as your entry point and follow its "Choosing the Right Guide" section to navigate to the appropriate resources.

### Pinecone Instructions Catalog
- @./.agents/PINECONE.md
- @./.agents/PINECONE-cli.md
- @./.agents/PINECONE-python.md
- @./.agents/PINECONE-typescript.md
- @./.agents/PINECONE-go.md
- @./.agents/PINECONE-java.md
- @./.agents/PINECONE-quickstart.md
- @./.agents/PINECONE-troubleshooting.md

---

## 10) “Done” Checklist (Use in every PR)

- [ ] Small, reviewable diff
- [ ] Types pass
- [ ] Lint/format pass
- [ ] Tests added/updated
- [ ] Error handling + logging is safe (no secrets/PII)
- [ ] AI features: evals updated + regression checked
- [ ] Docs updated if behavior changed
- [ ] No new TODOs without an issue/link

---

## 11) If You’re Unsure

When ambiguity exists:
- Choose the safest default behavior.
- Add a feature flag/config.
- Write a test that captures intended behavior.
- Document the decision in the PR description or a short ADR.

---

## 12) Quick Templates

### 12.1 Feature plan (paste in PR description)
- **Goal:**
- **Approach:**
- **Files changed:**
- **Tests:**
- **Verification steps:**
- **Risks/rollout:**

### 12.2 Bug fix plan
- **Symptom:**
- **Root cause:**
- **Fix:**
- **Regression test:**
- **Validation:**
