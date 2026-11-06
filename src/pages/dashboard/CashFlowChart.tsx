import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { cn } from "@/shared/lib/cn";
import type { MonthPoint } from "@/shared/lib/finance";
import { useChartTheme } from "../analytics/chartTheme";

/**
 * Mirrored cash-flow bars: income above the zero line, spending below,
 * with net per month drawn as a line through the middle.
 */
export function CashFlowChart({
	series,
	format,
	axisFormat,
	className = "h-44",
}: {
	series: MonthPoint[];
	format: (n: number) => string;
	/** When given, shows a y-axis and gridlines (for the larger analytics view). */
	axisFormat?: (n: number) => string;
	className?: string;
}) {
	const chart = useChartTheme();
	const { isDarkMode } = useTheme();
	const netColor = isDarkMode ? "#f2f3f6" : "#161921";
	const data = series.map((m) => ({
		label: m.label,
		income: m.income,
		spending: -m.expense,
		net: m.net,
	}));

	return (
		<div>
			<div
				className={className}
				role="img"
				aria-label={`Income, spending and net for the last ${series.length} months`}
			>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
						data={data}
						stackOffset="sign"
						margin={{ left: 0, right: axisFormat ? 8 : 0, top: 4, bottom: 0 }}
					>
						{axisFormat && (
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								stroke={chart.grid}
							/>
						)}
						<XAxis
							dataKey="label"
							axisLine={false}
							tickLine={false}
							tick={{ fill: chart.axis, fontSize: axisFormat ? 12 : 11 }}
						/>
						{axisFormat ? (
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fill: chart.axis, fontSize: 12 }}
								tickFormatter={(v) => axisFormat(Math.abs(Number(v)))}
								width={64}
							/>
						) : (
							<YAxis hide />
						)}
						<ReferenceLine y={0} stroke={chart.grid} strokeWidth={1.5} />
						<Tooltip
							{...chart.tooltip}
							cursor={{ fill: chart.cursor }}
							formatter={(v, name) => [
								format(name === "Spending" ? -Number(v) : Number(v)),
								name,
							]}
						/>
						<Bar
							dataKey="income"
							name="Income"
							stackId="flow"
							fill={chart.income}
							radius={[4, 4, 0, 0]}
							maxBarSize={28}
						/>
						<Bar
							dataKey="spending"
							name="Spending"
							stackId="flow"
							fill={chart.expense}
							radius={[4, 4, 0, 0]}
							maxBarSize={28}
						/>
						<Line
							dataKey="net"
							name="Net"
							type="linear"
							stroke={netColor}
							strokeOpacity={0.7}
							strokeWidth={1.5}
							dot={{ r: 3, fill: netColor, strokeWidth: 0 }}
							activeDot={{ r: 4 }}
							isAnimationActive={false}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			</div>
			<ul
				className={cn(
					"mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400",
					axisFormat && "justify-center",
				)}
			>
				<LegendItem color={chart.income} label="Income" />
				<LegendItem color={chart.expense} label="Spending" />
				<LegendItem color={netColor} label="Net" round />
			</ul>
		</div>
	);
}

function LegendItem({
	color,
	label,
	round,
}: {
	color: string;
	label: string;
	round?: boolean;
}) {
	return (
		<li className="flex items-center gap-1.5">
			<span
				className={round ? "size-2 rounded-full" : "size-2.5 rounded-sm"}
				style={{ background: color }}
			/>
			{label}
		</li>
	);
}
