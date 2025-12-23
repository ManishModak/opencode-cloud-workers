# OpenCode Cloud Workers - Project Specification

> Technical specification for the `opencode-cloud-workers` plugin.
> This document defines interfaces, data models, and implementation details.

---

## 1. Project Metadata

| Field | Value |
|-------|-------|
| **Package Name** | `@opencode-ai/cloud-workers` |
| **Plugin Entry** | `src/index.ts` |
| **Minimum OpenCode Version** | `0.1.x` |
| **License** | MIT |

---

## 2. Directory Structure

```
opencode-cloud-workers/
├── src/
│   ├── index.ts                    # Plugin entry point
│   │
│   ├── core/
│   │   ├── interfaces/
│   │   │   ├── provider.ts         # RemoteWorkerProvider interface
│   │   │   ├── reviewer.ts         # ReviewAgent interface
│   │   │   └── types.ts            # Shared types
│   │   ├── orchestrator.ts         # Main delegation + feedback loop
│   │   ├── session-manager.ts      # Multi-session tracking + persistence
│   │   ├── polling-scheduler.ts    # Background polling logic
│   │   └── review-loop.ts          # Review → feedback → repeat
│   │
│   ├── providers/
│   │   ├── jules/
│   │   │   ├── client.ts           # Jules REST API client
│   │   │   ├── provider.ts         # JulesProvider implements RemoteWorkerProvider
│   │   │   ├── types.ts            # Jules-specific types
│   │   │   └── state-machine.ts    # Jules session states
│   │   └── mock/
│   │       └── provider.ts         # MockProvider for testing
│   │
│   ├── merge/
│   │   ├── github-api.ts           # GitHub merge via REST API
│   │   ├── github-cli.ts           # GitHub merge via `gh` CLI
│   │   └── merge-manager.ts        # Conflict detection + merge execution
│   │
│   ├── tools/
│   │   ├── cloud-worker-start.ts
│   │   ├── cloud-worker-status.ts
│   │   ├── cloud-worker-list.ts
│   │   ├── cloud-worker-feedback.ts
│   │   ├── cloud-worker-approve.ts
│   │   ├── cloud-worker-stop.ts
│   │   └── cloud-worker-merge.ts
│   │
│   ├── config/
│   │   ├── schema.ts               # Zod schema for config validation
│   │   └── loader.ts               # Load from opencode.json or env
│   │
│   └── utils/
│       ├── logger.ts               # Logging utilities
│       ├── github.ts               # GitHub helpers (parse PR URL, etc.)
│       └── retry.ts                # Retry with backoff
│
├── tests/
│   ├── unit/
│   │   ├── orchestrator.test.ts
│   │   ├── session-manager.test.ts
│   │   └── jules-client.test.ts
│   └── integration/
│       └── mock-provider.test.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Core Interfaces

### 3.1 RemoteWorkerProvider

```typescript
// src/core/interfaces/provider.ts

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// Every remote worker provider must implement this interface.
// ═══════════════════════════════════════════════════════════════════════════

export interface RemoteWorkerProvider {
  /** Provider identifier (e.g., "jules", "codex") */
  readonly name: string;
  
  /** Provider version for debugging */
  readonly version: string;

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new remote session.
   * Returns immediately after session is queued.
   */
  createSession(params: CreateSessionParams): Promise<CreateSessionResult>;

  /**
   * Get current session state and metadata.
   * Used for polling.
   */
  getSession(sessionId: string): Promise<SessionState>;

  /**
   * Cancel a running session.
   * May not be supported by all providers.
   */
  cancelSession?(sessionId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // INTERACTION METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send feedback to an active session.
   * Typically used when review finds issues.
   */
  sendFeedback(sessionId: string, message: string): Promise<void>;

  /**
   * Approve plan (for providers that require explicit approval).
   */
  approvePlan?(sessionId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────────────────
  // OUTPUT METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get artifacts from a completed session.
   * May include patch, PR URL, commit message.
   */
  getArtifacts(sessionId: string): Promise<SessionArtifacts>;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateSessionParams {
  /** Repository in "owner/repo" format */
  repo: string;
  
  /** Branch to work from (defaults to main/master) */
  branch?: string;
  
  /** Task description / prompt */
  prompt: string;
  
  /** Title for the session / PR */
  title?: string;
  
  /** Whether to auto-create PR (provider-specific) */
  autoCreatePR?: boolean;
  
  /** Whether to require plan approval before execution */
  requirePlanApproval?: boolean;
}

export interface CreateSessionResult {
  sessionId: string;
  status: SessionStatus;
  /** URL to view session in provider's console */
  consoleUrl?: string;
}

export type SessionStatus =
  | "queued"
  | "planning"
  | "awaiting_plan_approval"
  | "in_progress"
  | "awaiting_feedback"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

export interface SessionState {
  sessionId: string;
  status: SessionStatus;
  
  /** Human-readable status message */
  statusMessage?: string;
  
  /** Provider-specific state details */
  details?: Record<string, unknown>;
  
  /** Error message if status is "failed" */
  error?: {
    code: string;
    message: string;
  };
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionArtifacts {
  /** Unified diff patch (preferred for review) */
  patch?: UnifiedPatch;
  
  /** PR URL (if auto-created) */
  prUrl?: string;
  
  /** Suggested commit message */
  commitMessage?: string;
  
  /** Human-readable summary of changes */
  changesSummary?: string;
  
  /** Base commit this patch applies to */
  baseCommitId?: string;
}

export interface UnifiedPatch {
  /** The raw unified diff content */
  content: string;
  
  /** Files modified */
  filesChanged: string[];
  
  /** Stats */
  additions: number;
  deletions: number;
}
```

### 3.2 ReviewAgent Interface

```typescript
// src/core/interfaces/reviewer.ts

export interface ReviewAgent {
  readonly name: string;

  /**
   * Review a patch and return structured feedback.
   */
  review(params: ReviewParams): Promise<ReviewResult>;
}

export interface ReviewParams {
  /** The unified diff to review */
  patch: string;
  
  /** Original task prompt (for context) */
  originalPrompt: string;
  
  /** Current review round (1-indexed) */
  round: number;
  
  /** Max rounds configured */
  maxRounds: number;
}

export interface ReviewResult {
  /** Whether the patch is approved */
  approved: boolean;
  
  /** Issues that block approval */
  blockingIssues: ReviewIssue[];
  
  /** Suggestions that don't block */
  suggestions: ReviewIssue[];
  
  /** Concise feedback message to send to remote agent */
  feedbackToRemote: string;
  
  /** Detailed analysis for logging */
  analysisNotes?: string;
}

export interface ReviewIssue {
  severity: "critical" | "major" | "minor";
  category: "bug" | "security" | "performance" | "style" | "logic";
  description: string;
  file?: string;
  line?: number;
}
```

---

## 4. Data Models

### 4.1 Cloud Worker Task (Tier 1 Tracking)

```typescript
// src/core/interfaces/types.ts

/**
 * Tier 1 Tracking: What WE offloaded to cloud workers.
 * This is our orchestration layer tracking, separate from what Jules tracks via OpenSpec.
 */
export interface CloudWorkerTask {
    // ─────────────────────────────────────────────────────────────────────────
    // IDENTITY
    // ─────────────────────────────────────────────────────────────────────────
    
    /** Unique task ID (e.g., "cw_abc123") */
    id: string;
    
    /** Provider name (e.g., "jules") */
    provider: string;
    
    /** Remote session ID from provider */
    providerSessionId: string;
    
    /** URL to view in provider's console */
    consoleUrl?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // TASK CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    
    /** Original user request (before prompt construction) */
    originalRequest: string;
    
    /** Full constructed prompt sent to provider */
    constructedPrompt: string;
    
    /** Expected outcomes for review verification */
    expectedOutcomes: string[];
    
    /** Repository in "owner/repo" format */
    repo: string;
    
    /** Branch the task works on */
    branch: string;
    
    /** Task title */
    title?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /** Current task status */
    status: CloudWorkerTaskStatus;
    
    /** Human-readable status message */
    statusMessage?: string;
    
    /** Error details if failed */
    error?: {
        code: string;
        message: string;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // REVIEW STATE
    // ─────────────────────────────────────────────────────────────────────────
    
    /** Current review round (0 = not reviewed yet) */
    reviewRound: number;
    
    /** Max review rounds before requiring human intervention */
    maxReviewRounds: number;
    
    /** Review history */
    reviewHistory: ReviewHistoryEntry[];

    // ─────────────────────────────────────────────────────────────────────────
    // OUTPUTS
    // ─────────────────────────────────────────────────────────────────────────
    
    /** PR URL if created */
    prUrl?: string;
    
    /** Whether the task has been merged */
    merged: boolean;
    
    /** Merge commit SHA */
    mergeCommitSha?: string;

    // ─────────────────────────────────────────────────────────────────────────
    // CROSS-SESSION CONTEXT
    // ─────────────────────────────────────────────────────────────────────────
    
    /** OpenCode session that created this task */
    parentSessionId?: string;
    
    /** Whether notification is queued for next session */
    notificationQueued: boolean;

    // ─────────────────────────────────────────────────────────────────────────
    // TIMESTAMPS
    // ─────────────────────────────────────────────────────────────────────────
    
    createdAt: string;  // ISO 8601
    updatedAt: string;
    completedAt?: string;
}

export type CloudWorkerTaskStatus = 
    | "pending"        // Task created, not yet sent to provider
    | "queued"         // Sent to provider, waiting to start
    | "planning"       // Provider is planning
    | "in_progress"    // Provider is working
    | "pr_ready"       // PR created, ready for review
    | "reviewing"      // Local review in progress
    | "awaiting_merge" // Review passed, waiting for human merge confirmation
    | "merged"         // Successfully merged
    | "failed"         // Task failed
    | "cancelled";     // Task cancelled

export interface ReviewHistoryEntry {
    round: number;
    timestamp: string;
    approved: boolean;
    issueCount: number;
    feedback: string;
}
```

### 4.2 Session Record (Provider-Level Tracking)

```typescript
// src/core/interfaces/types.ts

export interface TrackedSession {
  // ─────────────────────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Unique ID for this tracked session */
  id: string;
  
  /** Provider name (e.g., "jules") */
  provider: string;
  
  /** Remote session ID from provider */
  remoteSessionId: string;
  
  /** URL to view in provider's console */
  consoleUrl?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Repository in "owner/repo" format */
  repo: string;
  
  /** Starting branch */
  branch: string;
  
  /** Original task prompt */
  prompt: string;
  
  /** Session title */
  title?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // PARENT CONTEXT (OpenCode session that spawned this)
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Parent OpenCode session ID */
  parentSessionId?: string;
  
  /** Parent message ID (for targeted notifications) */
  parentMessageId?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Current status */
  status: SessionStatus;
  
  /** Last known status (for detecting changes) */
  lastKnownStatus?: SessionStatus;
  
  /** Status message */
  statusMessage?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // REVIEW STATE
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Whether auto-review is enabled */
  autoReview: boolean;
  
  /** Current review round (0 = not reviewed yet) */
  reviewRound: number;
  
  /** Max review rounds before stopping */
  maxReviewRounds: number;
  
  /** Last review result */
  lastReviewResult?: {
    approved: boolean;
    issues: number;
    feedback: string;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // OUTPUTS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** PR URL if created */
  prUrl?: string;
  
  /** Last fetched patch (for diffing) */
  lastPatchHash?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // MERGE STATE
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Whether auto-merge is enabled */
  autoMerge: boolean;
  
  /** Merge method */
  mergeMethod?: "merge" | "squash" | "rebase";
  
  /** Whether PR has been merged */
  merged: boolean;
  
  /** Merge commit SHA */
  mergeCommitSha?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // CONTROL FLAGS
  // ─────────────────────────────────────────────────────────────────────────
  
  /** Whether actively watching (polling) this session */
  watching: boolean;
  
  /** Whether an operation is in flight (prevents duplicate ops) */
  inFlight: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // TIMESTAMPS
  // ─────────────────────────────────────────────────────────────────────────
  
  createdAt: string; // ISO 8601
  updatedAt: string;
  completedAt?: string;
}
```

### 4.3 Persisted State File

```typescript
// .opencode/cloud-workers/tasks.json

export interface CloudWorkersState {
    /** Schema version for migrations */
    schemaVersion: 1;
    
    /** All tracked tasks (Tier 1) */
    tasks: CloudWorkerTask[];
    
    /** Last poll timestamp */
    lastPollAt?: string;
    
    /** Tasks pending notification in next session */
    pendingNotifications: string[];  // task IDs
}
```

---

## 5. Commands

The plugin exposes commands for cross-session task management:

| Command | Alias | Description |
|---------|-------|-------------|
| `/cloud-workers status` | `/cw status` | List all tasks with current status |
| `/cloud-workers review [id]` | `/cw review` | Start reviewing a specific task |
| `/cloud-workers cancel [id]` | `/cw cancel` | Cancel an in-progress task |
| `/cloud-workers history` | `/cw history` | Show completed/merged tasks |
| `/cloud-workers retry [id]` | `/cw retry` | Retry a failed task |

---

## 6. Jules Provider Specification

### 5.1 API Endpoints

Based on `jules_api_docs/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1alpha/sources` | GET | List available repositories |
| `/v1alpha/sessions` | POST | Create new session |
| `/v1alpha/sessions/{id}` | GET | Get session status |
| `/v1alpha/sessions/{id}:approvePlan` | POST | Approve plan |
| `/v1alpha/sessions/{id}:sendMessage` | POST | Send feedback message |
| `/v1alpha/sessions/{id}/activities` | GET | Get activities (includes patches) |

### 5.2 Jules Session States

```typescript
// src/providers/jules/state-machine.ts

export const JULES_STATES = {
  QUEUED: "QUEUED",
  PLANNING: "PLANNING",
  AWAITING_PLAN_APPROVAL: "AWAITING_PLAN_APPROVAL",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_USER_FEEDBACK: "AWAITING_USER_FEEDBACK",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PAUSED: "PAUSED",
} as const;

// Mapping to our normalized status
export function mapJulesStatus(julesState: string): SessionStatus {
  const mapping: Record<string, SessionStatus> = {
    QUEUED: "queued",
    PLANNING: "planning",
    AWAITING_PLAN_APPROVAL: "awaiting_plan_approval",
    IN_PROGRESS: "in_progress",
    AWAITING_USER_FEEDBACK: "awaiting_feedback",
    COMPLETED: "completed",
    FAILED: "failed",
    PAUSED: "paused",
  };
  return mapping[julesState] ?? "in_progress";
}
```

### 5.3 Jules Client Implementation

```typescript
// src/providers/jules/client.ts

export interface JulesClientConfig {
  apiKey: string;
  baseUrl: string;
  apiVersion: string;
}

export class JulesClient {
  constructor(private config: JulesClientConfig) {}

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}/${this.config.apiVersion}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        "X-Goog-Api-Key": this.config.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new JulesAPIError(response.status, error);
    }

    return response.json();
  }

  async createSession(params: {
    sourceId: string;
    taskDescription: string;
    title?: string;
    automationMode?: "AUTO_CREATE_PR" | "MANUAL";
    requirePlanApproval?: boolean;
  }): Promise<JulesSession> {
    return this.request("POST", "/sessions", {
      sourceId: params.sourceId,
      taskDescription: params.taskDescription,
      title: params.title,
      automationMode: params.automationMode ?? "AUTO_CREATE_PR",
      requirePlanApproval: params.requirePlanApproval ?? false,
    });
  }

  async getSession(sessionId: string): Promise<JulesSession> {
    return this.request("GET", `/sessions/${sessionId}`);
  }

  async approvePlan(sessionId: string): Promise<void> {
    await this.request("POST", `/sessions/${sessionId}:approvePlan`, {});
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    await this.request("POST", `/sessions/${sessionId}:sendMessage`, {
      message,
    });
  }

  async getActivities(sessionId: string): Promise<JulesActivities> {
    return this.request("GET", `/sessions/${sessionId}/activities`);
  }

  async getSources(): Promise<JulesSource[]> {
    const response = await this.request<{ sources: JulesSource[] }>(
      "GET",
      "/sources"
    );
    return response.sources;
  }
}

export class JulesAPIError extends Error {
  constructor(
    public statusCode: number,
    public responseBody: string
  ) {
    super(`Jules API error (${statusCode}): ${responseBody}`);
  }
}
```

---

## 7. Tool Specifications

### 6.1 cloud_worker_start

```typescript
// src/tools/cloud-worker-start.ts

import { tool } from "@opencode-ai/plugin/tool";
import { z } from "zod";

export const cloudWorkerStart = tool({
  description: `
Start a new cloud worker session to execute a coding task remotely.
The worker will clone the repository, make changes, and create a PR.
Use this for complex tasks that benefit from a dedicated sandbox environment.
  `.trim(),
  
  args: {
    prompt: z.string().describe("The task description for the worker"),
    
    repo: z.string().optional().describe(
      "Repository in 'owner/repo' format. Auto-detected from git remote if not provided."
    ),
    
    branch: z.string().optional().describe(
      "Branch to work from. Defaults to current branch or main."
    ),
    
    title: z.string().optional().describe(
      "Title for the session/PR. Auto-generated if not provided."
    ),
    
    watch: z.boolean().optional().default(true).describe(
      "Whether to actively poll for status updates."
    ),
    
    autoReview: z.boolean().optional().describe(
      "Whether to auto-review the PR when complete. Defaults to config value."
    ),
    
    autoMerge: z.boolean().optional().default(false).describe(
      "Whether to auto-merge if review passes. CAUTION: Use with care."
    ),
    
    provider: z.string().optional().default("jules").describe(
      "Which cloud worker provider to use."
    ),
  },
  
  async execute(args, context) {
    // Implementation outlined in GRAND_PLAN.md
    // 1. Resolve repo if not provided
    // 2. Create session via provider
    // 3. Store in session manager
    // 4. Start polling if watch=true
    // 5. Return confirmation with session ID
  },
});
```

### 6.2 cloud_worker_status

```typescript
export const cloudWorkerStatus = tool({
  description: "Get the current status of a cloud worker session.",
  
  args: {
    sessionId: z.string().describe("The session ID to check"),
  },
  
  async execute(args, context) {
    // 1. Look up session in session manager
    // 2. Optionally poll provider for fresh status
    // 3. Return formatted status report
  },
});
```

### 6.3 cloud_worker_feedback

```typescript
export const cloudWorkerFeedback = tool({
  description: `
Send feedback to a cloud worker session.
Use this when the worker is awaiting feedback or to request changes.
  `.trim(),
  
  args: {
    sessionId: z.string().describe("The session ID"),
    feedback: z.string().describe("Feedback message to send"),
  },
  
  async execute(args, context) {
    // 1. Validate session exists and is in appropriate state
    // 2. Send feedback via provider
    // 3. Update session state
    // 4. Resume polling
  },
});
```

### 6.4 cloud_worker_merge

```typescript
export const cloudWorkerMerge = tool({
  description: `
Merge a PR from a completed cloud worker session.
Only works if the session has a PR URL and review is approved.
  `.trim(),
  
  args: {
    sessionId: z.string().describe("The session ID"),
    method: z.enum(["merge", "squash", "rebase"]).optional().describe(
      "Merge method. Defaults to config or 'squash'."
    ),
    force: z.boolean().optional().default(false).describe(
      "Skip review check. CAUTION: Use with care."
    ),
  },
  
  async execute(args, context) {
    // 1. Validate session has PR
    // 2. Check review status (unless force=true)
    // 3. Check for merge conflicts
    // 4. Execute merge via GitHub API/CLI
    // 5. Update session state
  },
});
```

---

## 8. Configuration Schema

```typescript
// src/config/schema.ts

import { z } from "zod";

export const ProviderConfigSchema = z.object({
    api_key_env: z.string().default("JULES_API_KEY"),
    base_url: z.string().default("https://jules.googleapis.com"),
    api_version: z.string().default("v1alpha"),
});

export const CloudWorkersConfigSchema = z.object({
    // Provider settings
    default_provider: z.string().default("jules"),
    providers: z.record(ProviderConfigSchema).optional(),

    // Polling behavior
    poll_interval_ms: z.number().min(10000).max(300000).default(60000), // 60s default
    max_wait_ms: z.number().max(86400000).default(21600000), // 6 hours

    // Notification settings
    notify_on_complete: z.boolean().default(true),
    auto_trigger_review: z.boolean().default(true),

    // Review settings
    auto_review: z.boolean().default(true),
    reviewer_agent: z.string().default("oracle"),
    max_review_rounds: z.number().min(0).max(10).default(2),

    // Plan approval
    auto_approve_plan: z.boolean().default(false),

    // Merge settings (human confirmation always required)
    merge_method: z.enum(["merge", "squash", "rebase"]).default("squash"),

    // OpenSpec integration
    instruct_openspec: z.boolean().default(true),
});

export type CloudWorkersConfig = z.infer<typeof CloudWorkersConfigSchema>;
```

---

## 9. Error Handling

```typescript
// src/utils/errors.ts

export class CloudWorkerError extends Error {
  constructor(
    message: string,
    public code: string,
    public sessionId?: string,
    public recoverable: boolean = false
  ) {
    super(message);
  }
}

export const ErrorCodes = {
  // Provider errors
  PROVIDER_NOT_FOUND: "PROVIDER_NOT_FOUND",
  PROVIDER_AUTH_FAILED: "PROVIDER_AUTH_FAILED",
  PROVIDER_RATE_LIMITED: "PROVIDER_RATE_LIMITED",
  
  // Session errors
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_ALREADY_COMPLETED: "SESSION_ALREADY_COMPLETED",
  SESSION_FAILED: "SESSION_FAILED",
  
  // Review errors
  REVIEW_FAILED: "REVIEW_FAILED",
  MAX_ROUNDS_EXCEEDED: "MAX_ROUNDS_EXCEEDED",
  
  // Merge errors
  MERGE_CONFLICT: "MERGE_CONFLICT",
  MERGE_NOT_ALLOWED: "MERGE_NOT_ALLOWED",
  MERGE_FAILED: "MERGE_FAILED",
  
  // Config errors
  INVALID_CONFIG: "INVALID_CONFIG",
  MISSING_API_KEY: "MISSING_API_KEY",
} as const;
```

---

## 10. Testing Strategy

### 9.1 Unit Tests

| Module | Focus |
|--------|-------|
| `orchestrator.ts` | State transitions, loop logic |
| `session-manager.ts` | CRUD, persistence, query |
| `jules-client.ts` | Request/response mapping |
| `review-loop.ts` | Review parsing, feedback generation |

### 9.2 Integration Tests (Mock Provider)

```typescript
// tests/integration/mock-provider.test.ts

describe("Cloud Worker Integration", () => {
  it("completes full Create → Poll → Review → Merge cycle", async () => {
    const provider = new MockProvider({
      pollsUntilComplete: 3,
      generatePatch: true,
    });
    
    // 1. Start session
    const session = await orchestrator.start({ prompt: "Fix bug" });
    
    // 2. Poll until complete
    await orchestrator.pollUntilDone(session.id);
    
    // 3. Verify review was triggered
    expect(session.reviewRound).toBe(1);
    
    // 4. Verify merge
    expect(session.merged).toBe(true);
  });
});
```

---

## 11. Dependencies

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "workspace:*",
    "@opencode-ai/sdk": "workspace:*",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^1.x",
    "@types/node": "^22.x"
  }
}
```

---

## 12. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JULES_API_KEY` | Yes (for Jules) | - | Google Jules API key |
| `GITHUB_TOKEN` | For merge | - | GitHub token with repo access |

---

## 13. Related Documents

- [GRAND_PLAN.md](./GRAND_PLAN.md) - High-level roadmap and architecture
- [jules_api_docs/](./jules_api_docs/) - Jules API reference
- [oh-my-opencode/](./oh-my-opencode/) - Reference plugin implementation
