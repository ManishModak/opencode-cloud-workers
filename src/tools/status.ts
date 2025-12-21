import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { RemoteWorkerProvider } from "../core/interfaces/provider";
import { SessionManager } from "../core/session-manager";

export const createStatusTool = (
    provider: RemoteWorkerProvider,
    sessionManager: SessionManager
) => {
    return tool({
        description: "Get the status of a specific cloud worker session.",
        args: {
            session_id: z.string().describe("The local session ID returned by start"),
        },
        execute: async (args) => {
            const session = sessionManager.getSession(args.session_id);
            if (!session) {
                throw new Error(`Session ${args.session_id} not found.`);
            }

            // Check for fresh state from provider
            // (Optimistic return if recently updated, but for tool call we force check)
            try {
                const remoteState = await provider.getSession(session.remoteSessionId);

                // Update local state
                sessionManager.updateSession(session.id, {
                    status: remoteState.status,
                    statusMessage: remoteState.statusMessage,
                    consoleUrl: remoteState.details?.url as string | undefined
                });

                // Re-fetch updated session
                const updated = sessionManager.getSession(args.session_id)!;

                return `Session Status: ${updated.status}
Remote ID: ${updated.remoteSessionId}
Created: ${updated.createdAt}
Updated: ${updated.updatedAt}
Message: ${updated.statusMessage || "N/A"}
Console: ${updated.consoleUrl || "N/A"}`;

            } catch (e) {
                return `Local Status: ${session.status}
(Failed to fetch remote status: ${e})`;
            }
        },
    });
};
