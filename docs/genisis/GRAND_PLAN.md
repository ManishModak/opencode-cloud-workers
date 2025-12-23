# OpenCode Cloud Workers - Grand Plan

> **Philosophy:** "Local Strategy, Remote Execution."
> Keep context and decision-making local; offload heavy compute to cloud sandboxes.

---

## Executive Summary

This project creates an **OpenCode plugin** that integrates async cloud coding agents, starting with **Google Jules**. The plugin enables:

1. **Smart Detection** → Agent identifies tasks suitable for offloading
2. **Delegation** → Send complex tasks to Jules from within OpenCode
3. **Two-Tier Tracking** → Track our tasks (Tier 1) + Jules uses OpenSpec (Tier 2)
4. **Cross-Session Continuity** → Resume reviews in new sessions via `/cw status`
5. **Polling** → Automatically track session progress (60s default, configurable)
6. **Review** → Local AI review of generated PRs before human sees them
7. **Feedback Loop** → Send fixes back to Jules, iterate automatically
8. **Merge** → Human-confirmed merge (agent suggests, human approves)

**Timeline:** 4-6 weeks to full-featured Jules integration

---

## Core Concepts

### Why Cloud Workers?

| Aspect | Local Agents (OMO subagents) | Cloud Workers (Jules) |
|--------|------------------------------|------------------------|
| **Where it runs** | Your machine, your API keys | Google's cloud sandbox |
| **Who pays** | You (every token) | Google (their quota) |
| **Rate limits** | Shares YOUR limits | Separate quota entirely |
| **Duration** | Minutes (context bound) | Hours (async, detached) |
| **Output** | Returns to conversation | Creates PR for review |

### Two-Tier Tracking System

```
TIER 1: Cloud Worker Task Tracking (OUR SYSTEM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Track what WE offloaded to cloud workers
Storage: .opencode/cloud-workers/tasks.json
Scope: Orchestration layer - task, expectations, provider session ID

TIER 2: OpenSpec (JULES' SYSTEM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Purpose: Track what changes JULES made
Storage: openspec/ in the PR branch
Scope: Implementation details - structured change tracking

We INSTRUCT Jules to use OpenSpec, giving us:
- Structured view of what Jules changed
- Easy diffing of intent vs implementation
- Reusable for review agent
```

### Cross-Session Continuity

```
SCENARIO A: Same Session
└── Context available → review immediately when PR ready

SCENARIO B: New Session (user runs /cw status)
└── Load tasks.json → check Jules status → review in new context

SCENARIO C: Closed & Returned Later
└── tasks.json persisted → /cw status shows pending → resume flow

SCENARIO D: Active Monitoring (session stays open)
└── Background polling → notification when ready → auto-trigger review
```

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         OPENCODE + CLOUD WORKERS                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                    LOCAL (OpenCode Plugin)                       │  │
│   │                                                                  │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │  │
│   │  │  Detection   │──│ Orchestrator │──│    Merge Manager     │   │  │
│   │  │  & Suggest   │  │  (Sisyphus)  │  │   (GitHub API/CLI)   │   │  │
│   │  └──────────────┘  └──────┬───────┘  └──────────────────────┘   │  │
│   │                           │                                      │  │
│   │  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────────────┐   │  │
│   │  │   Reviewer   │──│    Task      │──│    Notification      │   │  │
│   │  │   (Oracle)   │  │   Tracker    │  │      System          │   │  │
│   │  └──────────────┘  └──────────────┘  └──────────────────────┘   │  │
│   │                                                                  │  │
│   │  ┌──────────────────────────────────────────────────────────┐   │  │
│   │  │                  Provider Interface                       │   │  │
│   │  │    CloudWorkerProvider (abstract, multi-provider ready)   │   │  │
│   │  └──────────────────────────────────────────────────────────┘   │  │
│   │                              │                                   │  │
│   └──────────────────────────────│───────────────────────────────────┘  │
│                                  │                                      │
│   ┌──────────────────────────────▼───────────────────────────────────┐  │
│   │                       PROVIDERS                                   │  │
│   │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │  │
│   │  │  Jules (MVP)   │  │  Mock (Tests)  │  │  Future Providers  │  │  │
│   │  │  REST + CLI    │  │  Fake sessions │  │  Copilot, Cursor...│  │  │
│   │  └────────────────┘  └────────────────┘  └────────────────────┘  │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                    REMOTE (Jules Cloud)                          │  │
│   │  • Sandbox environment                                           │  │
│   │  • File edits, dependency installs, test runs                    │  │
│   │  • Auto-PR creation                                              │  │
│   │  • Uses OpenSpec for change tracking (Tier 2)                    │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detection & Suggestion System

The agent identifies tasks suitable for cloud offloading and suggests to the user.

### Trigger Conditions

| Signal | Examples |
|--------|----------|
| **Task Complexity** | Multiple files, refactoring, migration |
| **Explicit Keywords** | "all files", "entire module", "comprehensive tests" |
| **Duration Estimate** | Would take >10 mins in session |
| **Independence Check** | Doesn't need conversation context |

### Agent Behavior

```
Agent detects long-running task...

"This looks like a good candidate for cloud offloading:
 • Estimated: 45+ minutes of work
 • Scope: 12 files across 3 modules  
 • Independent: No conversation context needed
 
 Should I offload this to Jules? [Y/n]"

User: "Yes"

Agent constructs structured prompt for Jules...
```

### Prompt Construction

```
USER REQUEST:
  "Add tests to all service files"
  
CONSTRUCTED JULES PROMPT:
┌─────────────────────────────────────────────────────────────────┐
│ TASK: Add comprehensive unit tests to all service files        │
│                                                                 │
│ SCOPE: src/services/**/*.ts (12 files)                          │
│                                                                 │
│ REQUIREMENTS:                                                   │
│   - Use vitest framework                                        │
│   - Mock external dependencies                                  │
│   - Achieve >80% coverage                                       │
│   - Follow existing patterns in src/services/__tests__          │
│                                                                 │
│ DELIVERABLE: Single PR with all tests                           │
│                                                                 │
│ TRACKING: Use OpenSpec to document your changes                 │
│   - Create openspec/changes/add-service-tests.md                │
│   - Update progress as you work                                 │
│   - This helps us review your work efficiently                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Complete Workflow (Jules-Focused)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     THE CLOUD WORKER LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. DETECTION & SUGGESTION                                       │   │
│  │    Agent identifies long/complex task                           │   │
│  │    → Suggests offloading to user                                │   │
│  │    → User confirms: "Yes, offload to Jules"                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 2. PROMPT CONSTRUCTION & TRACKING (Tier 1)                      │   │
│  │    • Create structured prompt with expectations                 │   │
│  │    • Instruct Jules to use OpenSpec (Tier 2)                    │   │
│  │    • Save task to .opencode/cloud-workers/tasks.json            │   │
│  │    • Call JulesProvider.createSession(...)                      │   │
│  │    • Tell user: "Task offloaded. Continue with other work?"     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 3. EXECUTION (Remote - Jules Cloud)                             │   │
│  │    Jules clones repo → creates openspec → works → creates PR    │   │
│  │    States: QUEUED → PLANNING → IN_PROGRESS → COMPLETED          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 4. POLLING & NOTIFICATION (Local)                               │   │
│  │    Every 60s (configurable): check Jules session status         │   │
│  │                                                                  │   │
│  │    ┌────────────────────────────────────────────────────────┐   │   │
│  │    │ SAME SESSION OPEN:                                     │   │   │
│  │    │   → Inject notification + auto-trigger review          │   │   │
│  │    ├────────────────────────────────────────────────────────┤   │   │
│  │    │ SESSION CLOSED:                                        │   │   │
│  │    │   → Queue for next session (/cw status shows pending)  │   │   │
│  │    └────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 5. REVIEW (Local AI - may be new session)                       │   │
│  │    • Fetch PR diff + openspec from Jules branch                 │   │
│  │    • Compare against expectedOutcomes (from Tier 1)             │   │
│  │    • Send to Oracle agent for analysis                          │   │
│  │                                                                  │   │
│  │    Output: { approved, blockingIssues, suggestions, feedback }  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 6. FEEDBACK LOOP                                                │   │
│  │                                                                  │   │
│  │    ┌────────────────────────────────────────────────────────┐   │   │
│  │    │ ISSUES FOUND && rounds < maxRounds:                    │   │   │
│  │    │   → Construct fix prompt                               │   │   │
│  │    │   → Send to SAME Jules session (providerSessionId)     │   │   │
│  │    │   → Back to step 3                                     │   │   │
│  │    ├────────────────────────────────────────────────────────┤   │   │
│  │    │ ISSUES FOUND && rounds >= maxRounds:                   │   │   │
│  │    │   → "Max rounds reached, manual review needed"         │   │   │
│  │    ├────────────────────────────────────────────────────────┤   │   │
│  │    │ NO ISSUES (or only minor):                             │   │   │
│  │    │   → Proceed to merge (human confirmation required)     │   │   │
│  │    └────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                          ↓                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 7. MERGE (Human Confirmed)                                      │   │
│  │                                                                  │   │
│  │    Agent: "Review passed. Merge this PR?"                       │   │
│  │    Human: "Yes" (always required - agents make mistakes)        │   │
│  │                                                                  │   │
│  │    ┌────────────────────────────────────────────────────────┐   │   │
│  │    │ NO CONFLICTS:                                          │   │   │
│  │    │   → Execute merge via GitHub API                       │   │   │
│  │    │   → Update task status to "merged"                     │   │   │
│  │    ├────────────────────────────────────────────────────────┤   │   │
│  │    │ CONFLICTS DETECTED:                                    │   │   │
│  │    │   → Agent suggests resolution                          │   │   │
│  │    │   → Human confirms resolution approach                 │   │   │
│  │    │   → Resolve and merge                                  │   │   │
│  │    └────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/cloud-workers status` | `/cw status` | List all tasks with current status |
| `/cloud-workers review [id]` | `/cw review` | Start reviewing a specific task |
| `/cloud-workers cancel [id]` | `/cw cancel` | Cancel an in-progress task |
| `/cloud-workers history` | `/cw history` | Show completed/merged tasks |
| `/cloud-workers retry [id]` | `/cw retry` | Retry a failed task |

---

## Implementation Phases

### Phase 0: Foundation (Week 1)

**Goal:** Plugin scaffolding and Jules client

| Task | Est. | Priority |
|------|------|----------|
| Create plugin structure based on `oh-my-opencode` | 1 day | Critical |
| Define `RemoteWorkerProvider` TypeScript interface | 0.5 day | Critical |
| Implement Jules REST API client | 2 days | Critical |
| Implement `JulesProvider` class | 1 day | Critical |
| Add session persistence (`.opencode/cloud-workers/tasks.json`) | 0.5 day | High |
| Implement task tracking with expectedOutcomes | 0.5 day | High |

**Definition of Done:**

- [ ] Plugin loads in OpenCode without errors
- [ ] `cloud_worker_start` tool visible in OpenCode

---

### Phase 1: Core Loop (Week 2)

**Goal:** Working delegation → polling → completion cycle

| Task | Est. | Priority |
|------|------|----------|
| Implement `cloud_worker_start` tool | 1 day | Critical |
| Implement `cloud_worker_status` tool | 0.5 day | Critical |
| Implement `cloud_worker_list` tool | 0.5 day | High |
| Build polling scheduler (60s interval, configurable) | 1 day | Critical |
| Handle all Jules states (AWAITING_PLAN_APPROVAL, etc.) | 1 day | Critical |
| Add notification system (inject to session OR queue) | 0.5 day | High |
| Implement cross-session continuity (`/cw status` command) | 1 day | High |
| Add toast notifications for state changes | 0.5 day | Medium |

**Definition of Done:**

- [ ] Start Jules session from OpenCode
- [ ] See status updates in chat
- [ ] Get PR link when Jules completes
- [ ] Resume tracking in new session via `/cw status`

---

### Phase 2: Review + Feedback Loop (Week 3)

**Goal:** Automated code review before human sees it

| Task | Est. | Priority |
|------|------|----------|
| Fetch patch from Jules activities endpoint | 0.5 day | Critical |
| Review against expectedOutcomes (Tier 1 verification) | 0.5 day | Critical |
| Create review prompt for Oracle agent | 1 day | Critical |
| Parse structured review response | 0.5 day | Critical |
| Implement `cloud_worker_feedback` tool | 1 day | Critical |
| Implement automatic feedback loop (rounds) | 1 day | High |
| Add review round tracking to state | 0.5 day | High |

**Definition of Done:**

- [ ] Review finds issues automatically
- [ ] Feedback sent back to Jules
- [ ] Jules fixes and produces new PR
- [ ] At least one full feedback round works

---

### Phase 3: Merge Automation (Week 4)

**Goal:** Human-confirmed merge with conflict resolution

| Task | Est. | Priority |
|------|------|----------|
| Add GitHub API client (or use GitHub CLI) | 1 day | High |
| Implement conflict detection | 0.5 day | High |
| Implement `cloud_worker_merge` tool (human confirmation required) | 1 day | High |
| Add conflict resolution suggestions | 0.5 day | Medium |
| Handle merge failures gracefully | 0.5 day | High |

**Definition of Done:**

- [ ] `cloud_worker_merge` merges after human confirmation
- [ ] Conflicts are detected and resolution suggested
- [ ] Human always confirms merge (agent never auto-merges)

---

### Phase 4: Polish + Testing (Week 5)

**Goal:** Production-ready plugin

| Task | Est. | Priority |
|------|------|----------|
| Create mock provider for testing | 1 day | High |
| Write unit tests for orchestrator | 1 day | High |
| Write integration tests with mock | 1 day | Medium |
| Add comprehensive error handling | 1 day | High |
| Documentation (README, CONTRIBUTING) | 1 day | High |

**Definition of Done:**

- [ ] All tests pass
- [ ] Error messages are helpful
- [ ] README explains installation and usage

---

### Phase 5: Future Providers (Week 6+)

**Goal:** Enable community contributions

| Task | Est. | Priority |
|------|------|----------|
| Document provider interface thoroughly | 1 day | Medium |
| Create provider template/example | 0.5 day | Medium |
| Add fallback provider support (`--provider jules,local`) | 1 day | Low |
| Issue templates for "Add Provider" requests | 0.5 day | Low |

---

## Tool Surface

### MVP Tools (Phase 1-3)

| Tool | Description | Args |
|------|-------------|------|
| `cloud_worker_start` | Start a new Jules session | `prompt`, `repo?`, `branch?`, `watch?`, `autoReview?`, `autoMerge?` |
| `cloud_worker_status` | Get status of a session | `sessionId` |
| `cloud_worker_list` | List all active sessions | (none) |
| `cloud_worker_feedback` | Send feedback to session | `sessionId`, `feedback` |
| `cloud_worker_approve` | Approve Jules plan | `sessionId` |
| `cloud_worker_stop` | Stop watching a session | `sessionId` |
| `cloud_worker_merge` | Merge PR (explicit trigger) | `sessionId`, `method?` |

---

## Configuration Schema

```jsonc
// .opencode/cloud-workers/config.json
{
  "cloud_workers": {
    // Provider settings
    "default_provider": "jules",
    "providers": {
      "jules": {
        "api_key_env": "JULES_API_KEY",
        "base_url": "https://jules.googleapis.com",
        "api_version": "v1alpha"
      }
    },

    // Polling behavior
    "poll_interval_ms": 60000,       // 60s default, user-configurable
    "max_wait_ms": 21600000,         // 6 hours

    // Notification settings
    "notify_on_complete": true,      // Inject message when task ready
    "auto_trigger_review": true,     // Auto-start review if session open

    // Review settings
    "auto_review": true,
    "reviewer_agent": "oracle",
    "max_review_rounds": 2,

    // Plan approval
    "auto_approve_plan": false,

    // Merge settings (human confirmation always required)
    "merge_method": "squash",        // "merge" | "squash" | "rebase"
    
    // OpenSpec integration
    "instruct_openspec": true        // Tell Jules to use OpenSpec
  }
}
```

## Task Tracking Schema

```jsonc
// .opencode/cloud-workers/tasks.json
{
  "schemaVersion": 1,
  "tasks": [
    {
      "id": "cw_abc123",
      "provider": "jules",
      "providerSessionId": "jules_session_xyz",
      "status": "in_progress",       // pending | in_progress | pr_ready | reviewing | merged | failed
      "createdAt": "2025-12-23T10:00:00Z",
      "updatedAt": "2025-12-23T10:30:00Z",
      
      // What we asked for (Tier 1 tracking)
      "originalRequest": "Add tests to all services",
      "constructedPrompt": "...(full prompt sent to Jules)",
      "expectedOutcomes": [
        "Unit tests for UserService",
        "Unit tests for AuthService", 
        "Coverage >80%"
      ],
      
      // For review verification
      "prUrl": null,
      "reviewStatus": "pending",
      "reviewHistory": [],
      
      // Cross-session context
      "parentSessionId": "opencode_session_abc",
      "notificationQueued": false
    }
  ]
}
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Language** | TypeScript | OpenCode plugins are TypeScript only |
| **First Provider** | Jules (full features) | Only available provider, maximize value |
| **Review Strategy** | Patch-first | Stable, deterministic, no PR auth needed |
| **Merge Trigger** | Explicit opt-in | Safety first, user must enable |
| **State Storage** | JSON file | Simple, survives restarts, no external deps |

---

## Success Metrics

| Metric | Target | Phase |
|--------|--------|-------|
| **E2E Demo** | Jules session → PR link in chat | Phase 1 |
| **Review Loop** | At least 1 feedback round works | Phase 2 |
| **Merge Success** | Merge clean PR automatically | Phase 3 |
| **Test Coverage** | >70% for core orchestrator | Phase 4 |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Jules API changes | High | Pin to v1alpha, abstract behind provider interface |
| Long-running sessions timeout | Medium | Checkpoint/resume logic, max wait timeout |
| Review produces false positives | Medium | Conservative prompts, manual override |
| Merge conflicts | Low | Detect upfront, notify user, no force push |

---

## Related Documents

- [PROJECT_SPEC.md](./PROJECT_SPEC.md) - Detailed technical specification
- [jules_api_docs/](./jules_api_docs/) - Jules API reference
- [RESEARCH_ASYNC_CLOUD_AGENTS.md](./RESEARCH_ASYNC_CLOUD_AGENTS.md) - Provider research

---

## Next Steps

1. **Review and approve this plan**
2. **Create PROJECT_SPEC.md** with TypeScript interfaces
3. **Start Phase 0 implementation**
