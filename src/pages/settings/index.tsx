import { api } from "@convex/_generated/api";
import { CURRENCIES } from "@convex/constants";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAction } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Database,
	Download,
	LogOut,
	Monitor,
	Moon,
	Palette,
	Shield,
	Sun,
	User,
	UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useOpenAuthScreen } from "@/app/authFlow";
import Button from "@/shared/components/Button";
import { InputField, SelectField, SelectItem } from "@/shared/components/forms";
import { Avatar } from "@/shared/components/ui/Avatar";
import { Card, CardHeader } from "@/shared/components/ui/Card";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import { type ThemePreference, useTheme } from "@/shared/contexts/ThemeContext";
import {
	useAccounts,
	useAppMutation,
	useBudgets,
	useClients,
	useGoals,
	useTransactions,
	useViewer,
} from "@/shared/hooks/data";
import { useZodForm } from "@/shared/hooks/useZodForm";
import Header from "@/shared/layout/Header";
import { cn } from "@/shared/lib/cn";
import { downloadFile } from "@/shared/lib/csv";
import { errorMessage } from "@/shared/lib/errors";
import { todayIso } from "@/shared/lib/finance";
import { passwordRules } from "@/shared/lib/schemas";

const SECTIONS = [
	{ id: "profile", label: "Profile", icon: User },
	{ id: "preferences", label: "Preferences", icon: Palette },
	{ id: "security", label: "Security", icon: Shield },
	{ id: "data", label: "Your data", icon: Database },
];

function ProfileSection() {
	const { data: viewer } = useViewer();
	const [name, setName] = useState(viewer?.name ?? "");
	const save = useAppMutation(api.users.updateProfile, {
		success: "Profile saved",
	});
	useEffect(() => setName(viewer?.name ?? ""), [viewer?.name]);
	if (!viewer) return null;
	const trimmed = name.trim();
	return (
		<Card id="profile">
			<CardHeader title="Profile" description="How you appear in Prospera." />
			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					if (trimmed) save.mutate({ name: trimmed });
				}}
			>
				<div className="flex items-center gap-4">
					<Avatar name={trimmed || viewer.email} size="lg" />
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Your avatar uses your initials.
					</p>
				</div>
				<InputField
					label="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					error={trimmed ? undefined : "Name can't be empty."}
					autoComplete="name"
				/>
				{!viewer.isGuest && (
					<InputField
						label="Email"
						value={viewer.email}
						readOnly
						hint="Used to sign in."
					/>
				)}
				<div className="flex justify-end">
					<Button
						type="submit"
						disabled={!trimmed || trimmed === viewer.name}
						isLoading={save.isPending}
					>
						Save profile
					</Button>
				</div>
			</form>
		</Card>
	);
}

function PreferencesSection() {
	const { data: viewer } = useViewer();
	const { preference, setPreference } = useTheme();
	const update = useAppMutation(api.users.updateSettings, {
		success: "Currency updated",
	});
	if (!viewer) return null;
	const themes: [ThemePreference, string, typeof Sun][] = [
		["light", "Light", Sun],
		["dark", "Dark", Moon],
		["system", "System", Monitor],
	];
	return (
		<Card id="preferences">
			<CardHeader title="Preferences" />
			<div className="space-y-6">
				<SelectField
					label="Currency"
					hint="Changes how amounts are shown. Amounts aren't converted."
					value={viewer.settings.currency}
					onValueChange={(currency) => update.mutate({ currency })}
					containerClassName="sm:max-w-xs"
				>
					{CURRENCIES.map((c) => (
						<SelectItem key={c.code} value={c.code}>
							{c.code} · {c.label}
						</SelectItem>
					))}
				</SelectField>
				<fieldset>
					<legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
						Theme
					</legend>
					<div className="grid grid-cols-3 gap-2 sm:max-w-sm">
						{themes.map(([value, label, Icon]) => (
							<button
								key={value}
								type="button"
								aria-pressed={preference === value}
								onClick={() => setPreference(value)}
								className={cn(
									"flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
									preference === value
										? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
										: "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
								)}
							>
								<Icon size={18} />
								{label}
							</button>
						))}
					</div>
				</fieldset>
			</div>
		</Card>
	);
}

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, "Enter your current password."),
		newPassword: passwordRules,
		confirm: z.string(),
	})
	.refine((v) => v.newPassword === v.confirm, {
		message: "Passwords don't match.",
		path: ["confirm"],
	});

function SecuritySection() {
	const form = useZodForm(passwordSchema, {
		currentPassword: "",
		newPassword: "",
		confirm: "",
	});
	const changePassword = useConvexAction(api.users.changePassword);
	const signOutOthers = useMutation({
		mutationFn: useConvexAction(api.users.signOutOtherSessions),
		onSuccess: () => toast.success("Signed out of all other devices"),
		onError: (e) => toast.error(errorMessage(e)),
	});

	return (
		<Card id="security">
			<CardHeader title="Security" />
			<form
				noValidate
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					form.submit(async ({ currentPassword, newPassword }) => {
						try {
							await changePassword({ currentPassword, newPassword });
							toast.success("Password changed. Other devices were signed out.");
							form.reset({ currentPassword: "", newPassword: "", confirm: "" });
						} catch (error) {
							toast.error(errorMessage(error));
							throw error;
						}
					});
				}}
			>
				<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
					Change password
				</h3>
				<InputField
					label="Current password"
					type="password"
					autoComplete="current-password"
					{...form.field("currentPassword")}
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<InputField
						label="New password"
						type="password"
						autoComplete="new-password"
						hint="At least 8 characters."
						{...form.field("newPassword")}
					/>
					<InputField
						label="Confirm new password"
						type="password"
						autoComplete="new-password"
						{...form.field("confirm")}
					/>
				</div>
				<div className="flex justify-end">
					<Button type="submit" isLoading={form.submitting}>
						Update password
					</Button>
				</div>
			</form>
			<div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
				<div>
					<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
						Other devices
					</h3>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Signed in somewhere you don't recognise? Sign out everywhere else.
					</p>
				</div>
				<Button
					variant="secondary"
					icon={<LogOut size={16} />}
					isLoading={signOutOthers.isPending}
					onClick={() => signOutOthers.mutate({})}
				>
					Sign out other devices
				</Button>
			</div>
		</Card>
	);
}

function DataSection() {
	const { data: viewer } = useViewer();
	const { data: transactions } = useTransactions();
	const { data: accounts } = useAccounts();
	const { data: budgets } = useBudgets();
	const { data: goals } = useGoals();
	const { data: clients } = useClients();
	const { signOut } = useAuthActions();
	const queryClient = useQueryClient();
	const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
	const reset = useAppMutation(api.users.resetWorkspace, {
		success: "Workspace cleared",
	});
	const deleteAccount = useAppMutation(api.users.deleteAccount);

	const ready = transactions && accounts && budgets && goals && clients;

	const exportAll = () => {
		if (!ready) return;
		const strip = <T extends { userId: unknown }>(rows: T[]) =>
			rows.map(({ userId, ...rest }) => rest);
		downloadFile(
			`prospera-backup-${todayIso()}.json`,
			JSON.stringify(
				{
					exportedAt: new Date().toISOString(),
					currency: viewer?.settings.currency,
					accounts: strip(accounts),
					transactions: strip(transactions),
					budgets: strip(budgets),
					goals: strip(goals),
					clients: strip(clients),
				},
				null,
				2,
			),
			"application/json",
		);
		toast.success("Backup downloaded");
	};

	return (
		<Card id="data">
			<CardHeader
				title="Your data"
				description="It's yours. Take it with you or remove it whenever you like."
			/>
			<div className="divide-y divide-slate-100 dark:divide-slate-800">
				<div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
							Download a backup
						</h3>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Everything in one JSON file: accounts, transactions, budgets,
							goals and clients.
						</p>
					</div>
					<Button
						variant="secondary"
						icon={<Download size={16} />}
						disabled={!ready}
						onClick={exportAll}
					>
						Download
					</Button>
				</div>
				<div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
							Reset workspace
						</h3>
						<p className="text-sm text-slate-500 dark:text-slate-400">
							Delete all financial data but keep your account. Handy after
							trying the sample data.
						</p>
					</div>
					<Button variant="secondary" onClick={() => setConfirm("reset")}>
						Reset…
					</Button>
				</div>
				{!viewer?.isGuest && (
					<div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
								Delete account
							</h3>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								Permanently delete your account and everything in it.
							</p>
						</div>
						<Button variant="danger" onClick={() => setConfirm("delete")}>
							Delete account…
						</Button>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={confirm === "reset"}
				onOpenChange={(open) => !open && setConfirm(null)}
				title="Reset your workspace?"
				description="All accounts, transactions, budgets, goals and clients will be permanently deleted. Download a backup first if you might want them later."
				confirmLabel="Delete all data"
				confirmText="reset"
				onConfirm={() => reset.mutateAsync({})}
			/>
			<ConfirmDialog
				open={confirm === "delete"}
				onOpenChange={(open) => !open && setConfirm(null)}
				title="Delete your account?"
				description="This permanently deletes your account and all of your data. It can't be undone."
				confirmLabel="Delete my account"
				confirmText={viewer?.email ?? ""}
				onConfirm={async (typed) => {
					await deleteAccount.mutateAsync({ confirmEmail: typed });
					queryClient.clear();
					await signOut().catch(() => undefined);
				}}
			/>
		</Card>
	);
}

function GuestNotice() {
	const openAuth = useOpenAuthScreen();
	return (
		<Card className="border-violet-200 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-500/10">
			<h2 className="font-semibold text-slate-900 dark:text-white">
				You're using a guest workspace
			</h2>
			<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
				It's filled with sample data so you can try everything. Guest workspaces
				are removed after 7 days. Create an account to keep this workspace,
				including any changes you've made, and sign in from any device.
			</p>
			<div className="mt-4 flex flex-wrap gap-2">
				<Button
					icon={<UserPlus size={16} />}
					onClick={() => openAuth("signUp")}
				>
					Create an account
				</Button>
				<Button variant="secondary" onClick={() => openAuth("signIn")}>
					Sign in
				</Button>
			</div>
		</Card>
	);
}

export default function Settings() {
	const { data: viewer } = useViewer();
	if (!viewer) return <PageSkeleton tiles={0} />;
	const sections = SECTIONS.filter(
		(s) => !(viewer.isGuest && s.id === "security"),
	);
	return (
		<div className="page">
			<Header
				heading="Settings"
				subheading="Manage your profile, preferences and data."
			/>
			<div className="grid gap-6 lg:grid-cols-[13rem_1fr]">
				{/* Stays pinned while scrolling: a tab strip on phones, a list on desktop. */}
				<nav
					aria-label="Settings sections"
					className="sticky top-0 z-10 -mx-4 bg-slate-50/90 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-6 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:bg-slate-950/90 lg:dark:bg-transparent"
				>
					<ul className="flex gap-1 overflow-x-auto lg:flex-col">
						{sections.map((s) => (
							<li key={s.id}>
								<a
									href={`#${s.id}`}
									onClick={(e) => {
										e.preventDefault();
										document
											.getElementById(s.id)
											?.scrollIntoView({ behavior: "smooth", block: "start" });
									}}
									className="nav-item whitespace-nowrap"
								>
									<s.icon size={18} />
									{s.label}
								</a>
							</li>
						))}
					</ul>
				</nav>
				<div className="max-w-3xl min-w-0 space-y-6 [&>*]:scroll-mt-20 lg:[&>*]:scroll-mt-6">
					{viewer.isGuest && <GuestNotice />}
					<ProfileSection />
					<PreferencesSection />
					{!viewer.isGuest && <SecuritySection />}
					<DataSection />
				</div>
			</div>
		</div>
	);
}
