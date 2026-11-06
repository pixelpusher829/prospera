import { useTheme } from "@/shared/contexts/ThemeContext";

export const CATEGORY_COLORS = [
	"#dd1a62",
	"#0ea5e9",
	"#f59e0b",
	"#10b981",
	"#52525b",
	"#d4d4d8",
];

/** Colours for Recharts that follow the light/dark theme. */
export function useChartTheme() {
	const { isDarkMode } = useTheme();
	return {
		grid: isDarkMode ? "#252935" : "#f0f0f2",
		axis: isDarkMode ? "#6f7587" : "#a1a1aa",
		cursor: isDarkMode ? "rgba(158,164,179,0.08)" : "rgba(161,161,170,0.14)",
		income: isDarkMode ? "#34d399" : "#10b981",
		expense: isDarkMode ? "#f86593" : "#dd1a62",
		line: "#ec1b69",
		tooltip: {
			contentStyle: {
				borderRadius: 12,
				border: `1px solid ${isDarkMode ? "#3a3f4d" : "#e4e4e7"}`,
				background: isDarkMode ? "#161921" : "#ffffff",
				boxShadow: "0 8px 24px -8px rgb(9 9 11 / 0.2)",
				fontSize: 13,
				padding: "8px 12px",
			},
			labelStyle: {
				color: isDarkMode ? "#f2f3f6" : "#18181b",
				fontWeight: 600,
				marginBottom: 4,
			},
			itemStyle: { color: isDarkMode ? "#d0d4dd" : "#52525b", padding: 0 },
		},
	};
}
