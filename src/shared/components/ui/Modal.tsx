import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/lib/cn";

type ModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
	/** Wraps body and footer in a form so Enter submits. */
	onSubmit?: () => void;
	size?: "sm" | "md" | "lg";
	/** "sheet" slides in from the right; better for long, editable records. */
	variant?: "dialog" | "sheet";
};

const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

/**
 * Accessible modal built on Radix Dialog: traps focus, closes on Escape and
 * outside click, restores focus, and becomes a bottom sheet on phones.
 */
export function Modal({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	onSubmit,
	size = "md",
	variant = "dialog",
}: ModalProps) {
	const isSheet = variant === "sheet";
	const body = (
		<>
			<div
				className={cn(
					"min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
					!footer && "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
				)}
			>
				{children}
			</div>
			{footer && (
				<div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-900/60">
					{footer}
				</div>
			)}
		</>
	);

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in dark:bg-black/60" />
				<Dialog.Content
					className={cn(
						"fixed z-50 flex flex-col bg-white shadow-2xl outline-none dark:bg-slate-900 dark:ring-1 dark:ring-slate-800",
						isSheet
							? "inset-y-0 right-0 w-full pt-[env(safe-area-inset-top)] data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in sm:max-w-md"
							: cn(
									"inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl data-[state=closed]:animate-fade-out data-[state=open]:animate-rise",
									"sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:data-[state=closed]:animate-pop-out sm:data-[state=open]:animate-pop-in",
									sizes[size],
								),
					)}
				>
					<div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 dark:border-slate-800">
						<div className="min-w-0">
							<Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-white">
								{title}
							</Dialog.Title>
							<Dialog.Description
								className={
									description
										? "mt-0.5 text-sm text-slate-500 dark:text-slate-400"
										: "sr-only"
								}
							>
								{description ?? (typeof title === "string" ? title : "")}
							</Dialog.Description>
						</div>
						<Dialog.Close
							className="-mr-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
							aria-label="Close"
						>
							<X size={18} />
						</Dialog.Close>
					</div>
					{onSubmit ? (
						<form
							noValidate
							className="flex min-h-0 flex-1 flex-col"
							onSubmit={(e) => {
								e.preventDefault();
								onSubmit();
							}}
						>
							{body}
						</form>
					) : (
						<div className="flex min-h-0 flex-1 flex-col">{body}</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
