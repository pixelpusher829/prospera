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
					<section
						aria-label="Budget summary"
						className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg shadow-slate-900/10 sm:p-8 dark:bg-linear-to-br dark:from-violet-600/25 dark:to-slate-900 dark:ring-1 dark:ring-violet-500/20"
					>
						<div className="absolute -top-20 -right-10 size-64 rounded-full bg-violet-500/20 blur-3xl" />
						<div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="text-sm font-medium text-slate-300">
									Spent in {monthLabel(month, true)}
								</p>
								<p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
									{format(progress.totalSpent)}
								</p>
								<p className="mt-1 text-sm text-slate-300">
									of {format(progress.totalLimit)} budgeted
								</p>
							</div>
							<div className="sm:text-right">
								<p
									className={cn(
										"text-2xl font-semibold tabular-nums",
										progress.remaining < 0
											? "text-red-300"
											: "text-emerald-300",
									)}
								>
									{progress.remaining < 0
										? `${format(-progress.remaining)} over`
										: `${format(progress.remaining)} left`}
								</p>
								{isCurrent && progress.remaining > 0 && (
									<p className="mt-1 text-sm text-slate-300">
										About {format(perDay)} a day for the next {daysLeft} day
										{daysLeft === 1 ? "" : "s"}
									</p>
								)}
							</div>
						</div>
						<div
							className="relative mt-6 h-3 overflow-hidden rounded-full bg-white/10"
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
										? "bg-red-400"
										: "bg-linear-to-r from-violet-400 to-fuchsia-400",
								)}
								style={{ width: `${Math.min(100, progress.pct)}%` }}
							/>
						</div>
						<p className="relative mt-2 text-sm text-slate-300">
							{progress.pct}% used
						</p>
					</section>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{progress.items.map((item) => {
							const Icon = iconFor(BUDGET_ICONS, item.icon);
							return (
								<Card key={item._id} className="flex flex-col gap-4">
									<div className="flex items-start justify-between gap-3">
										<div className="flex min-w-0 items-center gap-3">
											<span
												className="flex size-11 shrink-0 items-center justify-center rounded-xl"
												style={{
													background: `${item.color}1f`,
													color: item.color,
												}}
											>
												<Icon size={20} />
											</span>
											<div className="min-w-0">
												<h3 className="truncate font-semibold text-slate-900 dark:text-white">
													{item.name}
												</h3>
												<p className="text-xs text-slate-500 dark:text-slate-400">
													{format(item.limit)} / month
												</p>
											</div>
										</div>
										<span
											className={cn(
												"text-lg font-bold tabular-nums",
												item.isOver
													? "text-red-600 dark:text-red-400"
													: "text-slate-900 dark:text-white",
											)}
										>
											{format(item.spent)}
										</span>
									</div>
									<div>
										<div
											className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
											role="progressbar"
											aria-valuenow={item.pct}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`${item.name} budget used`}
										>
											<div
												className={cn(
													"h-full rounded-full transition-[width] duration-700",
													item.isOver && "bg-red-500",
												)}
												style={{
													width: `${Math.min(100, item.pct)}%`,
													background: item.isOver ? undefined : item.color,
												}}
											/>
										</div>
										<div className="mt-2 flex items-center justify-between text-xs font-medium">
											<span
												className={
													item.isOver
														? "text-red-600 dark:text-red-400"
														: "text-slate-500 dark:text-slate-400"
												}
											>
												{item.pct}%
											</span>
											{item.isOver ? (
												<span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
													<AlertTriangle size={12} /> {format(-item.remaining)}{" "}
													over
												</span>
											) : (
												<span className="text-slate-500 dark:text-slate-400">
													{format(item.remaining)} left
												</span>
											)}
										</div>
									</div>
								</Card>
							);
						})}
					</div>

					{unbudgeted.length > 0 && (
						<Card>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<h2 className="font-semibold text-slate-900 dark:text-white">
										Spending without a budget
									</h2>
									<p className="text-sm text-slate-500 dark:text-slate-400">
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
											className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
