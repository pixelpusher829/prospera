import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
	accountFields,
	budgetFields,
	clientFields,
	goalFields,
	settingsFields,
	transactionFields,
} from "./validators";

const owner = { userId: v.id("users") };

export default defineSchema({
	...authTables,

	// Convex Auth's users table plus an index for finding stale guests.
	users: defineTable({
		name: v.optional(v.string()),
		image: v.optional(v.string()),
		email: v.optional(v.string()),
		emailVerificationTime: v.optional(v.number()),
		phone: v.optional(v.string()),
		phoneVerificationTime: v.optional(v.number()),
		isAnonymous: v.optional(v.boolean()),
	})
		.index("email", ["email"])
		.index("phone", ["phone"])
		.index("by_anonymous", ["isAnonymous"]),

	accounts: defineTable({ ...owner, ...accountFields }).index("by_user", [
		"userId",
	]),

	transactions: defineTable({ ...owner, ...transactionFields })
		.index("by_user", ["userId"])
		.index("by_user_date", ["userId", "date"])
		.index("by_account", ["accountId"]),

	goals: defineTable({ ...owner, ...goalFields }).index("by_user", ["userId"]),

	budgetCategories: defineTable({ ...owner, ...budgetFields }).index(
		"by_user",
		["userId"],
	),

	clients: defineTable({ ...owner, ...clientFields }).index("by_user", [
		"userId",
	]),

	userSettings: defineTable({ ...owner, ...settingsFields }).index("by_user", [
		"userId",
	]),

	// One-time tokens that let a new account take over a guest workspace.
	guestClaims: defineTable({
		guestId: v.id("users"),
		token: v.string(),
		expiresAt: v.number(),
	}).index("by_token", ["token"]),

	aiInsights: defineTable({
		...owner,
		text: v.string(),
		createdAt: v.number(),
	}).index("by_user", ["userId"]),
});
