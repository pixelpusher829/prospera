import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useConvexAuth } from "convex/react";
import { Sparkles } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { toast } from "sonner";
import AuthPage from "@/pages/auth";
import logo from "@/shared/assets/logo.svg";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { useViewer } from "@/shared/hooks/data";
import Sidebar from "@/shared/layout/sidebar";
import Topbar from "@/shared/layout/Topbar";
import {
	type AuthFlow,
	AuthScreenContext,
	takePendingClaim,
	useOpenAuthScreen,
	wantsGuest,
} from "./authFlow";
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
		<div className="flex h-dvh overflow-hidden">
			<a
				href="#main"
				className="sr-only z-[100] rounded-lg bg-violet-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
			>
				Skip to content
			</a>
			<Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
			<div className="flex min-w-0 flex-1 flex-col">
				<GuestBanner />
				<Topbar onMenuClick={() => setIsMobileOpen(true)} />
				<main
					id="main"
					ref={mainRef}
					tabIndex={-1}
					className="flex-1 overflow-y-auto outline-none"
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

/** Thin bar reminding guests they're in a demo, with a way to sign up. */
function GuestBanner() {
	const { data: viewer } = useViewer();
	const openAuth = useOpenAuthScreen();
	if (!viewer?.isGuest) return null;
	return (
		<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-linear-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-center text-sm text-white">
			<span>
				<Sparkles size={14} className="mr-1.5 inline -translate-y-px" />
				You're exploring a demo with sample data. Create an account any time to
				keep everything you've done.
			</span>
			<span className="flex gap-3">
				<button
					type="button"
					onClick={() => openAuth("signUp")}
					className="font-semibold underline underline-offset-2 hover:no-underline"
				>
					Create a free account
				</button>
				<button
					type="button"
					onClick={() => openAuth("signIn")}
					className="text-white/80 underline underline-offset-2 hover:text-white hover:no-underline"
				>
					Sign in
				</button>
			</span>
		</div>
	);
}

/**
 * Portfolio visitors are signed into their own guest workspace (seeded with
 * sample data) automatically, unless they signed out of a real account.
 */
function useAutoGuest(isLoading: boolean, isAuthenticated: boolean) {
	const { signIn } = useAuthActions();
	const attempted = useRef(false);
	const [failed, setFailed] = useState(false);
	const shouldStart = !isLoading && !isAuthenticated && wantsGuest() && !failed;

	useEffect(() => {
		if (!shouldStart || attempted.current) return;
		attempted.current = true;
		signIn("anonymous").catch(() => setFailed(true));
	}, [shouldStart, signIn]);

	return shouldStart;
}

export default function App() {
	const { isLoading, isAuthenticated } = useConvexAuth();
	const startingGuest = useAutoGuest(isLoading, isAuthenticated);
	const [authScreen, setAuthScreen] = useState<AuthFlow | null>(null);

	if (isLoading) return <Splash />;
	if (startingGuest)
		return <Splash message="Setting up your demo workspace…" />;
	if (!isAuthenticated) return <AuthPage />;
	if (authScreen) {
		return (
			<AuthPage
				initialFlow={authScreen}
				onBack={() => setAuthScreen(null)}
				onSignedIn={() => setAuthScreen(null)}
			/>
		);
	}
	return (
		<AuthScreenContext.Provider value={setAuthScreen}>
			<HashRouter>
				<Shell />
			</HashRouter>
		</AuthScreenContext.Provider>
	);
}
