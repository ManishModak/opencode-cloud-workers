import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// Every remote worker provider must implement this interface.
// ═══════════════════════════════════════════════════════════════════════════

export interface RemoteWorkerProvider {
    /** Provider identifier (e.g., "jules", "codex") */
    readonly name: string;

    /** Provider version for debugging */
    readonly version: string;

    // ─────────────────────────────────────────────────────────────────────────
    // LIFECYCLE METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a new remote session.
     * Returns immediately after session is queued.
     */
    createSession(params: CreateSessionParams): Promise<CreateSessionResult>;

    /**
     * Get current session state and metadata.
     * Used for polling.
     */
    getSession(sessionId: string): Promise<SessionState>;

    /**
     * Cancel a running session.
     * May not be supported by all providers.
     */
    cancelSession?(sessionId: string): Promise<void>;

    // ─────────────────────────────────────────────────────────────────────────
    // INTERACTION METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Send feedback to an active session.
     * Typically used when review finds issues.
     */
    sendFeedback(sessionId: string, message: string): Promise<void>;

    /**
     * Approve plan (for providers that require explicit approval).
     */
    approvePlan?(sessionId: string): Promise<void>;

    // ─────────────────────────────────────────────────────────────────────────
    // OUTPUT METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get artifacts from a completed session.
     * May include patch, PR URL, commit message.
     */
    getArtifacts(sessionId: string): Promise<SessionArtifacts>;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateSessionParams {
    /** Repository in "owner/repo" format */
    repo: string;

    /** Branch to work from (defaults to main/master) */
    branch?: string;

    /** Task description / prompt */
    prompt: string;

    /** Title for the session / PR */
    title?: string;

    /** Whether to auto-create PR (provider-specific) */
    autoCreatePR?: boolean;

    /** Whether to require plan approval before execution */
    requirePlanApproval?: boolean;
}

export interface CreateSessionResult {
    sessionId: string;
    status: SessionStatus;
    /** URL to view session in provider's console */
    consoleUrl?: string;
}

export type SessionStatus =
    | "queued"
    | "planning"
    | "awaiting_plan_approval"
    | "in_progress"
    | "awaiting_feedback"
    | "completed"
    | "failed"
    | "cancelled"
    | "paused";

export interface SessionState {
    sessionId: string;
    status: SessionStatus;

    /** Human-readable status message */
    statusMessage?: string;

    /** Provider-specific state details */
    details?: Record<string, unknown>;

    /** Error message if status is "failed" */
    error?: {
        code: string;
        message: string;
    };

    /** Timestamps */
    createdAt: Date;
    updatedAt: Date;
}

export interface SessionArtifacts {
    /** Unified diff patch (preferred for review) */
    patch?: UnifiedPatch;

    /** PR URL (if auto-created) */
    prUrl?: string;

    /** Suggested commit message */
    commitMessage?: string;

    /** Human-readable summary of changes */
    changesSummary?: string;

    /** Base commit this patch applies to */
    baseCommitId?: string;
}

export interface UnifiedPatch {
    /** The raw unified diff content */
    content: string;

    /** Files modified */
    filesChanged: string[];

    /** Stats */
    additions: number;
    deletions: number;
}
