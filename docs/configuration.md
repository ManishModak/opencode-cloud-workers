# Configuration Guide

The OpenCode Cloud Workers plugin is highly configurable to suit different workflows and providers.

## Configuration File

Settings are stored in the `cloud_workers` section of your `opencode.json` or `.opencode/cloud-workers.json`.

## Full Config Schema

The configuration follows this schema:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default_provider` | `string` | `"jules"` | The provider to use when none is specified. |
| `providers` | `object` | `{}` | A map of provider-specific configurations. |
| `poll_interval_ms` | `number` | `60000` | How often to poll the remote session status (in ms). Min: 10000, Max: 300000. |
| `max_wait_ms` | `number` | `21600000` | Maximum time to wait for a session to complete (default 6 hours). |
| `auto_review` | `boolean` | `true` | Whether to automatically trigger a local AI review when a session completes. |
| `reviewer_agent` | `string` | `"oracle"` | The local agent to use for performing code reviews. |
| `max_review_rounds`| `number` | `2` | Maximum number of automated feedback rounds before requiring human intervention. |
| `auto_approve_plan`| `boolean` | `false` | Whether to automatically approve the worker's execution plan (if the provider requires it). |
| `notify_on_complete` | `boolean` | `true` | Whether to inject a notification when a task completes. |
| `auto_trigger_review` | `boolean` | `true` | Whether to auto-start review when task completes (if session is open). |
| `instruct_openspec` | `boolean` | `true` | Whether to instruct the cloud worker to use OpenSpec for change tracking. |
| `merge_method` | `string` | `"squash"` | Method to use for merging (`merge`, `squash`, or `rebase`). |

### Provider Settings

Each provider in the `providers` object can have the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `api_key_env` | `string` | `"JULES_API_KEY"`| The name of the environment variable containing the API key. |
| `base_url` | `string` | Provider Default | The base URL for the provider's API. |
| `api_version` | `string` | Provider Default | The API version to use. |

## Environment Variables

The plugin relies on environment variables for sensitive credentials:

- `JULES_API_KEY`: Required for the Jules provider.
- `GITHUB_TOKEN`: Required for merge automation and certain GitHub-specific provider features.

## Example Configurations

### Default (Jules with Auto-Review)

```json
{
  "cloud_workers": {
    "default_provider": "jules",
    "providers": {
      "jules": {
        "api_key_env": "JULES_API_KEY"
      }
    },
    "auto_review": true
  }
}
```

### High-Automation Workflow

Automatically approves plans and triggers reviews with extended feedback rounds.

```json
{
  "cloud_workers": {
    "auto_approve_plan": true,
    "auto_review": true,
    "auto_trigger_review": true,
    "max_review_rounds": 3,
    "instruct_openspec": true,
    "merge_method": "squash"
  }
}
```

### Manual Control Workflow

Disables auto-review for maximum human oversight. Human must trigger review manually.

```json
{
  "cloud_workers": {
    "auto_review": false,
    "auto_trigger_review": false,
    "notify_on_complete": true
  }
}
```

### Slow Polling (Resource Conservation)

For long-running tasks where you don't need frequent updates.

```json
{
  "cloud_workers": {
    "poll_interval_ms": 300000
  }
}
```
