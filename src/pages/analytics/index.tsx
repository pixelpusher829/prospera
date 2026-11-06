import {
	ArrowDownLeft,
	ArrowUpRight,
	BarChart3,
	Download,
	Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import Button from "@/shared/components/Button";
import { SelectField, SelectItem } from "@/shared/components/forms";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { useAccounts, useMoney, useTransactions } from "@/shared/hooks/data";
import Header from "@/shared/layout/Header";
import { cn } from "@/shared/lib/cn";
import { downloadFile, safeCell } from "@/shared/lib/csv";
import {
	expenseBreakdown,
	monthKey,
	monthLabel,
	monthlySeries,
	netWorthHistory,
	parseIsoDate,
	shiftMonth,
	summarize,
	todayIso,
} from "@/shared/lib/finance";
import { formatPercent } from "@/shared/lib/money";
import { TINTS, type Tint } from "@/shared/lib/tints";
import { LoadDemoButton } from "../dashboard/Onboarding";
import AiAdvisor from "./AiAdvisor";
import { CashFlowChart } from "../dashboard/CashFlowChart";
import { CATEGORY_COLORS, useChartTheme } from "./chartTheme";

function StatCard({
	label,
	value,
	change,
	goodWhenUp,
	detail,
	icon: Icon,
	tint = "icon",
}: {
	tint?: Tint;
	label: string;
	value: string;
	change: number | null;
	goodWhenUp: boolean;
	detail: string;
	icon: typeof Wallet;
}) {
	const good =
		change === null || change === 0 ? null : change > 0 === goodWhenUp;
	return (
		<Card className="flex flex-col justify-between gap-4">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
					{label}
				</span>
				<span
					className={cn(
						"flex size-9 items-center justify-center rounded-xl",
						TINTS[tint],
					)}
				>
					<Icon size={18} />
				</span>
			</div>
			<div>
				<p className="truncate font-display text-2xl font-bold tracking-tight text-zinc-900 tabular-nums dark:text-white">
					{value}
				</p>
				<p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
					{change !== null && (
						<span
							className={cn(
								"rounded-md px-1.5 py-0.5 text-xs font-semibold",
								good === null &&
									"bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
								good === true &&
									"bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
								good === false &&
									"bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
							)}
						>
							{formatPercent(change)}
						</span>
					)}
					{detail}
				</p>
			</div>
		</Card>
	);
}

const RANGES = [
	{ value: "3", label: "Last 3 months" },
	{ value: "6", label: "Last 6 months" },
	{ value: "12", label: "Last 12 months" },
];

export default function Analytics() {
	const { data: transactions } = useTransactions();
	const { data: accounts } = useAccounts();
	const { format } = useMoney();
	const chart = useChartTheme();
	const [range, setRange] = useState("6");
	const [flowView, setFlowView] = useState<"flow" | "compare">("flow");
	const today = todayIso();
	const thisMonth = monthKey(today);
	const [month, setMonth] = useState(thisMonth);

	const data = useMemo(() => {
		if (!transactions || !accounts) return null;
		const months = Number(range);
		const days = Math.round(months * 30.4);
		return {
			summary: summarize(transactions, accounts, today),
			series: monthlySeries(transactions, months, today),
			history: netWorthHistory(transactions, accounts, days, today).map(
				(p) => ({
					...p,
					label: parseIsoDate(p.date).toLocaleDateString(undefined, {
						month: "short",
						day: "numeric",
					}),
				}),
			),
			breakdown: expenseBreakdown(transactions, month, 5),
		};
	}, [transactions, accounts, range, month, today]);

	if (!transactions || !accounts || !data) return <PageSkeleton />;

	const { summary, series, history, breakdown } = data;
	const breakdownTotal = breakdown.reduce((s, b) => s + b.value, 0);
	const compact = (n: number) => format(n, { compact: true });
	const monthOptions = Array.from({ length: 12 }, (_, i) =>
		shiftMonth(thisMonth, -i),
	);

	const exportReport = () => {
		const lines = [
			["Month", "Income", "Spending", "Net"],
			...series.map((m) => [
				monthLabel(m.key, true),
				m.income,
				m.expense,
				m.net,
			]),
			[],
			[
				`Spending by category (${monthLabel(month, true)})`,
				"Amount",
				"Share %",
			],
			...breakdown.map((b) => [safeCell(b.name), b.value, b.share]),
		];
		downloadFile(
			`prospera-report-${today}.csv`,
			lines
				.map((l) =>
					l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
				)
				.join("\n"),
		);
		toast.success("Report downloaded");
	};

	if (transactions.length === 0) {
		return (
			<div className="page">
				<Header
					heading="Analytics"
					subheading="Trends, breakdowns and AI insights."
				/>
				<EmptyState
					icon={BarChart3}
					title="Nothing to analyse yet"
					description="Once you add transactions, you'll see trends, category breakdowns and AI-powered tips here."
				>
					<LoadDemoButton />
				</EmptyState>
			</div>
		);
	}

	return (
		<div className="page">
			<Header
				heading="Analytics"
				subheading="Trends, breakdowns and AI insights."
			>
				<SelectField
					aria-label="Time range"
					value={range}
					onValueChange={setRange}
					containerClassName="w-44"
				>
					{RANGES.map((r) => (
						<SelectItem key={r.value} value={r.value}>
							{r.label}
						</SelectItem>
					))}
				</SelectField>
				<Button
					variant="secondary"
					icon={<Download size={16} />}
					onClick={exportReport}
				>
					Export
				</Button>
			</Header>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<StatCard
					label="Net worth"
					value={format(summary.netWorth)}
					change={null}
					goodWhenUp
					icon={Wallet}
					detail={`${format(summary.assets, { compact: true })} assets · ${format(summary.liabilities, { compact: true })} debts`}
				/>
				<StatCard
					label="Income this month"
					value={format(summary.month.income)}
					change={summary.incomeChange}
					goodWhenUp
					icon={ArrowUpRight}
					tint="emerald"
					detail={`${summary.month.incomeCount} deposit${summary.month.incomeCount === 1 ? "" : "s"} · ${format(summary.previousToDate.income, { compact: true })} by now last month`}
				/>
				<StatCard
					label="Spending this month"
					value={format(summary.month.expense)}
					change={summary.expenseChange}
					goodWhenUp={false}
					icon={ArrowDownLeft}
					detail={`${summary.month.expenseCount} purchases in ${summary.month.categories} categor${summary.month.categories === 1 ? "y" : "ies"}`}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader
						title="Net worth over time"
						description="Based on transactions linked to your accounts"
					/>
					<div
						className="h-72"
						role="img"
						aria-label={`Net worth trend, currently ${format(summary.netWorth)}`}
					>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={history} margin={{ left: 0, right: 8, top: 8 }}>
								<defs>
									<linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="0%"
											stopColor={chart.line}
											stopOpacity={0.16}
										/>
										<stop
											offset="100%"
											stopColor={chart.line}
											stopOpacity={0}
										/>
									</linearGradient>
									<linearGradient id="nwStroke" x1="0" y1="0" x2="1" y2="0">
										<stop offset="0%" stopColor="var(--color-brand-red)" />
										<stop offset="100%" stopColor="var(--color-brand-pink)" />
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke={chart.grid}
								/>
								<XAxis
									dataKey="label"
									axisLine={false}
									tickLine={false}
									tick={{ fill: chart.axis, fontSize: 12 }}
									minTickGap={32}
									dy={8}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fill: chart.axis, fontSize: 12 }}
									tickFormatter={compact}
									width={64}
									domain={["auto", "auto"]}
								/>
								<Tooltip
									{...chart.tooltip}
									formatter={(v) => [format(Number(v)), "Net worth"]}
								/>
								<Area
									type="monotone"
									dataKey="value"
									stroke="url(#nwStroke)"
									strokeWidth={2.5}
									fill="url(#nw)"
									activeDot={{ r: 5, fill: chart.line, strokeWidth: 0 }}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</Card>

				<Card className="flex flex-col">
					<CardHeader
						title="Where it went"
						action={
							<SelectField
								aria-label="Month"
								value={month}
								onValueChange={setMonth}
								containerClassName="w-36"
								className="h-9 sm:h-9"
							>
								{monthOptions.map((m) => (
									<SelectItem key={m} value={m}>
										{monthLabel(m, true)}
									</SelectItem>
								))}
							</SelectField>
						}
					/>
					{breakdown.length === 0 ? (
						<p className="flex flex-1 items-center justify-center py-10 text-sm text-zinc-500 dark:text-zinc-400">
							No spending in {monthLabel(month, true)}.
						</p>
					) : (
							<>
								<div className="relative h-52">
									<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
										<span className="text-xs text-zinc-500 dark:text-zinc-400">
											Spent
										</span>
										<span className="text-xl font-semibold text-zinc-900 tabular-nums dark:text-white">
											{format(breakdownTotal, { whole: breakdownTotal >= 10000 })}
										</span>
									</div>
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={breakdown}
												dataKey="value"
												nameKey="name"
												innerRadius="68%"
												outerRadius="95%"
												paddingAngle={2}
												cornerRadius={3}
												startAngle={90}
												endAngle={-270}
												stroke="none"
											>
												{breakdown.map((b, i) => (
													<Cell
														key={b.name}
														fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
													/>
												))}
											</Pie>
											<Tooltip
												{...chart.tooltip}
												formatter={(v, name) => [format(Number(v)), name]}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
								<ul className="mt-4 space-y-2">
									{breakdown.map((b, i) => (
										<li key={b.name} className="flex items-center gap-2 text-sm">
											<span
												className="size-2.5 shrink-0 rounded-full"
												style={{
													background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
												}}
											/>
											<span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">
												{b.name}
											</span>
											<span className="text-zinc-400 tabular-nums">
												{b.share}%
											</span>
											<span className="w-24 text-right font-medium text-zinc-900 tabular-nums dark:text-white">
												{format(b.value)}
											</span>
										</li>
									))}
								</ul>
							</>
					)}
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader
						title="Cash flow"
						description={
							flowView === "flow"
								? "Income above the line, spending below"
								: "Monthly totals side by side"
						}
						action={
							<fieldset className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800/70">
								<legend className="sr-only">Chart style</legend>
								{(
									[
										["flow", "Net"],
										["compare", "Side by side"],
									] as const
								).map(([value, label]) => (
									<button
										key={value}
										type="button"
										aria-pressed={flowView === value}
										onClick={() => setFlowView(value)}
										className={cn(
											"rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
											flowView === value
												? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
												: "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white",
										)}
									>
										{label}
									</button>
								))}
							</fieldset>
						}
					/>
					{flowView === "flow" ? (
						<CashFlowChart
							series={series}
							format={(n) => format(n)}
							axisFormat={compact}
							className="h-72"
						/>
					) : (
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={series}
								barGap={4}
								margin={{ left: 0, right: 8, top: 8 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke={chart.grid}
								/>
								<XAxis
									dataKey="label"
									axisLine={false}
									tickLine={false}
									tick={{ fill: chart.axis, fontSize: 12 }}
									dy={8}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fill: chart.axis, fontSize: 12 }}
									tickFormatter={compact}
									width={64}
								/>
								<Tooltip
									{...chart.tooltip}
									cursor={{ fill: chart.cursor }}
									formatter={(v, name) => [
										format(Number(v)),
										name === "income" ? "Income" : "Spending",
									]}
								/>
								<Legend
									iconType="circle"
									iconSize={8}
									formatter={(value) => (
										<span className="text-sm text-zinc-600 dark:text-zinc-300">
											{value === "income" ? "Income" : "Spending"}
										</span>
									)}
								/>
								<Bar
									dataKey="income"
									fill={chart.income}
									radius={[6, 6, 0, 0]}
									maxBarSize={28}
								/>
								<Bar
									dataKey="expense"
									fill={chart.expense}
									radius={[6, 6, 0, 0]}
									maxBarSize={28}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
					)}
				</Card>
				<AiAdvisor hasData={transactions.length >= 3} />
			</div>
		</div>
	);
}
