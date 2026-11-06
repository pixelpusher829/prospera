import { cva, type VariantProps } from "class-variance-authority";
import type React from "react";
import { cn } from "@/shared/lib/cn";

const badgeVariants = cva(
	"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
	{
		variants: {
			tone: {
				success:
					"bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
				warning:
					"bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/20",
				danger:
					"bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/20",
				neutral:
					"bg-zinc-100 text-zinc-600 ring-zinc-500/15 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20",
				brand:
					"bg-accent-50 text-accent-700 ring-accent-600/15 dark:bg-accent-500/10 dark:text-accent-300 dark:ring-accent-400/20",
			},
		},
		defaultVariants: { tone: "neutral" },
	},
);

const dotColor = {
	success: "bg-emerald-500",
	warning: "bg-amber-500",
	danger: "bg-red-500",
	neutral: "bg-zinc-400",
	brand: "bg-accent-500",
};

export function Badge({
	tone,
	dot,
	className,
	children,
}: VariantProps<typeof badgeVariants> & {
	dot?: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<span className={cn(badgeVariants({ tone }), className)}>
			{dot && (
				<span
					aria-hidden
					className={cn("size-1.5 rounded-full", dotColor[tone ?? "neutral"])}
				/>
			)}
			{children}
		</span>
	);
}

const STATUS_TONES = {
	Active: "success",
	cleared: "success",
	Pending: "warning",
	pending: "warning",
	Inactive: "neutral",
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS_TONES }) {
	return (
		<Badge tone={STATUS_TONES[status]} dot className="capitalize">
			{status}
		</Badge>
	);
}
