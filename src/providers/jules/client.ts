import {
    JulesSession,
    JulesActivitiesResponse,
    JulesListSessionsResponse,
    JulesSourcesResponse,
    AutomationMode,
} from "./types";

export interface JulesClientConfig {
    apiKey: string;
    baseUrl: string; // Defaults to https://jules.googleapis.com
    apiVersion: string; // Defaults to v1alpha
}

export class JulesAPIError extends Error {
    constructor(
        public statusCode: number,
        public responseBody: string
    ) {
        super(`Jules API error (${statusCode}): ${responseBody}`);
        this.name = "JulesAPIError";
    }
}

export class JulesClient {
    private readonly baseUrl: string;

    constructor(private config: JulesClientConfig) {
        // Ensure no trailing slash
        const cleanBase = config.baseUrl.replace(/\/$/, "");
        this.baseUrl = `${cleanBase}/${config.apiVersion}`;
    }

    /**
     * Helper for making typed HTTP requests
     */
    private async request<T>(
        method: "GET" | "POST",
        path: string,
        body?: unknown
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;

        //console.log(`[JulesClient] ${method} ${url}`);

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.config.apiKey,
        };

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new JulesAPIError(response.status, errorText);
            }

            // Handle empty responses (e.g. 204 No Content for sendMessage)
            const text = await response.text();
            return text ? JSON.parse(text) : ({} as T);

        } catch (error) {
            if (error instanceof JulesAPIError) throw error;
            throw new Error(`Network error calling Jules API: ${error}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SESSION METHODS
    // ─────────────────────────────────────────────────────────────────────────

    async createSession(params: {
        prompt: string;
        sourceName: string; // sources/github/owner/repo
        startingBranch: string;
        title?: string;
        requirePlanApproval?: boolean;
        automationMode?: AutomationMode;
    }): Promise<JulesSession> {

        return this.request<JulesSession>("POST", "/sessions", {
            prompt: params.prompt,
            sourceContext: {
                source: params.sourceName,
                githubRepoContext: {
                    startingBranch: params.startingBranch,
                },
            },
            title: params.title,
            requirePlanApproval: params.requirePlanApproval ?? false,
            automationMode: params.automationMode ?? "AUTO_CREATE_PR",
        });
    }

    async getSession(sessionId: string): Promise<JulesSession> {
        // Ensure we are using the full resource name or just ID?
        // The API usually takes "sessions/{id}".
        // We assume the caller passes the bare ID, so we prefix it.
        // If the caller passes "sessions/...", we handle that too.
        const resourceName = sessionId.startsWith("sessions/")
            ? sessionId
            : `sessions/${sessionId}`;

        return this.request<JulesSession>("GET", `/${resourceName}`);
    }

    async listSessions(pageSize = 20, pageToken?: string): Promise<JulesListSessionsResponse> {
        const query = new URLSearchParams();
        query.append("pageSize", pageSize.toString());
        if (pageToken) query.append("pageToken", pageToken);

        return this.request<JulesListSessionsResponse>("GET", `/sessions?${query.toString()}`);
    }

    async approvePlan(sessionId: string): Promise<void> {
        const resourceName = sessionId.startsWith("sessions/")
            ? sessionId
            : `sessions/${sessionId}`;

        await this.request("POST", `/${resourceName}:approvePlan`, {});
    }

    async sendMessage(sessionId: string, message: string): Promise<void> {
        const resourceName = sessionId.startsWith("sessions/")
            ? sessionId
            : `sessions/${sessionId}`;

        await this.request("POST", `/${resourceName}:sendMessage`, {
            prompt: message, // API field is "prompt", confusingly
        });
    }

    async cancelSession(sessionId: string): Promise<void> {
        // There isn't a direct "cancel" in the public docs, but sometimes "delete" works 
        // or status update. For now, we'll try DELETE if supported, or throw unimplemented.
        // Based on docs, no Cancel/Delete is explicitly listed typically for alpha.
        // We will leave this placeholder.
        throw new Error("Cancel session not yet supported by Jules API v1alpha");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTIVITY & ARTIFACT METHODS
    // ─────────────────────────────────────────────────────────────────────────

    async getActivities(sessionId: string): Promise<JulesActivitiesResponse> {
        const resourceName = sessionId.startsWith("sessions/")
            ? sessionId
            : `sessions/${sessionId}`;

        return this.request<JulesActivitiesResponse>("GET", `/${resourceName}/activities`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOURCE DISCOVERY
    // ─────────────────────────────────────────────────────────────────────────

    async listSources(): Promise<JulesSourcesResponse> {
        return this.request<JulesSourcesResponse>("GET", "/sources");
    }
}
