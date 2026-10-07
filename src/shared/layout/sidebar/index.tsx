import {
	ArrowRightLeft,
	BarChart3,
	ChevronsLeft,
	ChevronsRight,
	HelpCircle,
	LayoutDashboard,
	PieChart,
	Settings,
	Target,
	Users,
	Wallet,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import logo from "@/shared/assets/logo.svg";
import { cn } from "@/shared/lib/cn";

export const NAV_ITEMS = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/analytics", label: "Analytics", icon: BarChart3 },
	{ to: "/transactions", label: "Transactions", icon: ArrowRightLeft },
	{ to: "/wallet", label: "Wallet", icon: Wallet },
	{ to: "/budget", label: "Budget", icon: PieChart },
	{ to: "/goals", label: "Goals", icon: Target },
	{ to: "/clients", label: "Clients", icon: Users },
];

const FOOTER_ITEMS = [
	{ to: "/settings", label: "Settings", icon: Settings },
	{ to: "/help", label: "Help", icon: HelpCircle },
];

const COLLAPSE_KEY = "sidebar-collapsed";

function readCollapsed() {
	try {
		return localStorage.getItem(COLLAPSE_KEY) === "1";
	} catch {
		return false;
	}
}

interface SidebarProps {
	isMobileOpen: boolean;
	setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
	isMobileOpen,
	setIsMobileOpen,
}: SidebarProps) {
	const [collapsed, setCollapsed] = useState(readCollapsed);
	const { pathname } = useLocation();

	// Close the mobile drawer whenever the route changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: run on navigation
	useEffect(() => {
		setIsMobileOpen(false);
	}, [pathname, setIsMobileOpen]);

	useEffect(() => {
		if (!isMobileOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsMobileOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isMobileOpen, setIsMobileOpen]);

	const toggleCollapsed = () => {
		setCollapsed((prev) => {
			try {
				localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
			} catch {
				// Not critical.
			}
			return !prev;
		});
	};

	// The drawer is never collapsed on phones.
	const isCollapsed = collapsed && !isMobileOpen;

	const link = (item: (typeof NAV_ITEMS)[number]) => (
		<NavLink
			key={item.to}
			to={item.to}
			end={item.to === "/"}
			className={cn("nav-item", isCollapsed && "justify-center px-0")}
			title={isCollapsed ? item.label : undefined}
		>
			<item.icon size={19} className="shrink-0" aria-hidden />
			<span className={cn(isCollapsed && "sr-only")}>{item.label}</span>
		</NavLink>
	);

	return (
		<>
			{isMobileOpen && (
				<div
					aria-hidden
					className="fixed inset-0 z-40 animate-fade-in bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
					onClick={() => setIsMobileOpen(false)}
				/>
			)}
			<aside
				id="app-sidebar"
				aria-label="Main navigation"
				className={cn(
					"fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-[transform,width,visibility] duration-300 ease-out dark:border-slate-800 dark:bg-slate-900",
					// The drawer sits outside the shell's safe-area padding.
					"pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]",
					"lg:visible lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:p-0",
					// `invisible` keeps the closed drawer out of the tab order.
					isMobileOpen
						? "translate-x-0 shadow-2xl"
						: "invisible -translate-x-full",
					isCollapsed ? "lg:w-20" : "lg:w-64",
				)}
			>
				<div
					className={cn(
						"flex h-16 shrink-0 items-center gap-3 px-5",
						isCollapsed && "justify-center px-0",
					)}
				>
					<img src={logo} alt="" className="h-7 w-auto" />
					<span
						className={cn(
							"text-xl font-bold tracking-tight text-slate-900 dark:text-white",
							isCollapsed && "sr-only",
						)}
					>
						Prospera
					</span>
					<button
						type="button"
						onClick={() => setIsMobileOpen(false)}
						className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
						aria-label="Close menu"
					>
						<X size={20} />
					</button>
				</div>

				<nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
					{NAV_ITEMS.map(link)}
				</nav>

				<div className="space-y-1 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
					{FOOTER_ITEMS.map(link)}
					<button
						type="button"
						onClick={toggleCollapsed}
						className={cn(
							"nav-item hidden lg:flex",
							isCollapsed && "justify-center px-0",
						)}
						aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
						title={isCollapsed ? "Expand sidebar" : undefined}
					>
						{isCollapsed ? (
							<ChevronsRight size={19} aria-hidden />
						) : (
							<ChevronsLeft size={19} aria-hidden />
						)}
						<span className={cn(isCollapsed && "sr-only")}>Collapse</span>
					</button>
				</div>
			</aside>
		</>
	);
}
