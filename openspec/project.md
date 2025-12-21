# Project Context

## Purpose

**OpenCode Cloud Workers** is a plugin that enables "Local Strategy, Remote Execution" for OpenCode. It allows developers to delegate heavy, long-running, or complex coding tasks to asynchronous cloud agents (Cloud Workers), specifically **Google Jules**. The plugin handles the lifecycle of these remote sessions: creating them, polling for status, performing local AI reviews of the generated code, and orchestrating feedback or merges.

## Tech Stack

- **Language**: TypeScript (Strict Mode)
- **Runtime & Manager**: [Bun](https://bun.sh)
- **Framework**: `@opencode-ai/plugin`
- **Configuration**: `opencode.json` (workspace level)
- **Key Libraries**:
  - `zod`: Runtime schema validation for tools.
  - `octokit`: GitHub API client for merge automation.
  - `uuid`: Unique session identifiers.
- **Testing**: `vitest`

## Project Conventions

### Directory Structure

- `src/tools`: OpenCode tool definitions (`start`, `status`, `list`, `merge`, `feedback`).
- `src/providers`: backend implementations for cloud workers (currently `jules`).
- `src/core`: Shared interfaces and abstract base classes.
- `src/config`: Configuration loading logic (`opencode.json` handling).
- `src/utils`: Helper functions.

### Code Style

- Use **TypeScript** for all source code.
- Prefer **functional patterns** where appropriate, but use **Classes** for stateful components (Providers, Managers).
- **Async/Await** for all asynchronous operations.
- Explicit type definitions for all public interfaces.

### Architecture Patterns

- **Provider Pattern**: Core logic abstracts specific backends via `RemoteWorkerProvider`. Currently implements `JulesProvider`.
- **Background Loop**: `CloudWorkerLoop` runs in the background to poll remote session states without blocking the UI.
- **Tool-Driven**: Primary interaction is via OpenCode tools:
  - `cloud_worker_start`: Initiate a new session.
  - `cloud_worker_status`: Check status of a specific session.
  - `cloud_worker_list`: List active sessions.
  - `cloud_worker_feedback`: Send user/reviewer feedback to the worker.
  - `cloud_worker_merge`: Merge the worker's changes (via PR or patch).
- **Persistence**: Local session state is persisted in `.opencode/cloud-workers/state.json`.

### Testing Strategy

- Unit tests for core logic (`session-manager`, `state-machine`).
- Mock providers for integration testing the orchestration loop.

### Git Workflow

- Feature branches merged into `main`.
- **Bun.lock** is tracked in git to ensure reproducible builds.
- `.opencode/` directory (local state) is ignored.

## Domain Context

- **Cloud Worker**: An async remote agent (e.g., Jules) capable of reading a repo, planning, and executing code changes.
- **Session**: A single unit of delegated work, identified by a UUID.
- **Patch/Artifact**: The code changes produced by the worker, typically a git patch or a Pull Request.
- **Oracle**: The local host AI that acts as a reviewer for the remote worker.

## Important Constraints

- **Secrets**: API Keys (`Jules`, `GitHub`) must strictly be loaded from environment variables or `opencode.json` (for non-sensitive config).
- **Configuration**: `default_provider` is likely "jules".
- **Polling**: Must respect rate limits and handle network failures gracefully during polling.
- **Sandboxing**: Remote workers operate in their own sandbox; they do not touch the local file system directly until a merge occurs.

## External Dependencies

- **Google Jules API**: Primary backend for executing tasks.
- **GitHub API**: Used for merging Pull Requests created by workers.
