import { useAuthActions } from "@convex-dev/auth/react";
import { useQueryClient } from "@tanstack/react-query";
import {
	Bell,
	CheckCircle2,
	HelpCircle,
	LogIn,
	LogOut,
	Menu as MenuIcon,
	Monitor,
	Moon,
	Settings,
	Sun,
	UserPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { setSignedOut, useOpenAuthScreen } from "@/app/authFlow";
import logo from "@/shared/assets/logo.svg";
import { Avatar } from "@/shared/components/ui/Avatar";
import {
	Menu,
	MenuItem,
	MenuLabel,
	MenuSeparator,
	Popover,
} from "@/shared/components/ui/Menu";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useViewer } from "@/shared/hooks/data";
import { useAlerts } from "@/shared/hooks/useAlerts";
import { cn } from "@/shared/lib/cn";
import type { Alert } from "@/shared/lib/finance";

const toneDot: Record<Alert["tone"], string> = {
	danger: "bg-red-500",
	warning: "bg-amber-500",
	info: "bg-sky-500",
	success: "bg-emerald-500",
};

export function AlertList({
	alerts,
	onNavigate,
}: {
	alerts: Alert[];
	onNavigate?: () => void;
}) {
	if (alerts.length === 0) {
		return (
			<div className="flex flex-col items-center py-6 text-center">
				<CheckCircle2 className="mb-2 text-emerald-500" size={28} />
				<p className="text-sm font-medium text-slate-900 dark:text-white">
					You're all caught up
				</p>
				<p className="text-xs text-slate-500 dark:text-slate-400">
					Budget and goal alerts will show up here.
				</p>
			</div>
		);
	}
	return (
		<ul className="space-y-1">
			{alerts.map((alert) => (
				<li key={alert.id}>
					<Link
						to={alert.href}
						onClick={onNavigate}
						className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
					>
						<span
							aria-hidden
							className={cn(
								"mt-1.5 size-2 shrink-0 rounded-full",
								toneDot[alert.tone],
							)}
						/>
						<span className="min-w-0">
							<span className="block text-sm font-medium text-slate-900 dark:text-white">
								{alert.title}
							</span>
							<span className="block text-xs text-slate-500 dark:text-slate-400">
								{alert.detail}
							</span>
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
}

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
	const { data: viewer } = useViewer();
	const alerts = useAlerts() ?? [];
	const { signOut } = useAuthActions();
	const { preference, setPreference } = useTheme();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const urgent = alerts.filter(
		(a) => a.tone === "danger" || a.tone === "warning",
	);

	const openAuth = useOpenAuthScreen();

	const handleSignOut = async () => {
		setSignedOut(true);
		await signOut();
		queryClient.clear();
	};

	return (
		<header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6 dark:border-slate-800 dark:bg-slate-950/80">
			<button
				type="button"
				onClick={onMenuClick}
				aria-label="Open menu"
				aria-controls="app-sidebar"
				className="-ml-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
			>
				<MenuIcon size={22} />
			</button>
			<Link to="/" className="flex items-center gap-2 lg:hidden">
				<img src={logo} alt="" className="h-6 w-auto" />
				<span className="text-lg font-bold text-slate-900 dark:text-white">
					Prospera
				</span>
			</Link>

			<div className="ml-auto flex items-center gap-1 sm:gap-2">
				<Popover
					trigger={
						<button
							type="button"
							className="relative rounded-full p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
							aria-label={
								urgent.length
									? `Notifications, ${urgent.length} need attention`
									: "Notifications"
							}
						>
							<Bell size={20} />
							{urgent.length > 0 && (
								<span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
									{urgent.length > 9 ? "9+" : urgent.length}
								</span>
							)}
						</button>
					}
					className="w-80 p-2"
				>
					<p className="px-2 pt-1 pb-2 text-sm font-semibold text-slate-900 dark:text-white">
						Notifications
					</p>
					<AlertList alerts={alerts} />
				</Popover>

				<Menu
					label="Account"
					trigger={
						<button
							type="button"
							className="flex items-center gap-3 rounded-full p-1 transition-colors hover:bg-slate-100 sm:rounded-xl sm:py-1.5 sm:pr-3 sm:pl-1.5 dark:hover:bg-slate-800"
							aria-label="Account menu"
						>
							<Avatar name={viewer?.name || viewer?.email || "?"} size="sm" />
							<span className="hidden max-w-40 text-left sm:block">
								<span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
									{viewer?.name || "Your account"}
								</span>
								<span className="block truncate text-xs text-slate-500 dark:text-slate-400">
									{viewer?.isGuest ? "Demo workspace" : viewer?.email}
								</span>
							</span>
						</button>
					}
				>
					<MenuLabel>
						{viewer?.isGuest ? "Demo workspace" : viewer?.email}
					</MenuLabel>
					<MenuItem icon={<Settings />} onSelect={() => navigate("/settings")}>
						Settings
					</MenuItem>
					<MenuItem icon={<HelpCircle />} onSelect={() => navigate("/help")}>
						Help
					</MenuItem>
					<MenuSeparator />
					<MenuLabel>Theme</MenuLabel>
					{(
						[
							["light", "Light", <Sun key="l" />],
							["dark", "Dark", <Moon key="d" />],
							["system", "System", <Monitor key="s" />],
						] as const
					).map(([value, label, icon]) => (
						<MenuItem
							key={value}
							icon={icon}
							onSelect={() => setPreference(value)}
						>
							<span className="flex-1">{label}</span>
							{preference === value && (
								<span className="text-xs text-violet-600 dark:text-violet-400">
									Active
								</span>
							)}
						</MenuItem>
					))}
					<MenuSeparator />
					{viewer?.isGuest ? (
						<>
							<MenuItem icon={<UserPlus />} onSelect={() => openAuth("signUp")}>
								Create an account
							</MenuItem>
							<MenuItem icon={<LogIn />} onSelect={() => openAuth("signIn")}>
								Sign in
							</MenuItem>
						</>
					) : (
						<MenuItem icon={<LogOut />} onSelect={handleSignOut} danger>
							Sign out
						</MenuItem>
					)}
				</Menu>
			</div>
		</header>
	);
}
