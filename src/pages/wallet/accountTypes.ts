import {
	Banknote,
	Bitcoin,
	Briefcase,
	Building2,
	CreditCard,
	Globe,
	Landmark,
	LineChart,
	type LucideIcon,
	PiggyBank,
	ShieldCheck,
	TrendingUp,
} from "lucide-react";
import type { Account } from "@/shared/hooks/data";

export type AccountType = Account["type"];

export const ACCOUNT_TYPES: {
	value: AccountType;
	label: string;
	icon: LucideIcon;
	liability?: boolean;
}[] = [
	{ value: "Debit", label: "Checking", icon: Landmark },
	{ value: "Savings", label: "Savings", icon: PiggyBank },
	{ value: "Cash", label: "Cash", icon: Banknote },
	{ value: "Credit", label: "Credit card", icon: CreditCard, liability: true },
	{ value: "Investment", label: "Investment", icon: TrendingUp },
	{ value: "Loan", label: "Loan", icon: ShieldCheck, liability: true },
];

export const typeInfo = (type: AccountType) =>
	ACCOUNT_TYPES.find((t) => t.value === type) ?? ACCOUNT_TYPES[0];

export const INVESTMENT_CATEGORIES: {
	value: string;
	label: string;
	icon: LucideIcon;
	tint: string;
}[] = [
	{
		value: "stocks",
		label: "Stocks & ETFs",
		icon: LineChart,
		tint: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
	},
	{
		value: "crypto",
		label: "Crypto",
		icon: Bitcoin,
		tint: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
	},
	{
		value: "retirement",
		label: "Retirement",
		icon: Briefcase,
		tint: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
	},
	{
		value: "real_estate",
		label: "Real estate",
		icon: Building2,
		tint: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
	},
	{
		value: "savings",
		label: "High-yield savings",
		icon: PiggyBank,
		tint: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
	},
	{
		value: "other",
		label: "Other",
		icon: Globe,
		tint: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
	},
];

export const investmentInfo = (value?: string) =>
	INVESTMENT_CATEGORIES.find((c) => c.value === value) ??
	INVESTMENT_CATEGORIES[INVESTMENT_CATEGORIES.length - 1];

export const CARD_THEMES = [
	{ value: "from-slate-700 to-slate-950", label: "Graphite" },
	{ value: "from-violet-600 to-indigo-800", label: "Violet" },
	{ value: "from-blue-700 to-blue-950", label: "Sapphire" },
	{ value: "from-amber-500 to-amber-700", label: "Gold" },
	{ value: "from-rose-500 to-pink-700", label: "Rose" },
	{ value: "from-emerald-600 to-teal-800", label: "Emerald" },
];

export const GROUPS = [
	{
		id: "banking",
		label: "Banking & cash",
		types: ["Debit", "Savings", "Cash"] as AccountType[],
		addType: "Debit" as AccountType,
	},
	{
		id: "cards",
		label: "Credit cards",
		types: ["Credit"] as AccountType[],
		addType: "Credit" as AccountType,
	},
	{
		id: "investments",
		label: "Investments",
		types: ["Investment"] as AccountType[],
		addType: "Investment" as AccountType,
	},
	{
		id: "loans",
		label: "Loans",
		types: ["Loan"] as AccountType[],
		addType: "Loan" as AccountType,
	},
];
