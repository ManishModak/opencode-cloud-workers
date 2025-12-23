# AGENTS.md — OpenCode Cloud Workers Plugin

> **For AI agents and human contributors working on this plugin.**

---

## Project Overview

**OpenCode Cloud Workers** is an OpenCode plugin that delegates complex, long-running coding tasks to asynchronous cloud agents (starting with **Google Jules**).

**Philosophy**: "Local Strategy, Remote Execution"
- **Local**: Context, decision-making, code review, orchestration
- **Remote**: Heavy compute, sandboxed execution, environment setup

**Package**: `@opencode-ai/cloud-workers`

---

## Directory Structure

```
opencode-cloud-workers/
├── src/
│   ├── index.ts                    # Plugin entry point
│   ├── config/
│   │   └── loader.ts               # Configuration loading & validation
│   ├── core/
│   │   ├── interfaces/
│   │   │   ├── provider.ts         # RemoteWorkerProvider interface
│   │   │   └── types.ts            # Shared types (Session, Status, etc.)
│   │   ├── session-manager.ts      # Session state persistence
│   │   ├── session-manager.test.ts # Tests
│   │   ├── loop.ts                 # Background polling loop
│   │   └── reviewer.ts             # AI review loop (Oracle integration)
│   ├── providers/
│   │   ├── jules/
│   │   │   ├── client.ts           # Jules API client
│   │   │   ├── provider.ts         # Jules provider implementation
│   │   │   ├── state-machine.ts    # Session state transitions
│   │   │   └── types.ts            # Jules-specific types
│   │   └── github/
│   │       └── client.ts           # GitHub API (PR operations)
│   └── tools/
│       ├── start.ts                # cloud_worker_start tool
│       ├── status.ts               # cloud_worker_status tool
│       ├── list.ts                 # cloud_worker_list tool
│       ├── feedback.ts             # cloud_worker_feedback tool
│       └── merge.ts                # cloud_worker_merge tool
├── docs/
│   ├── architecture.md             # System design & diagrams
│   ├── configuration.md            # Config schema reference
│   ├── getting-started.md          # User guide
│   └── jules_api_docs/             # Jules API reference (local copy)
├── examples/                       # Usage examples
├── openspec/                       # OpenSpec proposals & specs
│   ├── AGENTS.md                   # OpenSpec workflow instructions
│   └── project.md                  # Project context for specs
├── .github/                        # GitHub templates & workflows
├── package.json
├── tsconfig.json
├── README.md                       # User-facing documentation
├── CONTRIBUTING.md                 # Contribution guidelines
└── AGENTS.md                       # This file
```

---

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run build` | Compile TypeScript to `dist/` |
| `bun run typecheck` | Type-check without emitting |
| `bun run test` | Run all tests (vitest) |
| `bun run test <pattern>` | Run specific tests (e.g., `bun run test session-manager`) |

---

## Code Style

### TypeScript
- **Strict mode**: Always enabled. Never use `as any` or `@ts-ignore`.
- **Target**: ES2022, ESNext modules
- **Explicit types**: Prefer explicit return types on exported functions

### Formatting
- **Quotes**: Double quotes (`"`)
- **Indent**: 4 spaces
- **Trailing commas**: Yes in multi-line, no in single-line
- **Semicolons**: Yes

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `sessionManager`, `startSession()` |
| Classes/Types/Interfaces | PascalCase | `SessionManager`, `RemoteWorkerProvider` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_POLL_INTERVAL` |
| Files | kebab-case | `session-manager.ts` |

### Imports
```typescript
// 1. External packages first
import { z } from "zod";
import { Octokit } from "octokit";

// 2. Then relative imports, grouped by domain
import { RemoteWorkerProvider } from "./interfaces/provider";
import { Session, SessionStatus } from "./interfaces/types";
```

### Error Handling
- Create custom Error classes extending `Error` (see `JulesAPIError`)
- **Never**: Empty catch blocks
- **Never**: Swallow errors silently
- **Prefer**: Result-based patterns or early returns over try/catch

```typescript
// Good: Custom error class
export class JulesAPIError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly endpoint: string
    ) {
        super(`[Jules API] ${message} (${statusCode} at ${endpoint})`);
        this.name = "JulesAPIError";
    }
}
```

### Validation
- Use **Zod** schemas for all runtime validation
- Define schemas alongside types

```typescript
export const SessionSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(["queued", "planning", "in_progress", "completed", "failed"]),
    createdAt: z.string().datetime(),
});

export type Session = z.infer<typeof SessionSchema>;
```

### Async
- Use `async/await`, never raw `.then()` chains
- Handle errors explicitly

### Logging
- Prefix with module name in brackets
- Be concise but informative

```typescript
console.log("[SessionManager] Session created:", sessionId);
console.error("[CloudWorkerLoop] Poll failed:", error.message);
```

---

## Development Workflow

### Adding a New Tool
1. Create file in `src/tools/<tool-name>.ts`
2. Define Zod schema for parameters
3. Implement tool function
4. Register in `src/index.ts`
5. Add tests
6. Document in README.md

### Adding a New Provider
1. Create directory `src/providers/<provider-name>/`
2. Implement `RemoteWorkerProvider` interface
3. Add provider-specific types and client
4. Register in config loader
5. Add to docs/configuration.md

### Making Changes
1. **Read first**: Understand existing patterns before changing
2. **Small PRs**: One logical change per PR
3. **Test**: Add/update tests for any behavior changes
4. **Typecheck**: Run `bun run typecheck` before committing

---

## Testing Guidelines

- **Framework**: Vitest
- **Location**: Tests live next to source files (`*.test.ts`)
- **Naming**: `describe` blocks match module, `it` blocks describe behavior

```typescript
// session-manager.test.ts
describe("SessionManager", () => {
    describe("createSession", () => {
        it("should persist session to state file", async () => {
            // ...
        });
    });
});
```

### What to Test
- **Always**: Core logic, state transitions, error paths
- **Skip**: Simple pass-through functions, type definitions

### Mocking
- Mock external APIs (Jules, GitHub)
- Use dependency injection for testability

---

## Architecture Quick Reference

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    OpenCode     │──────▶│     Plugin      │──────▶│   Jules API     │
│  (Orchestrator) │       │ (SessionMgr)    │       │ (Cloud Worker)  │
└─────────────────┘       └────────┬────────┘       └────────┬────────┘
        ▲                          │                         │
        │                          ▼                         ▼
        │                 ┌─────────────────┐       ┌─────────────────┐
        └─────────────────┤   Review Loop   │◀──────┤   GitHub PR     │
          (Oracle Agent)  │ (Patch Review)  │       │ (Artifacts)     │
                          └─────────────────┘       └─────────────────┘
```

**Data Flow**: User Request → Tool → Provider → Cloud Worker → PR → Review Loop → Feedback/Merge

See [docs/architecture.md](docs/architecture.md) for detailed breakdown.

---

## Debugging Tips

### Session Issues
- Check `.opencode/cloud-workers/state.json` for persisted state
- Verify `JULES_API_KEY` is set correctly

### API Errors
- Jules errors include status code and endpoint in `JulesAPIError`
- Check network connectivity and API key permissions

### Polling Issues
- Loop logs prefixed with `[CloudWorkerLoop]`
- Check interval configuration in `opencode.json`

### Type Errors
- Run `bun run typecheck` for full diagnostics
- Never suppress with `as any` - fix the root cause

---

## Key Interfaces

```typescript
// Core provider interface - implement this for new cloud workers
interface RemoteWorkerProvider {
    createSession(params: CreateSessionParams): Promise<Session>;
    getSession(sessionId: string): Promise<Session>;
    sendFeedback(sessionId: string, feedback: string): Promise<void>;
    getArtifacts(sessionId: string): Promise<Artifact[]>;
}
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | User-facing overview & installation |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines & PR process |
| [docs/architecture.md](docs/architecture.md) | System design deep-dive |
| [docs/configuration.md](docs/configuration.md) | Config schema reference |
| [docs/getting-started.md](docs/getting-started.md) | First-time user guide |

---

## OpenSpec

For architectural changes, new features, or breaking changes:

1. Navigate to `openspec/` directory
2. Read `openspec/AGENTS.md` for workflow instructions
3. Create proposal following the OpenSpec format
4. Get approval before implementation

```bash
# OpenSpec lives here
opencode-cloud-workers/openspec/
├── AGENTS.md      # Workflow instructions
└── project.md     # Project context
```

---

## For AI Agents

When working on this plugin:

1. **Read existing code first** before making changes
2. **Follow patterns** in similar files (tools, providers)
3. **Run typecheck** after every significant change
4. **Never use** `as any`, `@ts-ignore`, empty catch blocks
5. **Test your changes** with `bun run test`
6. **Keep PRs small** and focused on single changes
