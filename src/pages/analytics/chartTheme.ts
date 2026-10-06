import { useTheme } from "@/shared/contexts/ThemeContext";

export const CATEGORY_COLORS = [
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#f59e0b",
	"#10b981",
	"#94a3b8",
];

/** Colours for Recharts that follow the light/dark theme. */
export function useChartTheme() {
	const { isDarkMode } = useTheme();
	return {
		grid: isDarkMode ? "#1e293b" : "#f1f5f9",
		axis: isDarkMode ? "#64748b" : "#94a3b8",
		cursor: isDarkMode ? "rgba(148,163,184,0.08)" : "rgba(148,163,184,0.12)",
		income: isDarkMode ? "#34d399" : "#10b981",
		expense: isDarkMode ? "#a78bfa" : "#8b5cf6",
		line: "#8b5cf6",
		tooltip: {
			contentStyle: {
				borderRadius: 12,
				border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
				background: isDarkMode ? "#0f172a" : "#ffffff",
				boxShadow: "0 8px 24px -8px rgb(15 23 42 / 0.2)",
				fontSize: 13,
				padding: "8px 12px",
			},
			labelStyle: {
				color: isDarkMode ? "#f1f5f9" : "#0f172a",
				fontWeight: 600,
				marginBottom: 4,
			},
			itemStyle: { color: isDarkMode ? "#cbd5e1" : "#475569", padding: 0 },
		},
	};
}
