import * as Dropdown from "@radix-ui/react-dropdown-menu";
import * as RadixPopover from "@radix-ui/react-popover";
import type React from "react";
import { cn } from "@/shared/lib/cn";

const surface =
	"z-50 min-w-44 max-w-[calc(100vw-1.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg shadow-slate-900/5 outline-none data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40";

/** A dropdown of actions. `trigger` must be a single focusable element. */
export function Menu({
	trigger,
	children,
	align = "end",
	label,
}: {
	trigger: React.ReactNode;
	children: React.ReactNode;
	align?: "start" | "end";
	label?: string;
}) {
	return (
		<Dropdown.Root modal={false}>
			<Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
			<Dropdown.Portal>
				<Dropdown.Content
					align={align}
					sideOffset={6}
					collisionPadding={12}
					className={cn(
						surface,
						"max-h-[var(--radix-dropdown-menu-content-available-height)]",
					)}
					aria-label={label}
				>
					{children}
				</Dropdown.Content>
			</Dropdown.Portal>
		</Dropdown.Root>
	);
}

export function MenuItem({
	icon,
	children,
	onSelect,
	danger,
	disabled,
}: {
	icon?: React.ReactNode;
	children: React.ReactNode;
	onSelect: () => void;
	danger?: boolean;
	disabled?: boolean;
}) {
	return (
		<Dropdown.Item
			disabled={disabled}
			onSelect={onSelect}
			className={cn(
				"flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				danger
					? "text-red-600 data-[highlighted]:bg-red-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10"
					: "text-slate-700 data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:data-[highlighted]:bg-slate-800",
			)}
		>
			{icon && <span className="opacity-70 [&>svg]:size-4">{icon}</span>}
			{children}
		</Dropdown.Item>
	);
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
	return (
		<Dropdown.Label className="px-2.5 pt-2 pb-1 text-xs font-medium text-slate-400 dark:text-slate-500">
			{children}
		</Dropdown.Label>
	);
}

export function MenuSeparator() {
	return (
		<Dropdown.Separator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
	);
}

/** A floating panel for filters and pickers. */
export function Popover({
	trigger,
	children,
	align = "end",
	className,
	open,
	onOpenChange,
}: {
	trigger: React.ReactNode;
	children: React.ReactNode;
	align?: "start" | "center" | "end";
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	return (
		<RadixPopover.Root open={open} onOpenChange={onOpenChange}>
			<RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
			<RadixPopover.Portal>
				<RadixPopover.Content
					align={align}
					sideOffset={8}
					collisionPadding={12}
					className={cn(
						surface,
						"max-h-[var(--radix-popover-content-available-height)] w-72 p-4",
						className,
					)}
				>
					{children}
				</RadixPopover.Content>
			</RadixPopover.Portal>
		</RadixPopover.Root>
	);
}
