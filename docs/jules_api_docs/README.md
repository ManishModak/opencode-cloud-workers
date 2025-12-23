# Jules API Documentation

> Local reference for the Google Jules API  
> **Official Docs:** <https://developers.google.com/jules/api>  
> **Last Updated:** December 19, 2025 (Verified against v1alpha)

> [!WARNING]
> **Alpha Release:** The Jules API is **experimental**. Specifications, API keys, and definitions may change. Max **3 API keys** per account.

---

## Documents

| File | Description |
|------|-------------|
| [00_OVERVIEW.md](./00_OVERVIEW.md) | API overview, authentication, endpoint reference |
| [01_QUICKSTART.md](./01_QUICKSTART.md) | Step-by-step first API call guide |
| [02_SESSION_RESOURCE.md](./02_SESSION_RESOURCE.md) | Session object & types (State, AutomationMode, etc.) |
| [03_SESSION_METHODS.md](./03_SESSION_METHODS.md) | Session CRUD methods + orchestration patterns |
| [04_ACTIVITIES.md](./04_ACTIVITIES.md) | Activity tracking & artifact types |
| [05_SOURCES.md](./05_SOURCES.md) | Repository sources management + filtering |

---

## Quick Reference

### Base URL

```
https://jules.googleapis.com
```

### Authentication

```
X-Goog-Api-Key: YOUR_API_KEY
```

Get your API key: <https://jules.google.com/settings#api> (max 3 keys)

---

## Complete Endpoint Reference

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1alpha/sessions` | Create a new session |
| `GET` | `/v1alpha/sessions` | List all sessions (pageSize: 1-100, default 30) |
| `GET` | `/v1alpha/sessions/{id}` | Get a specific session |
| `POST` | `/v1alpha/sessions/{id}:approvePlan` | Approve a session's plan |
| `POST` | `/v1alpha/sessions/{id}:sendMessage` | Send feedback to session |

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1alpha/sessions/{id}/activities` | List session activities (pageSize: 1-100, default 50) |
| `GET` | `/v1alpha/sessions/{id}/activities/{activityId}` | Get specific activity |

### Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1alpha/sources` | List connected sources (supports `filter` param) |
| `GET` | `/v1alpha/sources/github/{owner}/{repo}` | Get specific source |

---

## Session States

```
QUEUED → PLANNING → AWAITING_PLAN_APPROVAL → IN_PROGRESS → COMPLETED
                                    ↓                           ↓
                         AWAITING_USER_FEEDBACK              FAILED
```

| State | Description |
|-------|-------------|
| `QUEUED` | Session is queued for processing |
| `PLANNING` | Agent is creating a plan |
| `AWAITING_PLAN_APPROVAL` | Waiting for plan approval (if `requirePlanApproval: true`) |
| `IN_PROGRESS` | Agent is working on the task |
| `AWAITING_USER_FEEDBACK` | Agent needs user input to continue |
| `PAUSED` | Session is paused |
| `COMPLETED` | Session finished successfully |
| `FAILED` | Session failed (check `sessionFailed.reason` in activities) |

---

## Activity Types Summary

| Type | Originator | Description |
|------|------------|-------------|
| `agentMessaged` | agent | Agent posted a message |
| `userMessaged` | user | User sent feedback via sendMessage |
| `planGenerated` | agent | Agent created a work plan |
| `planApproved` | user | User approved the plan |
| `progressUpdated` | agent | Agent reports progress |
| `sessionCompleted` | agent | Work finished successfully |
| `sessionFailed` | agent | Work failed (includes `reason`) |

---

## Artifact Types Summary

| Type | Description |
|------|-------------|
| `changeSet` | Git patches with `unidiffPatch`, `baseCommitId`, `suggestedCommitMessage` |
| `media` | Base64-encoded images/videos with `mimeType` |
| `bashOutput` | Command execution with `command`, `output`, `exitCode` |

---

## Pagination Defaults

| Endpoint | Default | Max |
|----------|---------|-----|
| `sessions.list` | 30 | 100 |
| `activities.list` | 50 | 100 |
| `sources.list` | 30 | 100 |

---

## For Opencode Integration

See [PROJECT_BLUEPRINT.md](../PROJECT_BLUEPRINT.md) and [RESEARCH_ASYNC_CLOUD_AGENTS.md](../RESEARCH_ASYNC_CLOUD_AGENTS.md) for how these APIs fit into the async cloud agents architecture.

### Key Integration Points

1. **Create Session** → Use `automationMode: "AUTO_CREATE_PR"` for async PR creation
2. **Poll Status** → GET session every 30s, check `state` field
3. **Send Feedback** → Use `:sendMessage` endpoint when state is `AWAITING_USER_FEEDBACK`
4. **Get Results** → Check `outputs[].pullRequest.url` when state is `COMPLETED`

---

## Official Documentation Links

### Main Pages

| Resource | URL |
|----------|-----|
| **Jules API Home** | <https://developers.google.com/jules/api> |
| **REST API Reference** | <https://developers.google.com/jules/api/reference/rest> |
| **API Key Settings** | <https://jules.google.com/settings#api> |
| **Jules Web App** | <https://jules.google.com> |

### Sessions Resource

| Endpoint | Documentation URL |
|----------|-------------------|
| Sessions Overview | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions> |
| `sessions.create` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions/create> |
| `sessions.get` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions/get> |
| `sessions.list` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions/list> |
| `sessions.approvePlan` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions/approvePlan> |
| `sessions.sendMessage` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions/sendMessage> |

### Activities Resource

| Endpoint | Documentation URL |
|----------|-------------------|
| Activities Overview | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions.activities> |
| `activities.get` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions.activities/get> |
| `activities.list` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sessions.activities/list> |

### Sources Resource

| Endpoint | Documentation URL |
|----------|-------------------|
| Sources Overview | <https://developers.google.com/jules/api/reference/rest/v1alpha/sources> |
| `sources.get` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sources/get> |
| `sources.list` | <https://developers.google.com/jules/api/reference/rest/v1alpha/sources/list> |

### Related Resources

| Resource | URL |
|----------|-----|
| Install Jules GitHub App | <https://jules.google.com/docs> |
| Google Cloud Console | <https://console.cloud.google.com> |
| AIP-160 (Filter Syntax) | <https://google.aip.dev/160> |
| gRPC Transcoding | <https://google.aip.dev/127> |
| Protobuf Timestamp | <https://protobuf.dev/reference/protobuf/google.protobuf/#timestamp> |
2
