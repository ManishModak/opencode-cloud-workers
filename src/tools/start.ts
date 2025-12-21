import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { RemoteWorkerProvider } from "../core/interfaces/provider";
import { SessionManager } from "../core/session-manager";
import { PluginInput } from "@opencode-ai/plugin";
import { TrackedSession } from "../core/interfaces/types";
import { v4 as uuidv4 } from "uuid"; // We need to add uuid dependency

export const createStartTool = (
    provider: RemoteWorkerProvider,
    sessionManager: SessionManager,
    ctx: PluginInput
) => {
    return tool({
        description: "Start a new cloud worker session (e.g. Jules) to perform a task asynchronously.",
        args: {
            prompt: z.string().describe("Detailed description of the task to perform"),
            title: z.string().optional().describe("Short title for the session/PR"),
            branch: z.string().optional().describe("Winning branch to start from (defaults to current)"),
            repo: z.string().optional().describe("Repository URL (defaults to current)"),
            auto_review: z.boolean().default(true).describe("Whether to enable automatic AI review loop"),
            require_plan: z.boolean().default(false).describe("Whether to require manual plan approval"),
        },
        execute: async (args) => {
            // 1. Resolve Context
            let repo = args.repo;
            if (!repo) {
                // ctx.project is typically the project ID/Name, but we might need the remote URL
                // Let's try to get it from git
                try {
                    const remote = await ctx.$`git config --get remote.origin.url`.text();
                    repo = remote.trim();
                } catch (e) {
                    throw new Error("Could not determine repository URL. Please provide 'repo' argument.");
                }
            }

            let branch = args.branch;
            if (!branch) {
                try {
                    const current = await ctx.$`git rev-parse --abbrev-ref HEAD`.text();
                    branch = current.trim();
                } catch (e) {
                    branch = "main"; // Fallback
                }
            }

            // 2. Create Session on Provider
            const result = await provider.createSession({
                prompt: args.prompt,
                repo: repo!,
                branch: branch,
                title: args.title,
                requirePlanApproval: args.require_plan,
                autoCreatePR: true, // Always true for now based on confirm_cost plan, can be config later
            });

            // 3. Track Session
            const session: TrackedSession = {
                id: uuidv4(), // Local ID
                provider: provider.name,
                remoteSessionId: result.sessionId,
                consoleUrl: result.consoleUrl,
                repo: repo!,
                branch: branch!,
                prompt: args.prompt,
                title: args.title,
                status: result.status,
                autoReview: args.auto_review,
                reviewRound: 0,
                maxReviewRounds: 3, // Default hardcoded for now
                autoMerge: false,   // Default false
                merged: false,
                watching: true,
                inFlight: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            sessionManager.addSession(session);

            return `Started cloud worker session!
ID: ${session.id}
Remote ID: ${session.remoteSessionId}
Status: ${session.status}
Console: ${session.consoleUrl || "N/A"}

I will poll for updates in the background.`;
        },
    });
};
