import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
	preference: ThemePreference;
	isDarkMode: boolean;
	setPreference: (preference: ThemePreference) => void;
	toggleTheme: () => void;
}

const STORAGE_KEY = "theme";
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readPreference(): ThemePreference {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === "light" || saved === "dark" || saved === "system") {
			return saved;
		}
	} catch {
		// Storage can be unavailable (private mode); fall back to the OS.
	}
	return "system";
}

const systemPrefersDark = () =>
	window.matchMedia("(prefers-color-scheme: dark)").matches;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [preference, setPreferenceState] =
		useState<ThemePreference>(readPreference);
	const [systemDark, setSystemDark] = useState(systemPrefersDark);

	useEffect(() => {
		const query = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	const isDarkMode =
		preference === "dark" || (preference === "system" && systemDark);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", isDarkMode);
		document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
	}, [isDarkMode]);

	const setPreference = useCallback((next: ThemePreference) => {
		setPreferenceState(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// Ignore; the choice still applies for this visit.
		}
	}, []);

	const toggleTheme = useCallback(() => {
		setPreference(isDarkMode ? "light" : "dark");
	}, [isDarkMode, setPreference]);

	const value = useMemo(
		() => ({ preference, isDarkMode, setPreference, toggleTheme }),
		[preference, isDarkMode, setPreference, toggleTheme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};
