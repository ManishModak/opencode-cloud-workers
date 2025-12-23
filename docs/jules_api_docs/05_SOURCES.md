# Sources Resource (Complete)

> REST Resource: `v1alpha/sources`

A source is an input source of data for a session (currently GitHub repositories).

---

## Methods

### sources.list

Lists all connected sources.

```
GET https://jules.googleapis.com/v1alpha/sources
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `filter` | string | - | **AIP-160 filter expression.** Filter by name. Example: `name=sources/source1 OR name=sources/source2` |
| `pageSize` | integer | 30 | Number of sources to return (1-100, **coerced if >100**) |
| `pageToken` | string | - | Token from previous `sources.list` call |

#### Request Body

Must be empty.

#### Response Body

```json
{
  "sources": [ { Source } ],
  "nextPageToken": "string"
}
```

#### Example

```bash
# List all sources
curl 'https://jules.googleapis.com/v1alpha/sources' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'

# Filter by specific repos
curl 'https://jules.googleapis.com/v1alpha/sources?filter=name%3Dsources%2Fgithub%2Fowner%2Frepo1' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

---

### sources.get

Gets a specific source.

```
GET https://jules.googleapis.com/v1alpha/{name=sources/**}
```

> **Note:** Uses `sources/**` (double wildcard) to support nested paths like `sources/github/owner/repo`

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | **Required.** Source resource name. Format: `sources/{+source}` (e.g., `sources/github/owner/repo`) |

#### Request Body

Must be empty.

#### Response Body

Returns a [Source](#source-object) object.

#### Example

```bash
curl 'https://jules.googleapis.com/v1alpha/sources/github/owner/repo-name' \
  -H 'X-Goog-Api-Key: YOUR_API_KEY'
```

---

## Source Object

```json
{
  "name": "string",
  "id": "string",
  "githubRepo": { GitHubRepo }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full resource name (`sources/{source}`) |
| `id` | string | Source ID (same as `{source}` part of name) |
| `githubRepo` | GitHubRepo | GitHub repository details |

---

## GitHubRepo

```json
{
  "owner": "string",
  "repo": "string",
  "isPrivate": false,
  "defaultBranch": { GitHubBranch },
  "branches": [ { GitHubBranch } ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `owner` | string | Repo owner (the `<owner>` in `github.com/<owner>/<repo>`) |
| `repo` | string | Repo name (the `<repo>` in `github.com/<owner>/<repo>`) |
| `isPrivate` | boolean | Whether this repo is private |
| `defaultBranch` | GitHubBranch | The default branch for this repo |
| `branches` | GitHubBranch[] | List of active branches |

---

## GitHubBranch

```json
{
  "displayName": "string"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | The name of the branch (e.g., `main`, `develop`) |

---

## Full Response Example

```json
{
  "sources": [
    {
      "name": "sources/github/owner/repo-name",
      "id": "github/owner/repo-name",
      "githubRepo": {
        "owner": "owner",
        "repo": "repo-name",
        "isPrivate": false,
        "defaultBranch": {
          "displayName": "main"
        },
        "branches": [
          { "displayName": "main" },
          { "displayName": "develop" },
          { "displayName": "feature/new-feature" }
        ]
      }
    }
  ],
  "nextPageToken": "..."
}
```

---

## Prerequisites

Before using sources, you must [install the Jules GitHub app](https://jules.google.com/docs) on the repositories you want to work with.
