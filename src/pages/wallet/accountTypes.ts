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
		tint: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
	},
	{
		value: "crypto",
		label: "Crypto",
		icon: Bitcoin,
		tint: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10",
	},
	{
		value: "retirement",
		label: "Retirement",
		icon: Briefcase,
		tint: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",
	},
	{
		value: "real_estate",
		label: "Real estate",
		icon: Building2,
		tint: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
	},
	{
		value: "savings",
		label: "High-yield savings",
		icon: PiggyBank,
		tint: "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-500/10",
	},
	{
		value: "other",
		label: "Other",
		icon: Globe,
		tint: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
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
