import { tool } from "@opencode-ai/plugin";
import { z } from "zod";
import { SessionManager } from "../core/session-manager";

export const createListTool = (sessionManager: SessionManager) => {
    return tool({
        description: "List all tracked cloud worker sessions.",
        args: {},
        execute: async () => {
            const sessions = sessionManager.listSessions();
            if (sessions.length === 0) {
                return "No cloud worker sessions found.";
            }

            // Sort by recency
            const sorted = [...sessions].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            const lines = sorted.map(s =>
                `- [${s.status.toUpperCase()}] ${s.id} (Remote: ${s.remoteSessionId})\n  "${s.prompt.slice(0, 50)}..."`
            );

            return `Found ${sessions.length} sessions:\n\n${lines.join("\n\n")}`;
        },
    });
};
