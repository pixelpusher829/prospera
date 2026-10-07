import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useConvexAuth } from "convex/react";

import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/shared/assets/logo.svg";
import Button from "@/shared/components/Button";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import Sidebar from "@/shared/layout/sidebar";
import Topbar from "@/shared/layout/Topbar";
import { AuthDialog } from "./AuthDialog";
import { type AuthFlow, AuthScreenContext, takePendingClaim } from "./authFlow";
import { ErrorBoundary } from "./ErrorBoundary";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Transactions = lazy(() => import("@/pages/transactions"));
const Wallet = lazy(() => import("@/pages/wallet"));
const Budget = lazy(() => import("@/pages/budget"));
const Goals = lazy(() => import("@/pages/goals"));
const ClientList = lazy(() => import("@/pages/client-list"));
const Settings = lazy(() => import("@/pages/settings"));
const Help = lazy(() => import("@/pages/help"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Splash({ message }: { message?: string }) {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-4">
			<img src={logo} alt="" className="h-10 w-auto animate-pulse" />
			<p
				aria-live="polite"
				className="text-sm text-slate-500 dark:text-slate-400"
			>
				{message ?? "Loading Prospera…"}
			</p>
		</div>
	);
}

/** After a guest signs up, move their demo workspace into the new account. */
function useClaimGuestWorkspace() {
	const claim = useConvexMutation(api.users.claimGuestWorkspace);
	// biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
	useEffect(() => {
		const token = takePendingClaim();
		if (!token) return;
		claim({ token })
			.then((result) => {
				if (result.moved) {
					toast.success(
						"Welcome! Your demo workspace is saved to your account.",
					);
				}
			})
			.catch(() => undefined);
	}, []);
}
function Shell() {
	useClaimGuestWorkspace();
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const mainRef = useRef<HTMLElement>(null);
	const { pathname } = useLocation();

	// Each page starts at the top, and focus moves to it for screen readers.
	// biome-ignore lint/correctness/useExhaustiveDependencies: run on navigation
	useEffect(() => {
		mainRef.current?.scrollTo({ top: 0 });
		mainRef.current?.focus({ preventScroll: true });
	}, [pathname]);

	return (
		<div className="flex h-dvh overflow-hidden pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
			<a
				href="#main"
				className="sr-only z-[100] rounded-lg bg-violet-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
			>
				Skip to content
			</a>
			<Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
			<div className="flex min-w-0 flex-1 flex-col">
				<Topbar onMenuClick={() => setIsMobileOpen(true)} />
				<main
					id="main"
					ref={mainRef}
					tabIndex={-1}
					className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] outline-none"
				>
					<ErrorBoundary inline key={pathname}>
						<Suspense fallback={<PageSkeleton />}>
							<div className="animate-rise">
								<Routes>
									<Route path="/" element={<Dashboard />} />
									<Route path="/analytics" element={<Analytics />} />
									<Route path="/transactions" element={<Transactions />} />
									<Route path="/wallet" element={<Wallet />} />
									<Route path="/budget" element={<Budget />} />
									<Route path="/goals" element={<Goals />} />
									<Route path="/clients" element={<ClientList />} />
									<Route path="/settings" element={<Settings />} />
									<Route path="/help" element={<Help />} />
									<Route path="*" element={<NotFound />} />
								</Routes>
							</div>
						</Suspense>
					</ErrorBoundary>
				</main>
			</div>
		</div>
	);
}

/** Signs visitors into their own seeded guest workspace. Never shows a login wall. */
function useAutoGuest(isLoading: boolean, isAuthenticated: boolean) {
	const { signIn } = useAuthActions();
	const [state, setState] = useState<"idle" | "starting" | "failed">("idle");

	const start = useCallback(() => {
		setState("starting");
		signIn("anonymous")
			.then(() => setState("idle"))
			.catch((error) => {
				console.error("Could not start guest session", error);
				setState("failed");
			});
	}, [signIn]);

	useEffect(() => {
		if (!isLoading && !isAuthenticated && state === "idle") start();
	}, [isLoading, isAuthenticated, state, start]);

	return { failed: state === "failed", retry: start };
}

function DemoUnavailable({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
			<img src={logo} alt="" className="h-10 w-auto" />
			<div>
				<h1 className="text-lg font-semibold text-slate-900 dark:text-white">
					The demo couldn't start
				</h1>
				<p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
					This is usually a temporary connection problem. Give it another try.
				</p>
			</div>
			<Button onClick={onRetry}>Try again</Button>
		</div>
	);
}

export default function App() {
	const { isLoading, isAuthenticated } = useConvexAuth();
	const guest = useAutoGuest(isLoading, isAuthenticated);
	const [authFlow, setAuthFlow] = useState<AuthFlow | null>(null);

	if (!isAuthenticated) {
		if (guest.failed) return <DemoUnavailable onRetry={guest.retry} />;
		return <Splash message={isLoading ? undefined : "Opening the demo…"} />;
	}
	return (
		<AuthScreenContext.Provider value={setAuthFlow}>
			<HashRouter>
				<Shell />
			</HashRouter>
			<AuthDialog
				flow={authFlow}
				onFlowChange={setAuthFlow}
				onClose={() => setAuthFlow(null)}
			/>
		</AuthScreenContext.Provider>
	);
}
