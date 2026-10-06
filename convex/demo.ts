import { ConvexError, v } from "convex/values";
import {
	addDays,
	monthKey,
	shiftMonth,
	todayIso,
} from "../src/shared/lib/finance";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";
import { requireUserId } from "./lib";

/** Small deterministic PRNG so demo data looks the same every time. */
function mulberry32(seed: number) {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const BUDGETS = [
	{ name: "Housing", limit: 1800, color: "#3b82f6", icon: "home" },
	{ name: "Groceries", limit: 600, color: "#10b981", icon: "cart" },
	{ name: "Dining Out", limit: 300, color: "#8b5cf6", icon: "coffee" },
	{ name: "Transportation", limit: 250, color: "#f59e0b", icon: "car" },
	{ name: "Utilities", limit: 250, color: "#06b6d4", icon: "zap" },
	{ name: "Shopping", limit: 400, color: "#ec4899", icon: "bag" },
	{ name: "Health", limit: 150, color: "#ef4444", icon: "heart" },
	{ name: "Subscriptions", limit: 60, color: "#6366f1", icon: "tv" },
];

const CLIENTS = [
	["Avery Collins", "avery@techflow.io", "TechFlow", "Active", 12500, 2],
	["Jordan Lee", "jordan@buildit.co", "BuildIt", "Active", 8400, 0],
	["Sam Rivera", "sam@design.io", "Design.io", "Pending", 0, 7],
	["Morgan Patel", "morgan@corpnet.net", "CorpNet", "Inactive", 54000, 35],
	["Riley Chen", "riley@startups.inc", "Startups Inc", "Active", 22000, 3],
	["Casey Wilson", "casey@fasttrack.co", "FastTrack", "Pending", 4500, 14],
	[
		"Taylor Brooks",
		"taylor@creative.studio",
		"Creative Studio",
		"Active",
		18900,
		1,
	],
	[
		"Quinn Anderson",
		"quinn@techsolutions.com",
		"Tech Solutions",
		"Inactive",
		1200,
		90,
	],
] as const;

export const load = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const userId = await requireUserId(ctx);
		const [anyAccount, anyTransaction] = await Promise.all([
			ctx.db
				.query("accounts")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.first(),
			ctx.db
				.query("transactions")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.first(),
		]);
		if (anyAccount || anyTransaction) {
			throw new ConvexError(
				"Demo data can only be loaded into an empty workspace. Reset your workspace in Settings first.",
			);
		}
		await seedDemoData(ctx, userId);
		return null;
	},
});

/** Fills a workspace with ~4 months of realistic sample data ending today. */
export async function seedDemoData(ctx: MutationCtx, userId: Id<"users">) {
	const today = todayIso();
	const year2 = String((Number(today.slice(2, 4)) + 3) % 100).padStart(2, "0");

	const account = (fields: {
		name: string;
		type: "Cash" | "Debit" | "Savings" | "Credit" | "Investment" | "Loan";
		balance: number;
		institution: string;
		mask?: string;
		expiry?: string;
		colorTheme?: string;
		investmentCategory?: string;
	}) => ctx.db.insert("accounts", { userId, ...fields });

	const checking = await account({
		name: "Everyday Checking",
		type: "Debit",
		balance: 4250.5,
		institution: "Chase",
		mask: "4521",
	});
	const card = await account({
		name: "Amex Gold",
		type: "Credit",
		balance: -1250,
		institution: "American Express",
		mask: "1007",
		expiry: `09/${year2}`,
		colorTheme: "from-amber-500 to-amber-700",
	});
	await account({
		name: "Sapphire Preferred",
		type: "Credit",
		balance: -450.2,
		institution: "Chase",
		mask: "8842",
		expiry: `12/${year2}`,
		colorTheme: "from-blue-700 to-blue-950",
	});
	await account({
		name: "Emergency Fund",
		type: "Savings",
		balance: 15000,
		institution: "Ally",
		mask: "9922",
	});
	await account({
		name: "Cash Wallet",
		type: "Cash",
		balance: 240,
		institution: "",
	});
	await account({
		name: "Total Market ETF",
		type: "Investment",
		balance: 45200,
		institution: "Vanguard",
		investmentCategory: "stocks",
	});
	await account({
		name: "Bitcoin",
		type: "Investment",
		balance: 12500,
		institution: "Coinbase",
		investmentCategory: "crypto",
	});
	await account({
		name: "Car Loan",
		type: "Loan",
		balance: -12000,
		institution: "Toyota Financial",
	});

	for (const budget of BUDGETS) {
		await ctx.db.insert("budgetCategories", { userId, ...budget });
	}

	// Four months of history, ending today.
	const rand = mulberry32(42);
	const pick = <T>(items: readonly T[]) =>
		items[Math.floor(rand() * items.length)];
	const amount = (min: number, max: number) =>
		Math.round((min + rand() * (max - min)) * 100) / 100;

	type Tx = {
		date: string;
		payee: string;
		category: string;
		amount: number;
		type: "income" | "expense";
		accountId: Id<"accounts">;
	};
	const txs: Tx[] = [];
	const add = (tx: Tx) => {
		if (tx.date <= today) txs.push(tx);
	};

	const thisMonth = monthKey(today);
	for (let m = -3; m <= 0; m++) {
		const month = shiftMonth(thisMonth, m);
		const day = (d: number) => `${month}-${String(d).padStart(2, "0")}`;

		add({
			date: day(1),
			payee: "Maple Street Apartments",
			category: "Housing",
			amount: 1800,
			type: "expense",
			accountId: checking,
		});
		add({
			date: day(1),
			payee: "Acme Corp Payroll",
			category: "Salary",
			amount: 3200,
			type: "income",
			accountId: checking,
		});
		add({
			date: day(15),
			payee: "Acme Corp Payroll",
			category: "Salary",
			amount: 3200,
			type: "income",
			accountId: checking,
		});
		add({
			date: day(5),
			payee: "City Power & Light",
			category: "Utilities",
			amount: amount(90, 140),
			type: "expense",
			accountId: checking,
		});
		add({
			date: day(8),
			payee: "Comcast Internet",
			category: "Utilities",
			amount: 80,
			type: "expense",
			accountId: checking,
		});
		add({
			date: day(3),
			payee: "Netflix",
			category: "Subscriptions",
			amount: 15.49,
			type: "expense",
			accountId: card,
		});
		add({
			date: day(11),
			payee: "Spotify",
			category: "Subscriptions",
			amount: 11.99,
			type: "expense",
			accountId: card,
		});
		add({
			date: day(20),
			payee: "Car Loan Payment",
			category: "Transportation",
			amount: 320,
			type: "expense",
			accountId: checking,
		});
		if (rand() > 0.35) {
			add({
				date: day(12 + Math.floor(rand() * 10)),
				payee: pick(["Upwork", "Freelance Client", "Contract Invoice"]),
				category: "Freelance",
				amount: amount(400, 1600),
				type: "income",
				accountId: checking,
			});
		}
		for (let w = 0; w < 4; w++) {
			add({
				date: day(2 + w * 7),
				payee: pick(["Whole Foods", "Trader Joe's", "Safeway", "Costco"]),
				category: "Groceries",
				amount: amount(45, 160),
				type: "expense",
				accountId: card,
			});
			add({
				date: day(4 + w * 7),
				payee: pick([
					"Blue Bottle Coffee",
					"Chipotle",
					"Sushi Den",
					"Pizza Place",
					"Starbucks",
				]),
				category: "Dining Out",
				amount: amount(6, 58),
				type: "expense",
				accountId: card,
			});
			if (rand() > 0.4) {
				add({
					date: day(6 + w * 6),
					payee: pick(["Shell", "Chevron", "Uber", "Lyft"]),
					category: "Transportation",
					amount: amount(12, 55),
					type: "expense",
					accountId: card,
				});
			}
		}
		if (rand() > 0.3) {
			add({
				date: day(9 + Math.floor(rand() * 15)),
				payee: pick(["Amazon", "Target", "IKEA", "Uniqlo"]),
				category: "Shopping",
				amount: amount(25, 220),
				type: "expense",
				accountId: card,
			});
		}
		if (rand() > 0.6) {
			add({
				date: day(10 + Math.floor(rand() * 12)),
				payee: pick(["CVS Pharmacy", "City Dental", "Gym Membership"]),
				category: "Health",
				amount: amount(20, 120),
				type: "expense",
				accountId: card,
			});
		}
	}

	for (const tx of txs) {
		// Recent card spending is still pending.
		const status =
			tx.date >= addDays(today, -2) && tx.accountId === card
				? "pending"
				: "cleared";
		await ctx.db.insert("transactions", { userId, status, ...tx });
	}

	const goal = (
		name: string,
		targetAmount: number,
		currentAmount: number,
		months: number,
		icon: string,
		color: string,
	) =>
		ctx.db.insert("goals", {
			userId,
			name,
			targetAmount,
			currentAmount,
			deadline: `${shiftMonth(thisMonth, months)}-28`,
			icon,
			color,
		});
	await goal("New Car", 25000, 8500, 14, "car", "#8b5cf6");
	await goal("Europe Trip", 5000, 3200, 5, "plane", "#ec4899");
	await goal("New Laptop", 2500, 2500, 1, "laptop", "#10b981");

	for (const [name, email, company, status, revenue, daysAgo] of CLIENTS) {
		await ctx.db.insert("clients", {
			userId,
			name,
			email,
			company,
			status,
			revenue,
			lastContact: addDays(today, -daysAgo),
		});
	}
}
