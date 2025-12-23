# Session Methods (Complete)

> REST Methods for `v1alpha/sessions`

---

## sessions.create

Creates a new Jules coding session.

### HTTP Request

```
POST https://jules.googleapis.com/v1alpha/sessions
```

### Request Body

Instance of [Session](./02_SESSION_RESOURCE.md) containing:

| Field | Required | Description |
|-------|----------|-------------|
| `prompt` | Yes | The task description |
| `sourceContext` | Yes | The repo and branch context |
| `title` | No | Session title (auto-generated if omitted) |
| `requirePlanApproval` | No | If true, requires explicit plan approval before work starts |
| `automationMode` | No | Set to `AUTO_CREATE_PR` for automatic PR creation |

### Response Body

Returns the created [Session](./02_SESSION_RESOURCE.md) object.

### Example

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions' \
  -X POST \
  -H "Content-Type: application/json" \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -d '{
    "prompt": "Fix the login bug",
    "sourceContext": {
      "source": "sources/github/owner/repo",
      "githubRepoContext": {
        "startingBranch": "main"
      }
    },
    "automationMode": "AUTO_CREATE_PR"
  }'
```

---

## sessions.get

Retrieves a specific session.

### HTTP Request

```
GET https://jules.googleapis.com/v1alpha/{name=sessions/*}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | **Required.** Session resource name (Format: `sessions/{session}`) |

### Request Body

Must be empty.

### Response Body

Returns a [Session](./02_SESSION_RESOURCE.md) object.

### Example

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions/SESSION_ID' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

---

## sessions.list

Lists all sessions.

### HTTP Request

```
GET https://jules.googleapis.com/v1alpha/sessions
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageSize` | integer | Optional. Number of sessions to return (1-100, default: 30, max: 100) |
| `pageToken` | string | Optional. Token from a previous `sessions.list` call |

### Request Body

Must be empty.

### Response Body

```json
{
  "sessions": [ { Session } ],
  "nextPageToken": "string"
}
```

| Field | Description |
|-------|-------------|
| `sessions` | Array of Session objects |
| `nextPageToken` | Token to retrieve next page (omitted if no more pages) |

### Example

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions?pageSize=10' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

---

## sessions.approvePlan

Approves the latest plan for a session.

### HTTP Request

```
POST https://jules.googleapis.com/v1alpha/{session=sessions/*}:approvePlan
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `session` | string | **Required.** Session resource name (Format: `sessions/{session}`) |

### Request Body

Must be empty.

### Response Body

Empty on success.

### Example

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions/SESSION_ID:approvePlan' \
  -X POST \
  -H "Content-Type: application/json" \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

---

## sessions.sendMessage

Sends a message/feedback to an active session.

### HTTP Request

```
POST https://jules.googleapis.com/v1alpha/{session=sessions/*}:sendMessage
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `session` | string | **Required.** Session resource name (Format: `sessions/{session}`) |

### Request Body

```json
{
  "prompt": "string"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `prompt` | Yes | The feedback/message to send to the agent |

### Response Body

Empty on success.

### Example

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions/SESSION_ID:sendMessage' \
  -X POST \
  -H "Content-Type: application/json" \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -d '{
    "prompt": "Fix the memory leak in line 45"
  }'
```

---

## Orchestration Patterns

### Basic Polling Pattern

```
1. Create session → Get session ID
2. Loop:
   - GET sessions/{id} to check state
   - If state == COMPLETED → Extract outputs[].pullRequest
   - If state == FAILED → Handle error
   - If state == AWAITING_USER_FEEDBACK → sendMessage
   - If state == AWAITING_PLAN_APPROVAL → approvePlan
   - Sleep 30s
```

### Feedback Loop Pattern (with Review)

```
1. Create session with requirePlanApproval: true
2. Poll until state == AWAITING_PLAN_APPROVAL
3. Review plan via activities.list
4. Call approvePlan (or sendMessage with changes)
5. Poll until state == COMPLETED
6. Review PR via outputs[].pullRequest.url
7. If issues found → sendMessage with feedback
8. Repeat until satisfied
```

### State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
QUEUED → PLANNING → AWAITING_PLAN_APPROVAL ────approvePlan───►│
                    │                                         │
                    │ (auto-approve if                        │
                    │  requirePlanApproval=false)             │
                    ▼                                         │
              IN_PROGRESS ◄───────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   COMPLETED               AWAITING_USER_FEEDBACK
        │                       │
        │                       │ sendMessage
        │                       │
        │                       ▼
        │                  IN_PROGRESS
        │                       │
        │           ┌───────────┴───────────┐
        │           │                       │
        │           ▼                       ▼
        │      COMPLETED                  FAILED
        │
        ▼
   outputs[].pullRequest.url
```
