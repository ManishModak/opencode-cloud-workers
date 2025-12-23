# Jules API Overview

> **Source:** <https://developers.google.com/jules/api>  
> **Service:** `jules.googleapis.com`  
> **Base URL:** `https://jules.googleapis.com`

> [!WARNING]
> **Alpha Release:** The Jules API is in an alpha release, which means it is **experimental**. Be aware that specifications, API keys, and definitions may change as Google works toward stabilization. In the future, Google plans to maintain at least one stable and one experimental version.

## Introduction

The Jules API lets you programmatically access Jules's capabilities to automate and enhance your software development lifecycle.

**Use Cases:**

- Create custom workflows
- Automate tasks like bug fixing and code reviews
- Embed Jules's intelligence directly into tools you use every day:
  - **Slack** - Trigger Jules from chat commands
  - **Linear** - Auto-assign coding tasks from issues
  - **GitHub** - Integrate with webhooks and Actions

---

## Authentication

### Generate Your API Key

In the Jules web app, go to the [Settings](https://jules.google.com/settings#api) page to create a new API key. You can have at most **3 API keys** at a time.

### Use Your API Key

To authenticate your requests, pass the API key in the `X-Goog-Api-Key` header:

```
X-Goog-Api-Key: YOUR_API_KEY
```

> **⚠️ Important:** Keep your API keys secure. Don't share them or embed them in public code. Any API keys found to be publicly exposed will be automatically disabled.

---

## REST Resources

| Resource | Description |
|----------|-------------|
| `v1alpha/sessions` | Manage coding sessions |
| `v1alpha/sessions.activities` | Track session activities |
| `v1alpha/sources` | List connected repositories |

---

## Quick Reference: Endpoints

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1alpha/sessions` | Create a new session |
| `GET` | `/v1alpha/sessions` | List all sessions |
| `GET` | `/v1alpha/{name=sessions/*}` | Get a specific session |
| `POST` | `/v1alpha/{session=sessions/*}:approvePlan` | Approve a session's plan |
| `POST` | `/v1alpha/{session=sessions/*}:sendMessage` | Send feedback to session |

### Activities

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1alpha/{parent=sessions/*}/activities` | List session activities |
| `GET` | `/v1alpha/{name=sessions/*/activities/*}` | Get specific activity |

### Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1alpha/sources` | List connected sources |
| `GET` | `/v1alpha/{name=sources/**}` | Get specific source |
