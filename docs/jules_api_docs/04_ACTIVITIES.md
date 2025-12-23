# Activities Resource (Complete)

> REST Resource: `v1alpha/sessions.activities`

An activity is a single unit of work within a session.

---

## Methods

### activities.list

Lists all activities in a session.

```
GET https://jules.googleapis.com/v1alpha/{parent=sessions/*}/activities
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `parent` | string | **Required.** Parent session that owns these activities. Format: `sessions/{session}` |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pageSize` | integer | 50 | Number of activities to return (1-100, **coerced if >100**) |
| `pageToken` | string | - | Token from previous `activities.list` call |

#### Request Body

Must be empty.

#### Response Body

```json
{
  "activities": [ { Activity } ],
  "nextPageToken": "string"
}
```

#### Example

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions/SESSION_ID/activities?pageSize=30' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

---

### activities.get

Gets a specific activity.

```
GET https://jules.googleapis.com/v1alpha/{name=sessions/*/activities/*}
```

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | **Required.** Activity resource name. Format: `sessions/{session}/activities/{activity}` |

#### Request Body

Must be empty.

#### Response Body

Returns an [Activity](#activity-object) object.

---

## Activity Object

```json
{
  "name": "string",
  "id": "string",
  "description": "string",
  "createTime": "string (Timestamp)",
  "originator": "string",
  "artifacts": [ { Artifact } ],
  
  // Union field - one of the following:
  "agentMessaged": { AgentMessaged },
  "userMessaged": { UserMessaged },
  "planGenerated": { PlanGenerated },
  "planApproved": { PlanApproved },
  "progressUpdated": { ProgressUpdated },
  "sessionCompleted": { SessionCompleted },
  "sessionFailed": { SessionFailed }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Resource name (`sessions/{session}/activities/{activity}`) |
| `id` | string | Activity ID |
| `description` | string | Description of this activity |
| `createTime` | Timestamp | When the activity was created (RFC 3339) |
| `originator` | string | Who created it: `"user"`, `"agent"`, or `"system"` |
| `artifacts` | Artifact[] | Data produced by this activity |

---

## Activity Types

### AgentMessaged

Agent posted a message.

```json
{
  "agentMessaged": {
    "agentMessage": "string"
  }
}
```

### UserMessaged

User posted a message (via sendMessage API).

```json
{
  "userMessaged": {
    "userMessage": "string"
  }
}
```

### PlanGenerated

Agent created a work plan.

```json
{
  "planGenerated": {
    "plan": {
      "id": "string",
      "steps": [ { PlanStep } ],
      "createTime": "string (Timestamp)"
    }
  }
}
```

### PlanStep

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "index": 0
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Step ID (unique within plan) |
| `title` | string | Step title |
| `description` | string | Step description |
| `index` | integer | 0-based index in plan.steps |

### PlanApproved

User approved a plan.

```json
{
  "planApproved": {
    "planId": "string"
  }
}
```

### ProgressUpdated

Agent reports progress.

```json
{
  "progressUpdated": {
    "title": "string",
    "description": "string"
  }
}
```

### SessionCompleted

Session finished successfully. **This type has no fields.**

```json
{
  "sessionCompleted": {}
}
```

### SessionFailed

Session failed with an error.

```json
{
  "sessionFailed": {
    "reason": "string"
  }
}
```

---

## Artifacts

Artifacts are data produced by an activity step.

```json
{
  // Union field - one of:
  "changeSet": { ChangeSet },
  "media": { Media },
  "bashOutput": { BashOutput }
}
```

### ChangeSet

Code changes to be applied.

```json
{
  "changeSet": {
    "source": "sources/github/owner/repo",
    "gitPatch": {
      "unidiffPatch": "string",
      "baseCommitId": "string",
      "suggestedCommitMessage": "string"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Source resource name |
| `gitPatch.unidiffPatch` | string | Patch in unified diff format |
| `gitPatch.baseCommitId` | string | Base commit to apply patch to |
| `gitPatch.suggestedCommitMessage` | string | Suggested commit message |

### Media

Images, videos, or other media files.

```json
{
  "media": {
    "data": "string (base64)",
    "mimeType": "string"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `data` | bytes (base64) | Media data (base64 encoded) |
| `mimeType` | string | MIME type (e.g., `image/png`) |

### BashOutput

Command execution results.

```json
{
  "bashOutput": {
    "command": "string",
    "output": "string",
    "exitCode": 0
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | The bash command executed |
| `output` | string | stdout + stderr combined |
| `exitCode` | integer | Exit code (0 = success) |

---

## Example: Full Activity Lifecycle

```json
[
  {
    "originator": "agent",
    "planGenerated": {
      "plan": {
        "id": "plan_123",
        "steps": [
          { "id": "step_1", "title": "Setup environment", "index": 0 },
          { "id": "step_2", "title": "Modify src/App.js", "index": 1 }
        ]
      }
    }
  },
  {
    "originator": "user",
    "planApproved": { "planId": "plan_123" }
  },
  {
    "originator": "agent",
    "progressUpdated": {
      "title": "Ran bash command",
      "description": "npm install"
    },
    "artifacts": [{
      "bashOutput": {
        "command": "npm install",
        "output": "added 1326 packages",
        "exitCode": 0
      }
    }]
  },
  {
    "originator": "agent",
    "sessionCompleted": {},
    "artifacts": [{
      "changeSet": {
        "source": "sources/github/owner/repo",
        "gitPatch": {
          "baseCommitId": "abc123",
          "suggestedCommitMessage": "feat: Add feature"
        }
      }
    }]
  }
]
```
