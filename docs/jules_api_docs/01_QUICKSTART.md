# Jules API Quickstart

> Your first API call walkthrough

---

## Step 1: List Your Available Sources

First, find the name of the source (GitHub repo) you want to work with:

```bash
curl 'https://jules.googleapis.com/v1alpha/sources' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

**Response:**

```json
{
  "sources": [
    {
      "name": "sources/github/bobalover/boba",
      "id": "github/bobalover/boba",
      "githubRepo": {
        "owner": "bobalover",
        "repo": "boba"
      }
    }
  ],
  "nextPageToken": "github/bobalover/boba-web"
}
```

---

## Step 2: Create a New Session

Create a session with auto PR creation:

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions' \
  -X POST \
  -H "Content-Type: application/json" \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -d '{
    "prompt": "Create a boba app!",
    "sourceContext": {
      "source": "sources/github/bobalover/boba",
      "githubRepoContext": {
        "startingBranch": "main"
      }
    },
    "automationMode": "AUTO_CREATE_PR",
    "title": "Boba App"
  }'
```

**Response:**

```json
{
  "name": "sessions/31415926535897932384",
  "id": "31415926535897932384",
  "title": "Boba App",
  "sourceContext": {
    "source": "sources/github/bobalover/boba",
    "githubRepoContext": {
      "startingBranch": "main"
    }
  },
  "prompt": "Create a boba app!"
}
```

> **Note:** The `automationMode` field is optional. By default, no PR will be automatically created.

---

## Step 3: List Sessions

Check your sessions:

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions?pageSize=5' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

---

## Step 4: Approve Plan

If your session requires explicit plan approval:

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions/SESSION_ID:approvePlan' \
  -X POST \
  -H "Content-Type: application/json" \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

> **Note:** By default, sessions created through the API have plans auto-approved. Set `requirePlanApproval: true` in create request to require explicit approval.

---

## Step 5: Interact with the Agent

### List Activities

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions/SESSION_ID/activities?pageSize=30' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

### Send a Message (Feedback)

```bash
curl 'https://jules.googleapis.com/v1alpha/sessions/SESSION_ID:sendMessage' \
  -X POST \
  -H "Content-Type: application/json" \
  -H 'X-Goog-Api-Key: YOUR_API_KEY' \
  -d '{
    "prompt": "Can you make the app corgi themed?"
  }'
```

---

## Completed Session Example

When a session completes with `AUTO_CREATE_PR`, the response includes the PR:

```json
{
  "name": "sessions/31415926535897932384",
  "id": "31415926535897932384",
  "title": "Boba App",
  "sourceContext": {
    "source": "sources/github/bobalover/boba",
    "githubRepoContext": {
      "startingBranch": "main"
    }
  },
  "prompt": "Create a boba app!",
  "outputs": [
    {
      "pullRequest": {
        "url": "https://github.com/bobalover/boba/pull/35",
        "title": "Create a boba app",
        "description": "This change adds the initial implementation of a boba app."
      }
    }
  ]
}
```
