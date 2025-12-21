import { JulesState } from "./types";
import { SessionStatus } from "../../core/interfaces/provider";

export function mapJulesStatus(julesState: JulesState): SessionStatus {
    switch (julesState) {
        case "QUEUED":
            return "queued";
        case "PLANNING":
            return "planning";
        case "AWAITING_PLAN_APPROVAL":
            return "awaiting_plan_approval";
        case "IN_PROGRESS":
            return "in_progress";
        case "AWAITING_USER_FEEDBACK":
            return "awaiting_feedback";
        case "COMPLETED":
            return "completed";
        case "FAILED":
            return "failed";
        case "PAUSED":
            return "paused";
        default:
            return "in_progress"; // Default fallback
    }
}
