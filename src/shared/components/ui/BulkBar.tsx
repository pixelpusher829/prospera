import { X } from "lucide-react";
import type React from "react";

/** Floating action bar shown while rows are selected. */
export function BulkBar({
	count,
	noun,
	onClear,
	children,
}: {
	count: number;
	noun: string;
	onClear: () => void;
	children: React.ReactNode;
}) {
	if (count === 0) return null;
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pl-64">
			<div
				role="toolbar"
				aria-label={`Actions for ${count} selected ${noun}`}
				className="pointer-events-auto flex max-w-full animate-rise items-center gap-1 overflow-x-auto rounded-2xl bg-slate-900 p-1.5 pl-3 text-white sm:pl-4 shadow-2xl shadow-slate-900/30 ring-1 ring-white/10 dark:bg-slate-800"
			>
				<span
					className="mr-1 text-sm font-medium whitespace-nowrap sm:mr-2"
					aria-live="polite"
				>
					{count} selected
				</span>
				<span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
				{children}
				<button
					type="button"
					onClick={onClear}
					className="ml-1 rounded-xl p-2.5 text-slate-300 sm:p-2 hover:bg-white/10 hover:text-white"
					aria-label="Clear selection"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
}

export function BulkButton({
	children,
	danger,
	icon,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	danger?: boolean;
	icon?: React.ReactNode;
	ref?: React.Ref<HTMLButtonElement>;
}) {
	return (
		<button
			type="button"
			{...props}
			className={
				danger
					? "inline-flex items-center gap-1.5 rounded-xl p-2.5 text-sm font-medium whitespace-nowrap text-red-300 sm:px-3 sm:py-2 hover:bg-red-500/20 hover:text-red-200 [&>svg]:size-4"
					: "inline-flex items-center gap-1.5 rounded-xl p-2.5 text-sm font-medium whitespace-nowrap text-slate-200 sm:px-3 sm:py-2 hover:bg-white/10 hover:text-white [&>svg]:size-4"
			}
		>
			{icon}
			{/* Icon-only on phones so every action fits without scrolling. */}
			<span className="sr-only sm:not-sr-only">{children}</span>
		</button>
	);
}
