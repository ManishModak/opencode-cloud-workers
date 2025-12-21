// ═══════════════════════════════════════════════════════════════════════════
// JULES API TYPES
// Based on Google Jules API v1alpha
// ═══════════════════════════════════════════════════════════════════════════

export type JulesState =
    | "STATE_UNSPECIFIED"
    | "QUEUED"
    | "PLANNING"
    | "AWAITING_PLAN_APPROVAL"
    | "AWAITING_USER_FEEDBACK"
    | "IN_PROGRESS"
    | "PAUSED"
    | "FAILED"
    | "COMPLETED";

export type AutomationMode =
    | "AUTOMATION_MODE_UNSPECIFIED"
    | "AUTO_CREATE_PR";

export interface JulesSession {
    name: string;      // Format: sessions/{session}
    id: string;        // The UUID part
    prompt: string;
    sourceContext: JulesSourceContext;
    title?: string;
    requirePlanApproval?: boolean;
    automationMode?: AutomationMode;
    createTime: string; // ISO Timestamp
    updateTime: string; // ISO Timestamp
    state: JulesState;
    url?: string;       // Console URL
    outputs?: JulesSessionOutput[];
}

export interface JulesSessionOutput {
    pullRequest?: {
        url: string;
        title: string;
        description: string;
    };
}

export interface JulesSourceContext {
    source: string; // Format: sources/{source}
    githubRepoContext?: {
        startingBranch: string;
    };
}

export interface JulesSource {
    name: string; // sources/github/owner/repo
    displayName?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// ACTIVITIES (Used for fetching patches)
// ─────────────────────────────────────────────────────────────────────────

export interface JulesActivity {
    name: string;
    createTime: string;
    type: string; // e.g., "CHANGE_SET_CREATED", "PLAN_CREATED"

    // Depending on type, one of these will be populated:
    changeSet?: JulesChangeSet;
    plan?: JulesPlan;
}

export interface JulesChangeSet {
    gitPatch?: {
        unidiffPatch: string; // The raw diff we need for review
    };
    filesChanged?: string[];
}

export interface JulesPlan {
    steps: {
        description: string;
        state: string;
    }[];
}

export interface JulesActivitiesResponse {
    activities: JulesActivity[];
    nextPageToken?: string;
}

export interface JulesListSessionsResponse {
    sessions: JulesSession[];
    nextPageToken?: string;
}

export interface JulesSourcesResponse {
    sources: JulesSource[];
    nextPageToken?: string;
}
