import {
	ArrowDownLeft,
	ArrowRight,
	ArrowUpRight,
	Plus,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/shared/components/Button";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { Sparkline } from "@/shared/components/ui/Sparkline";
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
import { BRAND_GRADIENT } from "@/shared/lib/tints";
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

function Stat({
	to,
	label,
	value,
	children,
}: {
	to: string;
	label: string;
	value: string;
	children?: React.ReactNode;
}) {
	return (
		<Link
			to={to}
			className="group flex flex-col justify-between gap-3 p-5 transition-colors hover:bg-zinc-50 sm:p-6 dark:hover:bg-zinc-800/40"
		>
			<span className="flex items-center justify-between text-sm font-medium text-zinc-500 dark:text-zinc-400">
				{label}
				<ArrowRight
					size={14}
					className="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100"
				/>
			</span>
			<div>
				<p className="truncate font-display text-2xl font-bold tracking-tight text-zinc-950 tabular-nums dark:text-white">
					{value}
				</p>
				{children}
			</div>
		</Link>
	);
}

function Progress({
	value,
	color = BRAND_GRADIENT,
	over,
}: {
	value: number;
	color?: string;
	over?: boolean;
}) {
	return (
		<div
			className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
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
			history: history.map((p) => p.value),
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

			<section
				aria-label="Net worth"
				className="grid gap-6 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-end lg:gap-12"
			>
				<div>
					<Link
						to="/wallet"
						className="eyebrow inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white"
					>
						Net worth <ArrowRight size={14} />
					</Link>
					<p className="hero-figure mt-3 truncate">
						{format(summary.netWorth)}
					</p>
					<p className="mt-4 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
						<span
							className={cn(
								"inline-flex items-center gap-1 font-semibold",
								stats.netWorthDelta >= 0
									? "text-emerald-700 dark:text-emerald-400"
									: "text-red-600 dark:text-red-400",
							)}
						>
							{stats.netWorthDelta >= 0 ? (
								<TrendingUp size={15} />
							) : (
								<TrendingDown size={15} />
							)}
							{format(stats.netWorthDelta, { sign: true })}
						</span>
						in the last 30 days
					</p>
				</div>
				<Sparkline
					values={stats.history}
					brand
					className="h-20 sm:h-28"
					label="Net worth over the last 30 days"
				/>
			</section>

			<div className="card grid divide-y divide-zinc-200/70 overflow-hidden sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-zinc-800">
				<Stat
					to="/analytics"
					label="Spent this month"
					value={format(summary.month.expense)}
				>
					<p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
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
				</Stat>
				<Stat
					to="/budget"
					label="Budget left"
					value={budgets.length ? format(budget.remaining) : "No budget"}
				>
					{budgets.length ? (
						<>
							<Progress value={budget.pct} over={budget.remaining < 0} />
							<p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
								{budget.pct}% of {format(budget.totalLimit, { whole: true })}{" "}
								used
							</p>
						</>
					) : (
						<p className="mt-2 text-xs font-medium text-zinc-900 underline-offset-4 group-hover:underline dark:text-white">
							Set one up →
						</p>
					)}
				</Stat>
				<Stat
					to="/goals"
					label={topGoal ? "Next goal" : "Goals"}
					value={topGoal ? topGoal.goal.name : "No active goals"}
				>
					{topGoal ? (
						<>
							<Progress value={topGoal.pct} color="bg-emerald-500" />
							<p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
								{topGoal.pct}% · {format(topGoal.remaining, { whole: true })} to
								go
							</p>
						</>
					) : (
						<p className="mt-2 text-xs font-medium text-zinc-900 underline-offset-4 group-hover:underline dark:text-white">
							Create one →
						</p>
					)}
				</Stat>
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
						<p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
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
										className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
									>
										<TypeIcon type={t.type} />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium text-zinc-900 dark:text-white">
												{t.payee}
											</span>
											<span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
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
								<p className="mt-1 truncate text-lg font-semibold text-zinc-900 tabular-nums dark:text-white">
									{format(summary.month.income)}
								</p>
							</div>
							<div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800">
								<p className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
									<ArrowUpRight size={14} /> Spending
								</p>
								<p className="mt-1 truncate text-lg font-semibold text-zinc-900 tabular-nums dark:text-white">
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
											className="w-1/2 max-w-3 rounded-t bg-zinc-300 dark:bg-zinc-600"
											style={{ height: `${(m.expense / maxBar) * 100}%` }}
											title={`${m.label} spending ${format(m.expense)}`}
										/>
									</div>
									<span className="text-[11px] text-zinc-400">{m.label}</span>
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
