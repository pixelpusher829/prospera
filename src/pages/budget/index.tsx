import {
	AlertTriangle,
	PieChart,
	Plus,
	SlidersHorizontal,
	Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "@/shared/components/Button";
import { SelectField, SelectItem } from "@/shared/components/forms";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { useBudgets, useMoney, useTransactions } from "@/shared/hooks/data";
import Header from "@/shared/layout/Header";
import { cn } from "@/shared/lib/cn";
import {
	budgetProgress,
	monthKey,
	monthLabel,
	parseIsoDate,
	shiftMonth,
	spentByCategory,
	todayIso,
} from "@/shared/lib/finance";
import { BUDGET_ICONS, iconFor } from "@/shared/lib/icons";
import EditBudgetModal from "./EditBudgetModal";

export default function Budget() {
	const { data: budgets } = useBudgets();
	const { data: transactions } = useTransactions();
	const { format } = useMoney();
	const today = todayIso();
	const thisMonth = monthKey(today);
	const [month, setMonth] = useState(thisMonth);
	const [editOpen, setEditOpen] = useState(false);
	const [suggest, setSuggest] = useState(false);

	const progress = useMemo(
		() =>
			budgets && transactions
				? budgetProgress(budgets, transactions, month)
				: null,
		[budgets, transactions, month],
	);

	const unbudgeted = useMemo(() => {
		if (!budgets || !transactions) return [];
		const names = new Set(budgets.map((b) => b.name.trim().toLowerCase()));
		const labels = new Map(
			transactions.map((t) => [t.category.trim().toLowerCase(), t.category]),
		);
		return [...spentByCategory(transactions, month).entries()]
			.filter(([key]) => !names.has(key))
			.map(([key, spent]) => ({ name: labels.get(key) ?? key, spent }))
			.sort((a, b) => b.spent - a.spent);
	}, [budgets, transactions, month]);

	/** Average monthly spend per category over the 3 months before this one,
	 *  counting only months that have any spending (so new accounts aren't
	 *  dragged toward zero). */
	const averages = useMemo(() => {
		const out = new Map<string, number>();
		if (!transactions) return out;
		const months = [1, 2, 3]
			.map((i) => spentByCategory(transactions, shiftMonth(month, -i)))
			.filter((m) => m.size > 0);
		if (months.length === 0) return out;
		for (const m of months)
			for (const [key, v] of m) out.set(key, (out.get(key) ?? 0) + v);
		for (const [key, v] of out) out.set(key, v / months.length);
		return out;
	}, [transactions, month]);

	if (!budgets || !transactions || !progress) return <PageSkeleton tiles={2} />;

	const isCurrent = month === thisMonth;
	const daysInMonth = new Date(
		parseIsoDate(`${month}-01`).getFullYear(),
		parseIsoDate(`${month}-01`).getMonth() + 1,
		0,
	).getDate();
	const daysLeft = isCurrent
		? daysInMonth - parseIsoDate(today).getDate() + 1
		: 0;
	const perDay = daysLeft > 0 ? Math.max(0, progress.remaining) / daysLeft : 0;
	const monthOptions = Array.from({ length: 12 }, (_, i) =>
		shiftMonth(thisMonth, -i),
	);

	const openEditor = (withSuggestions: boolean) => {
		setSuggest(withSuggestions);
		setEditOpen(true);
	};

	return (
		<div className="page">
			<Header
				heading="Budget"
				subheading="Plan each month and see how you're tracking."
			>
				{budgets.length > 0 && (
					<>
						<SelectField
							aria-label="Month"
							value={month}
							onValueChange={setMonth}
							containerClassName="w-40"
						>
							{monthOptions.map((m) => (
								<SelectItem key={m} value={m}>
									{monthLabel(m, true)}
								</SelectItem>
							))}
						</SelectField>
						<Button
							icon={<SlidersHorizontal size={16} />}
							onClick={() => openEditor(false)}
						>
							Edit budget
						</Button>
					</>
				)}
			</Header>

			{budgets.length === 0 ? (
				<EmptyState
					icon={PieChart}
					title="Set your first monthly budget"
					description="Give each kind of spending a limit. Prospera tracks it automatically from your transactions and warns you before you go over."
				>
					{transactions.length > 0 && (
						<Button icon={<Wand2 size={16} />} onClick={() => openEditor(true)}>
							Suggest from my spending
						</Button>
					)}
					<Button
						variant={transactions.length > 0 ? "secondary" : "primary"}
						icon={<Plus size={16} />}
						onClick={() => openEditor(false)}
					>
						Create budget
					</Button>
				</EmptyState>
			) : (
				<>
					<section aria-label="Budget summary" className="pt-2">
						<div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="eyebrow">Spent in {monthLabel(month, true)}</p>
								<p className="hero-figure mt-3">
									{format(progress.totalSpent)}
								</p>
								<p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
									of {format(progress.totalLimit)} budgeted
								</p>
							</div>
							<div className="sm:text-right">
								<p
									className={cn(
										"text-xl font-semibold tracking-tight tabular-nums",
										progress.remaining < 0
											? "text-amber-700 dark:text-amber-400"
											: "text-emerald-600 dark:text-emerald-400",
									)}
								>
									{progress.remaining < 0
										? `${format(-progress.remaining)} over`
										: `${format(progress.remaining)} left`}
								</p>
								{isCurrent && progress.remaining > 0 && (
									<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
										About {format(perDay)} a day for the next {daysLeft} day
										{daysLeft === 1 ? "" : "s"}
									</p>
								)}
							</div>
						</div>
						<div
							className="mt-8 h-2.5 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800"
							role="progressbar"
							aria-valuenow={progress.pct}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="Total budget used"
						>
							<div
								className={cn(
									"h-full rounded-full transition-[width] duration-700",
									progress.remaining < 0
										? "bg-amber-500"
										: "bg-emerald-500 dark:bg-emerald-400",
								)}
								style={{ width: `${Math.min(100, progress.pct)}%` }}
							/>
						</div>
						<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
							{progress.pct}% used
						</p>
					</section>

					<section aria-label="Budget categories">
						<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{progress.items.map((item) => {
								const Icon = iconFor(BUDGET_ICONS, item.icon);
								const avg = averages.get(item.name.trim().toLowerCase());
								const usuallyOver = avg !== undefined && avg > item.limit;
								return (
									<li key={item._id} className="card p-5">
										<div className="flex items-center gap-3">
											<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white">
												<Icon size={17} />
											</span>
											<p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">
												{item.name}
											</p>
											<span
												className={cn(
													"text-xs font-medium tabular-nums",
													item.isOver
														? "text-amber-700 dark:text-amber-400"
														: "text-zinc-500 dark:text-zinc-400",
												)}
											>
												{item.pct}%
											</span>
										</div>

										<p className="mt-4 tabular-nums">
											<span
												className={cn(
													"text-xl font-semibold tracking-tight",
													item.isOver
														? "text-amber-700 dark:text-amber-400"
														: "text-zinc-900 dark:text-white",
												)}
											>
												{format(item.spent)}
											</span>
											<span className="text-sm text-zinc-500 dark:text-zinc-400">
												{" "}
												of {format(item.limit, { whole: true })}
											</span>
										</p>

										<div
											className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
											role="progressbar"
											aria-valuenow={item.pct}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`${item.name}: ${item.pct}% of budget used`}
										>
											<div
												className={cn(
													"h-full rounded-full transition-[width] duration-700",
													item.isOver
														? "bg-amber-500"
														: "bg-sky-500 dark:bg-sky-400",
												)}
												style={{ width: `${Math.min(100, item.pct)}%` }}
											/>
										</div>

										<div className="mt-3 flex items-center justify-between gap-3 text-xs tabular-nums">
											{item.isOver ? (
												<span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
													<AlertTriangle size={12} />
													{format(-item.remaining)} over
												</span>
											) : (
												<span className="text-zinc-500 dark:text-zinc-400">
													{format(item.remaining)} left
												</span>
											)}
											{avg !== undefined && (
												<span
													className={cn(
														usuallyOver
															? "text-amber-700 dark:text-amber-400"
															: "text-zinc-500 dark:text-zinc-400",
													)}
													title={
														usuallyOver
															? "Your 3-month average is above this limit"
															: "Average monthly spend over the last 3 months"
													}
												>
													Avg {format(avg, { whole: true })}/mo
												</span>
											)}
										</div>
									</li>
								);
							})}
						</ul>
					</section>

					{unbudgeted.length > 0 && (
						<Card>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<h2 className="font-semibold text-zinc-900 dark:text-white">
										Spending without a budget
									</h2>
									<p className="text-sm text-zinc-500 dark:text-zinc-400">
										These categories had spending in {monthLabel(month, true)}{" "}
										but no limit.
									</p>
								</div>
								<Button
									variant="secondary"
									size="sm"
									onClick={() => openEditor(false)}
								>
									Add to budget
								</Button>
							</div>
							<ul className="mt-4 flex flex-wrap gap-2">
								{unbudgeted.map((u) => (
									<li key={u.name}>
										<Link
											to="/transactions"
											className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
										>
											{u.name}
											<span className="font-semibold tabular-nums">
												{format(u.spent)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</Card>
					)}
				</>
			)}

			<EditBudgetModal
				open={editOpen}
				onOpenChange={setEditOpen}
				budget={budgets}
				suggest={suggest}
			/>
		</div>
	);
}
