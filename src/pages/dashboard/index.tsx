import {
	ArrowDownLeft,
	ArrowRight,
	ArrowUpRight,
	Plus,
	Target,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/shared/components/Button";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import {
	type Transaction,
	useAccounts,
	useBudgets,
	useGoals,
	useMoney,
	useTransactions,
	useViewer,
} from "@/shared/hooks/data";
import { useTransactionActions } from "@/shared/hooks/transactions";
import { useAlerts } from "@/shared/hooks/useAlerts";
import Header from "@/shared/layout/Header";
import { AlertList } from "@/shared/layout/Topbar";
import { cn } from "@/shared/lib/cn";
import {
	budgetProgress,
	goalProgress,
	monthKey,
	monthlySeries,
	netWorthHistory,
	summarize,
	todayIso,
} from "@/shared/lib/finance";
import { formatPercent } from "@/shared/lib/money";
import TransactionModal from "../transactions/TransactionModal";
import {
	Amount,
	formatDate,
	TypeIcon,
} from "../transactions/TransactionsTable";
import { Onboarding } from "./Onboarding";

function greeting() {
	const hour = new Date().getHours();
	if (hour < 5) return "Good evening";
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

function Tile({
	to,
	label,
	value,
	icon: Icon,
	children,
	tone = "default",
}: {
	to: string;
	label: string;
	value: string;
	icon: typeof Wallet;
	children?: React.ReactNode;
	tone?: "default" | "dark";
}) {
	return (
		<Link
			to={to}
			className={cn(
				"group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl p-5 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg",
				tone === "dark"
					? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-linear-to-br dark:from-violet-600/30 dark:to-slate-900 dark:ring-1 dark:ring-violet-500/20"
					: "card hover:shadow-slate-200/60 dark:hover:shadow-black/30",
			)}
		>
			{tone === "dark" && (
				<div className="absolute -top-10 -right-10 size-40 rounded-full bg-brand-pink/20 blur-2xl" />
			)}
			<div className="relative flex items-center justify-between">
				<span
					className={cn(
						"text-sm font-medium",
						tone === "dark"
							? "text-slate-300"
							: "text-slate-500 dark:text-slate-400",
					)}
				>
					{label}
				</span>
				<Icon
					size={18}
					className={
						tone === "dark"
							? "text-slate-400"
							: "text-slate-400 dark:text-slate-500"
					}
				/>
			</div>
			<div className="relative">
				<p
					className={cn(
						"truncate text-2xl font-bold tracking-tight tabular-nums",
						tone === "dark" ? "text-white" : "text-slate-900 dark:text-white",
					)}
				>
					{value}
				</p>
				{children}
			</div>
		</Link>
	);
}

function Progress({
	value,
	color = "bg-violet-500",
	over,
}: {
	value: number;
	color?: string;
	over?: boolean;
}) {
	return (
		<div
			className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
			aria-hidden
		>
			<div
				className={cn(
					"h-full rounded-full transition-[width] duration-700",
					over ? "bg-red-500" : color,
				)}
				style={{ width: `${Math.min(100, Math.max(2, value))}%` }}
			/>
		</div>
	);
}

export default function Dashboard() {
	const { data: viewer } = useViewer();
	const { data: transactions } = useTransactions();
	const { data: accounts } = useAccounts();
	const { data: budgets } = useBudgets();
	const { data: goals } = useGoals();
	const alerts = useAlerts();
	const { format } = useMoney();
	const { removeWithUndo } = useTransactionActions();
	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<Transaction | null>(null);

	const today = todayIso();
	const stats = useMemo(() => {
		if (!transactions || !accounts || !budgets || !goals) return null;
		const summary = summarize(transactions, accounts, today);
		const history = netWorthHistory(transactions, accounts, 31, today);
		const monthAgo = history[0]?.value ?? summary.netWorth;
		const budget = budgetProgress(budgets, transactions, monthKey(today));
		const topGoal = goals
			.map((g) => ({ goal: g, ...goalProgress(g, today) }))
			.filter((g) => !g.isComplete)
			.sort((a, b) => a.goal.deadline.localeCompare(b.goal.deadline))[0];
		return {
			summary,
			netWorthDelta: summary.netWorth - monthAgo,
			budget,
			topGoal,
			series: monthlySeries(transactions, 6, today),
		};
	}, [transactions, accounts, budgets, goals, today]);

	if (!viewer || !transactions || !accounts || !budgets || !goals || !stats) {
		return <PageSkeleton tiles={4} />;
	}

	const firstName = viewer.name.split(" ")[0] || "there";
	const { summary, budget, topGoal, series } = stats;
	const showOnboarding =
		!viewer.settings.onboardingDismissed &&
		!(accounts.length && transactions.length && budgets.length && goals.length);
	const maxBar = Math.max(1, ...series.flatMap((m) => [m.income, m.expense]));

	const openNew = () => {
		setEditing(null);
		setModalOpen(true);
	};

	return (
		<div className="page">
			<Header
				title="Dashboard"
				heading={`${greeting()}, ${firstName}`}
				subheading="Here's where your money stands today."
			>
				<Button icon={<Plus size={16} />} onClick={openNew}>
					Add transaction
				</Button>
			</Header>

			{showOnboarding && (
				<Onboarding
					name={firstName}
					hasAccounts={accounts.length > 0}
					hasTransactions={transactions.length > 0}
					hasBudget={budgets.length > 0}
					hasGoals={goals.length > 0}
				/>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Tile
					to="/wallet"
					label="Net worth"
					value={format(summary.netWorth)}
					icon={Wallet}
					tone="dark"
				>
					<p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-xs text-slate-200">
						{stats.netWorthDelta >= 0 ? (
							<TrendingUp size={14} className="text-emerald-400" />
						) : (
							<TrendingDown size={14} className="text-red-400" />
						)}
						{format(stats.netWorthDelta, { sign: true })} in 30 days
					</p>
				</Tile>
				<Tile
					to="/analytics"
					label="Spent this month"
					value={format(summary.month.expense)}
					icon={ArrowUpRight}
				>
					<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
						{summary.expenseChange === null ? (
							"Nothing to compare with last month yet"
						) : (
							<>
								<span
									className={cn(
										"font-semibold",
										summary.expenseChange > 0
											? "text-red-600 dark:text-red-400"
											: "text-emerald-600 dark:text-emerald-400",
									)}
								>
									{formatPercent(summary.expenseChange)}
								</span>{" "}
								vs same point last month
							</>
						)}
					</p>
				</Tile>
				<Tile
					to="/budget"
					label="Budget left"
					value={budgets.length ? format(budget.remaining) : "No budget"}
					icon={Wallet}
				>
					{budgets.length ? (
						<>
							<Progress value={budget.pct} over={budget.remaining < 0} />
							<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
								{budget.pct}% of {format(budget.totalLimit, { whole: true })}{" "}
								used
							</p>
						</>
					) : (
						<p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
							Set one up →
						</p>
					)}
				</Tile>
				<Tile
					to="/goals"
					label={topGoal ? "Next goal" : "Goals"}
					value={topGoal ? topGoal.goal.name : "No active goals"}
					icon={Target}
				>
					{topGoal ? (
						<>
							<Progress value={topGoal.pct} color="bg-emerald-500" />
							<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
								{topGoal.pct}% · {format(topGoal.remaining, { whole: true })} to
								go
							</p>
						</>
					) : (
						<p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
							Create one →
						</p>
					)}
				</Tile>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
				<Card className="xl:col-span-3">
					<CardHeader
						title="Recent transactions"
						action={
							<Link
								to="/transactions"
								className="link inline-flex items-center gap-1 text-sm"
							>
								View all <ArrowRight size={14} />
							</Link>
						}
					/>
					{transactions.length === 0 ? (
						<p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
							Transactions you add will show up here.
						</p>
					) : (
						<ul className="-mx-2 space-y-0.5">
							{transactions.slice(0, 6).map((t) => (
								<li key={t._id}>
									<button
										type="button"
										onClick={() => {
											setEditing(t);
											setModalOpen(true);
										}}
										className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<TypeIcon type={t.type} />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
												{t.payee}
											</span>
											<span className="block truncate text-xs text-slate-500 dark:text-slate-400">
												{formatDate(t.date)} · {t.category}
											</span>
										</span>
										<Amount
											transaction={t}
											format={format}
											className="text-sm"
										/>
									</button>
								</li>
							))}
						</ul>
					)}
				</Card>

				<div className="grid gap-4 xl:col-span-2">
					<Card>
						<CardHeader title="Cash flow" description="This month so far" />
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
								<p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
									<ArrowDownLeft size={14} /> Income
								</p>
								<p className="mt-1 truncate text-lg font-bold text-slate-900 tabular-nums dark:text-white">
									{format(summary.month.income)}
								</p>
							</div>
							<div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
								<p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
									<ArrowUpRight size={14} /> Spending
								</p>
								<p className="mt-1 truncate text-lg font-bold text-slate-900 tabular-nums dark:text-white">
									{format(summary.month.expense)}
								</p>
							</div>
						</div>
						<div
							className="mt-5 flex h-24 items-end gap-2"
							aria-label="Income and spending, last 6 months"
							role="img"
						>
							{series.map((m) => (
								<div
									key={m.key}
									className="flex flex-1 flex-col items-center gap-1.5"
								>
									<div className="flex h-20 w-full items-end justify-center gap-0.5">
										<div
											className="w-1/2 max-w-3 rounded-t bg-emerald-400 dark:bg-emerald-500"
											style={{ height: `${(m.income / maxBar) * 100}%` }}
											title={`${m.label} income ${format(m.income)}`}
										/>
										<div
											className="w-1/2 max-w-3 rounded-t bg-slate-300 dark:bg-slate-600"
											style={{ height: `${(m.expense / maxBar) * 100}%` }}
											title={`${m.label} spending ${format(m.expense)}`}
										/>
									</div>
									<span className="text-[11px] text-slate-400">{m.label}</span>
								</div>
							))}
						</div>
					</Card>
					<Card>
						<CardHeader title="Heads up" />
						<div className="-mx-2">
							<AlertList alerts={(alerts ?? []).slice(0, 4)} />
						</div>
					</Card>
				</div>
			</div>

			<TransactionModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				transaction={editing}
				onDelete={(t) => removeWithUndo([t])}
			/>
		</div>
	);
}
