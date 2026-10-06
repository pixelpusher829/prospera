import { ConvexError } from "convex/values";

/** Turns anything thrown by Convex or the network into a sentence for a toast. */
export function errorMessage(error: unknown): string {
	if (error instanceof ConvexError) {
		return typeof error.data === "string"
			? error.data
			: "Something went wrong. Please try again.";
	}
	if (error instanceof Error) {
		if (/InvalidSecret|InvalidAccountId/.test(error.message)) {
			return "That email and password don't match.";
		}
		if (/TooManyFailedAttempts/.test(error.message)) {
			return "Too many attempts. Wait a few minutes and try again.";
		}
		if (/already exists/i.test(error.message)) {
			return "An account with that email already exists. Try signing in.";
		}
		if (/fetch|network/i.test(error.message)) {
			return "Can't reach the server. Check your connection.";
		}
	}
	return "Something went wrong. Please try again.";
}
