import { Check } from "lucide-react";
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
					className="block cursor-pointer text-sm font-medium text-slate-900 dark:text-white"
				>
					{label}
				</label>
				{description && (
					<p
						id={`${id}-desc`}
						className="mt-0.5 text-sm text-slate-500 dark:text-slate-400"
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
					checked ? "bg-violet-600" : "bg-slate-200 dark:bg-slate-700",
				)}
			>
				<span
					aria-hidden
					className={cn(
						"inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
						checked ? "translate-x-[22px]" : "translate-x-0.5",
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
				"inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200",
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
				className="size-4 shrink-0 cursor-pointer rounded border-slate-300 dark:border-slate-600"
			/>
			<span className={labelHidden ? "sr-only" : undefined}>{label}</span>
		</label>
	);
}

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

/** Colour swatches backed by radio inputs, so arrow keys work. */
export function ColorPicker({
	value,
	onChange,
	label = "Colour",
	size = "md",
}: {
	value: string;
	onChange: (color: string) => void;
	label?: string;
	size?: "sm" | "md";
}) {
	const name = useId();
	return (
		<fieldset>
			<legend
				className={cn(
					"mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200",
					size === "sm" && "sr-only",
				)}
			>
				{label}
			</legend>
			<div className="flex flex-wrap gap-2">
				{COLOR_PALETTE.map((color) => (
					<label
						key={color}
						className={cn(
							"relative flex cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-white transition-transform hover:scale-110 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 dark:ring-offset-slate-900",
							size === "sm" ? "size-6" : "size-8",
						)}
						style={{ backgroundColor: color }}
					>
						<input
							type="radio"
							name={name}
							value={color}
							checked={value === color}
							onChange={() => onChange(color)}
							className="sr-only"
						/>
						<span className="sr-only">{color}</span>
						{value === color && (
							<Check size={size === "sm" ? 12 : 16} className="text-white" />
						)}
					</label>
				))}
			</div>
		</fieldset>
	);
}
