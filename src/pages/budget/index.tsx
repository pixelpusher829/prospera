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
										: "bg-linear-to-r from-brand-red to-brand-pink",
								)}
								style={{ width: `${Math.min(100, progress.pct)}%` }}
							/>
						</div>
						<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
							{progress.pct}% used
						</p>
					</section>

					<section aria-label="Budget categories">
						<div className="card overflow-hidden">
							<div
								aria-hidden
								className="hidden grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem_7rem] gap-6 border-b border-zinc-100 bg-zinc-50/60 px-6 py-2 text-xs font-medium text-zinc-500 sm:grid dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-400"
							>
								<span>Category</span>
								<span>Progress</span>
								<span className="text-right">Spent</span>
								<span className="text-right">Left</span>
							</div>
							<ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
								{progress.items.map((item) => {
									const Icon = iconFor(BUDGET_ICONS, item.icon);
									return (
										<li
											key={item._id}
											className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-5 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem_7rem] sm:gap-6 sm:px-6"
										>
											<div className="flex min-w-0 items-center gap-3">
												<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white">
													<Icon size={17} />
												</span>
												<div className="min-w-0">
													<p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
														{item.name}
													</p>
													<p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
														{format(item.limit, { whole: true })} / month
													</p>
												</div>
											</div>

											{/* Phone: amounts sit beside the name, bar spans below. */}
											<div className="text-right sm:order-last sm:contents">
												<p
													className={cn(
														"text-sm font-semibold tabular-nums sm:order-3 sm:text-right",
														item.isOver
															? "text-amber-700 dark:text-amber-400"
															: "text-zinc-900 dark:text-white",
													)}
												>
													{format(item.spent)}
												</p>
												<p
													className={cn(
														"text-xs tabular-nums sm:order-4 sm:text-right sm:text-sm",
														item.isOver
															? "font-medium text-amber-700 dark:text-amber-400"
															: "text-zinc-500 dark:text-zinc-400",
													)}
												>
													{item.isOver ? (
														<span className="inline-flex items-center gap-1">
															<AlertTriangle size={12} />
															{format(-item.remaining)} over
														</span>
													) : (
														<>
															{format(item.remaining)}
															<span className="sm:hidden"> left</span>
														</>
													)}
												</p>
											</div>

											<div
												className="col-span-2 sm:order-2 sm:col-span-1"
												role="progressbar"
												aria-valuenow={item.pct}
												aria-valuemin={0}
												aria-valuemax={100}
												aria-label={`${item.name}: ${item.pct}% of budget used`}
											>
												<div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
													<div
														className={cn(
															"h-full rounded-full transition-[width] duration-700",
															item.isOver
																? "bg-amber-500"
																: "bg-emerald-500 dark:bg-emerald-400",
														)}
														style={{ width: `${Math.min(100, item.pct)}%` }}
													/>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
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
