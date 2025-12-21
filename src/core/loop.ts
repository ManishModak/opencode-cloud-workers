import { SessionManager } from "./session-manager";
import { RemoteWorkerProvider } from "./interfaces/provider";
import { PluginInput } from "@opencode-ai/plugin";

export class CloudWorkerLoop {
    private intervalId?: NodeJS.Timeout;
    private isPolling = false;

    constructor(
        private sessionManager: SessionManager,
        private provider: RemoteWorkerProvider,
        private ctx: PluginInput
    ) { }

    start(intervalMs = 30000) {
        if (this.intervalId) return;

        // Initial poll
        this.poll();

        // Start loop
        this.intervalId = setInterval(() => {
            this.poll();
        }, intervalMs);

        console.log("[CloudWorkerLoop] Started background polling.");
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            console.log("[CloudWorkerLoop] Stopped background polling.");
        }
    }

    private async poll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            const pendingSessions = this.sessionManager.getPendingSessions();
            if (pendingSessions.length === 0) return;

            for (const session of pendingSessions) {
                try {
                    // 1. Fetch Remote State
                    const remoteState = await this.provider.getSession(session.remoteSessionId);

                    // 2. Check for Changes
                    if (remoteState.status !== session.status) {
                        console.log(`[CloudWorkerLoop] Session ${session.id} changed: ${session.status} -> ${remoteState.status}`);

                        // Update Local State
                        this.sessionManager.updateSession(session.id, {
                            status: remoteState.status,
                            statusMessage: remoteState.statusMessage,
                            consoleUrl: remoteState.details?.url as string | undefined,
                            updatedAt: new Date().toISOString()
                        });

                        // Notify User
                        await this.notifyUser(
                            `Cloud Worker Update: ${remoteState.status}`,
                            `Session for "${session.prompt.slice(0, 30)}..." is now ${remoteState.status}.`,
                            remoteState.status === "completed" ? "success" : "info"
                        );

                        // Trigger Next Phase if Completed (Phase 2 Placeholder)
                        if (remoteState.status === "completed") {
                            // TODO: Trigger Review Loop
                            console.log(`[CloudWorkerLoop] Session ${session.id} completed. Ready for review.`);
                        }
                    }
                } catch (error) {
                    console.error(`[CloudWorkerLoop] Failed to poll session ${session.id}:`, error);
                }
            }
        } catch (error) {
            console.error("[CloudWorkerLoop] Global poll error:", error);
        } finally {
            this.isPolling = false;
        }
    }

    private async notifyUser(title: string, message: string, variant: "info" | "success" | "warning" | "error" = "info") {
        try {
            // Use TUI toast if available (undocumented API used by oh-my-opencode)
            const clientAny = this.ctx.client as any;
            if (clientAny.tui?.showToast) {
                await clientAny.tui.showToast({
                    body: {
                        title,
                        message,
                        variant,
                        duration: 5000
                    }
                });
            } else {
                // Fallback to console
                console.log(`[NOTIFICATION] ${title}: ${message}`);
            }
        } catch (e) {
            console.error("Failed to show notification:", e);
        }
    }
}
