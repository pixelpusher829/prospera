import type React from "react";
import { cn } from "@/shared/lib/cn";

export function Card({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("card p-5 sm:p-6", className)} {...props} />;
}

export function CardHeader({
	title,
	description,
	action,
	className,
}: {
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn("mb-5 flex items-start justify-between gap-4", className)}
		>
			<div className="min-w-0">
				<h2 className="text-base font-semibold text-slate-900 dark:text-white">
					{title}
				</h2>
				{description && (
					<p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
						{description}
					</p>
				)}
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</div>
	);
}
