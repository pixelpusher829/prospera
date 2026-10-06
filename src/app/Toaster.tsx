import { Toaster } from "sonner";
import { useTheme } from "@/shared/contexts/ThemeContext";

export function AppToaster() {
	const { isDarkMode } = useTheme();
	return (
		<Toaster
			theme={isDarkMode ? "dark" : "light"}
			position="bottom-right"
			closeButton
			richColors
			toastOptions={{ className: "font-sans" }}
		/>
	);
}
