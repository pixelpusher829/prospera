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
				"flex animate-rise flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-transparent px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/40",
				className,
			)}
		>
			<div className="mb-5 flex size-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
				<Icon size={22} />
			</div>
			<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
				{title}
			</h3>
			{description && (
				<p className="mt-1.5 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
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
