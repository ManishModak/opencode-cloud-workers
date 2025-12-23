# Session Resource

> REST Resource: `v1alpha/sessions`

A session is a contiguous amount of work within the same context.

---

## Session Object

```json
{
  "name": "string",
  "id": "string",
  "prompt": "string",
  "sourceContext": { SourceContext },
  "title": "string",
  "requirePlanApproval": "boolean",
  "automationMode": "AutomationMode",
  "createTime": "string (Timestamp)",
  "updateTime": "string (Timestamp)",
  "state": "State",
  "url": "string",
  "outputs": [ { SessionOutput } ]
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Output only. Full resource name (e.g., "sessions/{session}") |
| `id` | string | Output only. The session ID |
| `prompt` | string | **Required.** The prompt to start the session with |
| `sourceContext` | SourceContext | **Required.** The source to use in this session |
| `title` | string | Optional. System generates one if not provided |
| `requirePlanApproval` | boolean | Optional. If true, plans require explicit approval |
| `automationMode` | AutomationMode | Optional. The automation mode of the session |
| `createTime` | Timestamp | Output only. When the session was created |
| `updateTime` | Timestamp | Output only. When the session was last updated |
| `state` | State | Output only. Current state of the session |
| `url` | string | Output only. URL to view session in Jules web app |
| `outputs` | SessionOutput[] | Output only. The outputs of the session |

---

## SourceContext

Context for how to use a source in a session.

```json
{
  "source": "string",
  "githubRepoContext": { GitHubRepoContext }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | **Required.** Source name (Format: `sources/{source}`) |
| `githubRepoContext` | GitHubRepoContext | Context for GitHub repo |

---

## GitHubRepoContext

```json
{
  "startingBranch": "string"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `startingBranch` | string | **Required.** Branch name to start the session from |

---

## AutomationMode

| Value | Description |
|-------|-------------|
| `AUTOMATION_MODE_UNSPECIFIED` | Default (no auto PR) |
| `AUTO_CREATE_PR` | Automatically create a PR when work is complete |

---

## State

| Value | Description |
|-------|-------------|
| `STATE_UNSPECIFIED` | Unknown state |
| `QUEUED` | Session is queued |
| `PLANNING` | Agent is creating a plan |
| `AWAITING_PLAN_APPROVAL` | Waiting for plan approval |
| `AWAITING_USER_FEEDBACK` | Waiting for user input |
| `IN_PROGRESS` | Work is in progress |
| `PAUSED` | Session is paused |
| `FAILED` | Session failed |
| `COMPLETED` | Session completed successfully |

---

## SessionOutput

```json
{
  "pullRequest": { PullRequest }
}
```

---

## PullRequest

```json
{
  "url": "string",
  "title": "string",
  "description": "string"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | The URL of the pull request |
| `title` | string | The title of the pull request |
| `description` | string | The description of the pull request |
