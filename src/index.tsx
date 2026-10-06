import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { SetupRequired } from "@/app/SetupRequired";
import { AppToaster } from "@/app/Toaster";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { convex, queryClient } from "@/shared/lib/convex";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Could not find root element to mount to");
}

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<ThemeProvider>
			<ErrorBoundary>
				{convex ? (
					<ConvexAuthProvider client={convex}>
						<QueryClientProvider client={queryClient}>
							<App />
						</QueryClientProvider>
					</ConvexAuthProvider>
				) : (
					<SetupRequired />
				)}
			</ErrorBoundary>
			<AppToaster />
		</ThemeProvider>
	</React.StrictMode>,
);
