import { api } from "@convex/_generated/api";
import {
	ArrowRightLeft,
	Check,
	PieChart,
	Sparkles,
	Target,
	Wallet,
	X,
} from "lucide-react";
import { Link } from "react-router-dom";
import Button, { buttonVariants } from "@/shared/components/Button";
import { useAppMutation } from "@/shared/hooks/data";
import { cn } from "@/shared/lib/cn";

export function LoadDemoButton({
	variant = "secondary",
}: {
	variant?: "secondary" | "ghost";
}) {
	const load = useAppMutation(api.demo.load, {
		success: "Sample data loaded. Have a look around!",
	});
	return (
		<Button
			variant={variant}
			icon={<Sparkles size={16} />}
			isLoading={load.isPending}
			onClick={() => load.mutate({})}
		>
			Load sample data
		</Button>
	);
}

type Step = {
	done: boolean;
	title: string;
	description: string;
	to: string;
	cta: string;
	icon: typeof Wallet;
};

export function Onboarding({
	name,
	hasAccounts,
	hasTransactions,
	hasBudget,
	hasGoals,
}: {
	name: string;
	hasAccounts: boolean;
	hasTransactions: boolean;
	hasBudget: boolean;
	hasGoals: boolean;
}) {
	const dismiss = useAppMutation(api.users.updateSettings);
	const steps: Step[] = [
		{
			done: hasAccounts,
			title: "Add an account",
			description: "Checking, savings, cards or loans.",
			to: "/wallet",
			cta: "Add account",
			icon: Wallet,
		},
		{
			done: hasTransactions,
			title: "Record some spending",
			description: "Add transactions or import a CSV.",
			to: "/transactions",
			cta: "Add transactions",
			icon: ArrowRightLeft,
		},
		{
			done: hasBudget,
			title: "Set a monthly budget",
			description: "Get alerts before you overspend.",
			to: "/budget",
			cta: "Create budget",
			icon: PieChart,
		},
		{
			done: hasGoals,
			title: "Create a savings goal",
			description: "A trip, a car, a safety net.",
			to: "/goals",
			cta: "Add goal",
			icon: Target,
		},
	];
	const completed = steps.filter((s) => s.done).length;
	const isEmpty = completed === 0;

	return (
		<section
			aria-labelledby="onboarding-title"
			className="card relative overflow-hidden p-5 sm:p-6"
		>
			<div className="absolute -top-24 -right-24 size-64 rounded-full bg-violet-500/10 blur-3xl" />
			<button
				type="button"
				onClick={() => dismiss.mutate({ onboardingDismissed: true })}
				className="absolute top-3 right-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
				aria-label="Hide getting started"
			>
				<X size={18} />
			</button>
			<div className="relative flex flex-col gap-1 pr-10 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2
						id="onboarding-title"
						className="text-lg font-semibold text-slate-900 dark:text-white"
					>
						{isEmpty ? `Welcome to Prospera, ${name}` : "Finish setting up"}
					</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						{isEmpty
							? "Four quick steps and your dashboard comes to life. Or load sample data to explore first."
							: `${completed} of ${steps.length} done.`}
					</p>
				</div>
				{isEmpty && (
					<div className="mt-3 sm:mt-0">
						<LoadDemoButton />
					</div>
				)}
			</div>
			<div
				className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
				aria-hidden
			>
				<div
					className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-500"
					style={{ width: `${(completed / steps.length) * 100}%` }}
				/>
			</div>
			<ol className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{steps.map((step) => (
					<li
						key={step.title}
						className={cn(
							"flex flex-col rounded-xl border p-4 transition-colors",
							step.done
								? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
								: "border-slate-200 dark:border-slate-800",
						)}
					>
						<div className="flex items-center gap-3">
							<span
								className={cn(
									"flex size-8 items-center justify-center rounded-lg",
									step.done
										? "bg-emerald-500 text-white"
										: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
								)}
							>
								{step.done ? <Check size={16} /> : <step.icon size={16} />}
							</span>
							<span className="font-medium text-slate-900 dark:text-white">
								{step.title}
								{step.done && <span className="sr-only"> (done)</span>}
							</span>
						</div>
						<p className="mt-2 flex-1 text-sm text-slate-500 dark:text-slate-400">
							{step.description}
						</p>
						{!step.done && (
							<Link
								to={step.to}
								className={cn(
									buttonVariants({ variant: "secondary", size: "sm" }),
									"mt-3 self-start",
								)}
							>
								{step.cta}
							</Link>
						)}
					</li>
				))}
			</ol>
		</section>
	);
}
