import type { LucideIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/lib/cn";

export function EmptyState({
	icon: Icon,
	title,
	description,
	children,
	className,
}: {
	icon: LucideIcon;
	title: string;
	description?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex animate-rise flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40",
				className,
			)}
		>
			<div className="relative mb-5">
				<div className="absolute inset-0 scale-150 rounded-full bg-violet-500/15 blur-xl" />
				<div className="relative flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25">
					<Icon size={26} />
				</div>
			</div>
			<h3 className="text-lg font-semibold text-slate-900 dark:text-white">
				{title}
			</h3>
			{description && (
				<p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
					{description}
				</p>
			)}
			{children && (
				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					{children}
				</div>
			)}
		</div>
	);
}
