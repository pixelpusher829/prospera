import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { seedDemoData } from "./demo";

export const MIN_PASSWORD_LENGTH = 8;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		Password({
			profile(params) {
				const email = String(params.email ?? "")
					.trim()
					.toLowerCase();
				if (!/^\S+@\S+\.\S+$/.test(email)) {
					throw new ConvexError("Enter a valid email address.");
				}
				const name = String(params.name ?? "").trim() || email.split("@")[0];
				return { email, name };
			},
			validatePasswordRequirements(password) {
				if (password.length < MIN_PASSWORD_LENGTH) {
					throw new ConvexError(
						`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
					);
				}
			},
		}),
		// Portfolio visitors land in their own throwaway guest workspace.
		Anonymous<DataModel>({
			profile: () => ({ isAnonymous: true, name: "Guest" }),
		}),
	],
	callbacks: {
		async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, provider }) {
			if (provider.id === "anonymous" && existingUserId === null) {
				await seedDemoData(ctx as unknown as MutationCtx, userId);
			}
		},
	},
});
