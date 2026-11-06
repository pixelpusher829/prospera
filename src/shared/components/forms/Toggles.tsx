import type React from "react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/shared/lib/cn";

export function Switch({
	checked,
	onCheckedChange,
	label,
	description,
	disabled,
}: {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	label: React.ReactNode;
	description?: React.ReactNode;
	disabled?: boolean;
}) {
	const id = useId();
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="min-w-0">
				<label
					htmlFor={id}
					className="block cursor-pointer text-sm font-medium text-zinc-900 dark:text-white"
				>
					{label}
				</label>
				{description && (
					<p
						id={`${id}-desc`}
						className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400"
					>
						{description}
					</p>
				)}
			</div>
			<button
				id={id}
				type="button"
				role="switch"
				aria-checked={checked}
				aria-describedby={description ? `${id}-desc` : undefined}
				disabled={disabled}
				onClick={() => onCheckedChange(!checked)}
				className={cn(
					"relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
					checked
						? "bg-zinc-900 dark:bg-white"
						: "bg-zinc-200 dark:bg-zinc-700",
				)}
			>
				<span
					aria-hidden
					className={cn(
						"inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
						checked ? "translate-x-[22px] dark:bg-zinc-900" : "translate-x-0.5",
					)}
				/>
			</button>
		</div>
	);
}

export function Checkbox({
	checked,
	indeterminate = false,
	onCheckedChange,
	label,
	labelHidden = false,
	className,
}: {
	checked: boolean;
	indeterminate?: boolean;
	onCheckedChange: (checked: boolean) => void;
	label: React.ReactNode;
	labelHidden?: boolean;
	className?: string;
}) {
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (ref.current) ref.current.indeterminate = indeterminate;
	}, [indeterminate]);
	return (
		<label
			className={cn(
				"inline-flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-200",
				className,
			)}
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
		>
			<input
				ref={ref}
				type="checkbox"
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
				className="size-4 shrink-0 cursor-pointer rounded border-zinc-300 dark:border-zinc-600"
			/>
			<span className={labelHidden ? "sr-only" : undefined}>{label}</span>
		</label>
	);
}

/** Stored default colours for budgets and goals (no longer shown in the UI). */
export const COLOR_PALETTE = [
	"#8b5cf6",
	"#ec4899",
	"#10b981",
	"#f59e0b",
	"#3b82f6",
	"#ef4444",
	"#6366f1",
	"#f97316",
	"#06b6d4",
	"#64748b",
];
