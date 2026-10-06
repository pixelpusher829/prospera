import type React from "react";
import { useId } from "react";
import { cn } from "@/shared/lib/cn";

export const inputClass =
	"h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 shadow-xs transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 read-only:bg-slate-50 sm:h-10 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:read-only:bg-slate-800/50";

export const invalidClass =
	"border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/70";

type FieldShellProps = {
	id: string;
	label?: React.ReactNode;
	hint?: React.ReactNode;
	error?: string;
	children: React.ReactNode;
	className?: string;
};

/** Label, control, hint and error, wired together for screen readers. */
export function FieldShell({
	id,
	label,
	hint,
	error,
	children,
	className,
}: FieldShellProps) {
	return (
		<div className={cn("w-full", className)}>
			{label && (
				<label
					htmlFor={id}
					className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
				>
					{label}
				</label>
			)}
			{children}
			{error ? (
				<p
					id={`${id}-error`}
					role="alert"
					className="mt-1.5 text-sm text-red-600 dark:text-red-400"
				>
					{error}
				</p>
			) : hint ? (
				<p
					id={`${id}-hint`}
					className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
				>
					{hint}
				</p>
			) : null}
		</div>
	);
}

export function describedBy(id: string, error?: string, hint?: unknown) {
	return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export type InputFieldProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"prefix"
> & {
	label?: React.ReactNode;
	hint?: React.ReactNode;
	error?: string;
	/** Icon inside the left edge. */
	icon?: React.ReactNode;
	/** Short text inside the left edge, e.g. a currency symbol. */
	prefix?: React.ReactNode;
	/** Element inside the right edge, e.g. a clear button. */
	suffix?: React.ReactNode;
	containerClassName?: string;
	ref?: React.Ref<HTMLInputElement>;
};

export function InputField({
	label,
	hint,
	error,
	icon,
	prefix,
	suffix,
	id: idProp,
	className,
	containerClassName,
	...props
}: InputFieldProps) {
	const autoId = useId();
	const id = idProp ?? autoId;
	const lead = icon ?? prefix;
	return (
		<FieldShell
			id={id}
			label={label}
			hint={hint}
			error={error}
			className={containerClassName}
		>
			<div className="relative">
				{lead && (
					<span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400 [&>svg]:size-4">
						{lead}
					</span>
				)}
				<input
					id={id}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedBy(id, error, hint)}
					className={cn(
						inputClass,
						lead ? "pl-10" : undefined,
						suffix && "pr-10",
						error && invalidClass,
						className,
					)}
					{...props}
				/>
				{suffix && (
					<span className="absolute inset-y-0 right-2 flex items-center">
						{suffix}
					</span>
				)}
			</div>
		</FieldShell>
	);
}

/**
 * Text input for amounts. Keeps the raw string (so "12." can be typed) and
 * strips anything that isn't a digit or decimal point.
 */
export function MoneyField({
	value,
	onValueChange,
	symbol,
	allowNegative = false,
	...props
}: Omit<InputFieldProps, "value" | "onChange" | "type" | "prefix"> & {
	value: string;
	onValueChange: (value: string) => void;
	symbol: string;
	allowNegative?: boolean;
}) {
	return (
		<InputField
			{...props}
			type="text"
			inputMode="decimal"
			autoComplete="off"
			prefix={symbol}
			className={cn(symbol.length > 1 && "pl-12", "tabular-nums")}
			value={value}
			onChange={(e) => {
				let next = e.target.value.replace(
					allowNegative ? /[^\d.-]/g : /[^\d.]/g,
					"",
				);
				const negative = allowNegative && next.startsWith("-");
				next = next.replace(/-/g, "");
				const [whole, ...rest] = next.split(".");
				next = rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
				onValueChange(negative ? `-${next}` : next);
			}}
		/>
	);
}

export function TextAreaField({
	label,
	hint,
	error,
	id: idProp,
	className,
	...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label?: React.ReactNode;
	hint?: React.ReactNode;
	error?: string;
}) {
	const autoId = useId();
	const id = idProp ?? autoId;
	return (
		<FieldShell id={id} label={label} hint={hint} error={error}>
			<textarea
				id={id}
				aria-invalid={error ? true : undefined}
				aria-describedby={describedBy(id, error, hint)}
				className={cn(
					inputClass,
					"h-auto min-h-24 resize-y py-2.5",
					error && invalidClass,
					className,
				)}
				{...props}
			/>
		</FieldShell>
	);
}
