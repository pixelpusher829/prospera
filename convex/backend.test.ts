// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/!(*.*.*)*.*s");

async function setup() {
	const t = convexTest(schema, modules);
	const makeUser = async (fields: {
		email?: string;
		isAnonymous?: boolean;
	}) => {
		const userId = await t.run((ctx) =>
			ctx.db.insert("users", { name: "Test", ...fields }),
		);
		return { userId, as: t.withIdentity({ subject: `${userId}|session` }) };
	};
	const alice = await makeUser({ email: "alice@example.com" });
	const bob = await makeUser({ email: "bob@example.com" });
	return { t, alice, bob, makeUser };
}

const tx = (accountId?: Id<"accounts">) => ({
	date: "2026-03-01",
	payee: "Grocer",
	category: "Food",
	amount: 25,
	type: "expense" as const,
	status: "cleared" as const,
	accountId,
});

const checking = {
	name: "Checking",
	type: "Debit" as const,
	balance: 100,
	institution: "Bank",
	mask: "1234-5678",
};

describe("auth", () => {
	it("rejects anonymous callers", async () => {
		const { t } = await setup();
		await expect(t.query(api.transactions.list, {})).rejects.toThrow(
			/signed in/,
		);
	});
});

describe("transactions", () => {
	it("keeps the linked account balance in step", async () => {
		const { alice } = await setup();
		const acct = await alice.as.mutation(api.accounts.create, checking);
		const balance = async () =>
			(await alice.as.query(api.accounts.list, {}))[0].balance;

		const id = await alice.as.mutation(api.transactions.create, tx(acct));
		expect(await balance()).toBe(75);

		await alice.as.mutation(api.transactions.update, {
			id,
			...tx(acct),
			type: "income",
			amount: 10,
		});
		expect(await balance()).toBe(110);

		await alice.as.mutation(api.transactions.remove, { id });
		expect(await balance()).toBe(100);
	});

	it("moves money between accounts when the account changes", async () => {
		const { alice } = await setup();
		const a = await alice.as.mutation(api.accounts.create, checking);
		const b = await alice.as.mutation(api.accounts.create, {
			...checking,
			name: "Savings",
		});
		const id = await alice.as.mutation(api.transactions.create, tx(a));
		await alice.as.mutation(api.transactions.update, { id, ...tx(b) });
		const balances = Object.fromEntries(
			(await alice.as.query(api.accounts.list, {})).map((x) => [
				x.name,
				x.balance,
			]),
		);
		expect(balances).toEqual({ Checking: 100, Savings: 75 });
	});

	it("only adjusts balances on bulk import when asked", async () => {
		const { alice } = await setup();
		const acct = await alice.as.mutation(api.accounts.create, checking);
		await alice.as.mutation(api.transactions.bulkCreate, {
			items: [tx(acct), tx(acct)],
			adjustBalances: false,
		});
		expect((await alice.as.query(api.accounts.list, {}))[0].balance).toBe(100);
		await alice.as.mutation(api.transactions.bulkCreate, {
			items: [tx(acct)],
			adjustBalances: true,
		});
		expect((await alice.as.query(api.accounts.list, {}))[0].balance).toBe(75);
		expect(await alice.as.query(api.transactions.list, {})).toHaveLength(3);
	});

	it("validates input", async () => {
		const { alice } = await setup();
		await expect(
			alice.as.mutation(api.transactions.create, { ...tx(), amount: -5 }),
		).rejects.toThrow(/negative/);
		await expect(
			alice.as.mutation(api.transactions.create, {
				...tx(),
				date: "03/01/2026",
			}),
		).rejects.toThrow(/valid date/);
		await expect(
			alice.as.mutation(api.transactions.create, { ...tx(), payee: "   " }),
		).rejects.toThrow(/Payee is required/);
	});
});

describe("isolation between users", () => {
	it("hides and protects other users' data", async () => {
		const { alice, bob } = await setup();
		const acct = await alice.as.mutation(api.accounts.create, checking);
		const id = await alice.as.mutation(api.transactions.create, tx(acct));

		expect(await bob.as.query(api.transactions.list, {})).toEqual([]);
		expect(await bob.as.query(api.accounts.list, {})).toEqual([]);

		await expect(
			bob.as.mutation(api.transactions.update, { id, ...tx(), amount: 1 }),
		).rejects.toThrow(/no longer exists/);
		await expect(
			bob.as.mutation(api.transactions.remove, { id }),
		).rejects.toThrow();
		await expect(
			bob.as.mutation(api.transactions.bulkRemove, { ids: [id] }),
		).rejects.toThrow();
		// Bob can't link his transaction to Alice's account either.
		await expect(
			bob.as.mutation(api.transactions.create, tx(acct)),
		).rejects.toThrow();
		await expect(
			bob.as.mutation(api.accounts.remove, { id: acct }),
		).rejects.toThrow();

		expect(await alice.as.query(api.transactions.list, {})).toHaveLength(1);
		expect((await alice.as.query(api.accounts.list, {}))[0].balance).toBe(75);
	});
});

describe("accounts", () => {
	it("stores only the last four digits", async () => {
		const { alice } = await setup();
		await alice.as.mutation(api.accounts.create, {
			...checking,
			mask: "4111 1111 1111 9876",
		});
		expect((await alice.as.query(api.accounts.list, {}))[0].mask).toBe("9876");
	});

	it("unlinks transactions when an account is deleted", async () => {
		const { alice } = await setup();
		const acct = await alice.as.mutation(api.accounts.create, checking);
		await alice.as.mutation(api.transactions.create, tx(acct));
		expect(await alice.as.mutation(api.accounts.remove, { id: acct })).toBe(1);
		const [t] = await alice.as.query(api.transactions.list, {});
		expect(t.accountId).toBeUndefined();
	});
});

describe("budgets", () => {
	it("replaces the budget and rejects duplicate names", async () => {
		const { alice } = await setup();
		const row = { name: "Food", limit: 200, color: "#10b981", icon: "cart" };
		await alice.as.mutation(api.budgets.saveAll, { categories: [row] });
		const [food] = await alice.as.query(api.budgets.list, {});
		await alice.as.mutation(api.budgets.saveAll, {
			categories: [
				{ ...row, id: food._id, limit: 250 },
				{ ...row, name: "Fun" },
			],
		});
		expect(
			(await alice.as.query(api.budgets.list, {})).map((b) => [
				b.name,
				b.limit,
			]),
		).toEqual([
			["Food", 250],
			["Fun", 200],
		]);
		await expect(
			alice.as.mutation(api.budgets.saveAll, {
				categories: [row, { ...row, name: "food" }],
			}),
		).rejects.toThrow(/listed twice/);
	});
});

describe("demo data and workspace", () => {
	it("loads only into an empty workspace and can be reset", async () => {
		const { alice } = await setup();
		await alice.as.mutation(api.demo.load, {});
		const txs = await alice.as.query(api.transactions.list, {});
		expect(txs.length).toBeGreaterThan(40);
		expect((await alice.as.query(api.accounts.list, {})).length).toBe(8);
		await expect(alice.as.mutation(api.demo.load, {})).rejects.toThrow(
			/empty workspace/,
		);

		await alice.as.mutation(api.users.resetWorkspace, {});
		expect(await alice.as.query(api.transactions.list, {})).toEqual([]);
		expect(await alice.as.query(api.users.viewer, {})).toMatchObject({
			email: "alice@example.com",
		});
	});
});

describe("account deletion", () => {
	it("requires the email and removes everything", async () => {
		const { t, alice } = await setup();
		await alice.as.mutation(api.demo.load, {});
		await expect(
			alice.as.mutation(api.users.deleteAccount, { confirmEmail: "nope" }),
		).rejects.toThrow(/email/);
		await alice.as.mutation(api.users.deleteAccount, {
			confirmEmail: "Alice@Example.com",
		});
		const left = await t.run(async (ctx) => ({
			users: await ctx.db.get(alice.userId),
			txs: (await ctx.db.query("transactions").collect()).length,
		}));
		expect(left).toEqual({ users: null, txs: 0 });
	});

	it("never deletes the guest account", async () => {
		const { makeUser } = await setup();
		const guest = await makeUser({ isAnonymous: true });
		expect(await guest.as.query(api.users.viewer, {})).toMatchObject({
			isGuest: true,
		});
		await expect(
			guest.as.mutation(api.users.deleteAccount, { confirmEmail: "" }),
		).rejects.toThrow(/guest account can't be deleted/);
	});
});

describe("guest cleanup", () => {
	it("removes guests older than a week and keeps everyone else", async () => {
		const { t, alice, makeUser } = await setup();
		const guest = await makeUser({ isAnonymous: true });
		await guest.as.mutation(api.demo.load, {});
		await alice.as.mutation(api.transactions.create, tx());

		// Nothing is old enough yet.
		expect(await t.mutation(internal.users.cleanupGuests, {})).toBe(0);

		const realNow = Date.now;
		Date.now = () => realNow() + 8 * 24 * 60 * 60 * 1000;
		try {
			expect(await t.mutation(internal.users.cleanupGuests, {})).toBe(1);
		} finally {
			Date.now = realNow;
		}
		const remaining = await t.run(async (ctx) => ({
			guest: await ctx.db.get(guest.userId),
			alice: await ctx.db.get(alice.userId),
			txs: (await ctx.db.query("transactions").collect()).length,
		}));
		expect(remaining.guest).toBeNull();
		expect(remaining.alice).not.toBeNull();
		expect(remaining.txs).toBe(1);
	});
});

describe("guest upgrade", () => {
	it("moves a guest workspace into a new account exactly once", async () => {
		const { t, makeUser } = await setup();
		const guest = await makeUser({ isAnonymous: true });
		await guest.as.mutation(api.demo.load, {});
		const guestTxs = (await guest.as.query(api.transactions.list, {})).length;
		const token = await guest.as.mutation(api.users.createGuestClaim, {});

		const fresh = await makeUser({ email: "new@example.com" });
		expect(
			await fresh.as.mutation(api.users.claimGuestWorkspace, { token }),
		).toEqual({ moved: true });
		expect(await fresh.as.query(api.transactions.list, {})).toHaveLength(
			guestTxs,
		);
		expect(await t.run((ctx) => ctx.db.get(guest.userId))).toBeNull();

		// Tokens are single use.
		expect(
			await fresh.as.mutation(api.users.claimGuestWorkspace, { token }),
		).toEqual({ moved: false });
	});

	it("won't merge demo data into an account that already has data", async () => {
		const { alice, makeUser } = await setup();
		const guest = await makeUser({ isAnonymous: true });
		await guest.as.mutation(api.demo.load, {});
		const token = await guest.as.mutation(api.users.createGuestClaim, {});
		await alice.as.mutation(api.transactions.create, tx());
		expect(
			await alice.as.mutation(api.users.claimGuestWorkspace, { token }),
		).toEqual({ moved: false });
		expect(await alice.as.query(api.transactions.list, {})).toHaveLength(1);
		await expect(
			alice.as.mutation(api.users.createGuestClaim, {}),
		).rejects.toThrow(/Only guests/);
	});
});
