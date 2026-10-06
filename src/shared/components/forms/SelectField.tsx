import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type React from "react";
import { useId } from "react";
import { cn } from "@/shared/lib/cn";
import { describedBy, FieldShell, inputClass, invalidClass } from "./Field";

export type SelectFieldProps = {
	label?: React.ReactNode;
	hint?: React.ReactNode;
	error?: string;
	placeholder?: string;
	value: string | undefined;
	onValueChange: (value: string) => void;
	children: React.ReactNode;
	disabled?: boolean;
	name?: string;
	id?: string;
	className?: string;
	containerClassName?: string;
	"aria-label"?: string;
};

export default function SelectField({
	label,
	hint,
	error,
	placeholder,
	value,
	onValueChange,
	children,
	disabled,
	name,
	id: idProp,
	className,
	containerClassName,
	"aria-label": ariaLabel,
}: SelectFieldProps) {
	const autoId = useId();
	const id = idProp ?? autoId;
	return (
		<FieldShell
			id={id}
			label={label}
			hint={hint}
			error={error}
			className={containerClassName}
		>
			<Select.Root
				value={value}
				onValueChange={onValueChange}
				disabled={disabled}
				name={name}
			>
				<Select.Trigger
					id={id}
					aria-label={ariaLabel}
					aria-invalid={error ? true : undefined}
					aria-describedby={describedBy(id, error, hint)}
					className={cn(
						inputClass,
						"flex cursor-pointer items-center justify-between gap-2 text-left data-[placeholder]:text-slate-400",
						error && invalidClass,
						className,
					)}
				>
					<span className="truncate">
						<Select.Value placeholder={placeholder} />
					</span>
					<Select.Icon>
						<ChevronDown size={16} className="shrink-0 text-slate-400" />
					</Select.Icon>
				</Select.Trigger>
				<Select.Portal>
					<Select.Content
						position="popper"
						sideOffset={6}
						className="z-[60] max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
					>
						<Select.Viewport className="p-1">{children}</Select.Viewport>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</FieldShell>
	);
}

export function SelectItem({
	value,
	children,
	className,
}: {
	value: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<Select.Item
			value={value}
			className={cn(
				"relative flex cursor-pointer items-center rounded-lg py-2 pr-8 pl-2.5 text-sm text-slate-700 outline-none select-none data-[disabled]:pointer-events-none data-[highlighted]:bg-slate-100 data-[disabled]:opacity-50 dark:text-slate-200 dark:data-[highlighted]:bg-slate-800",
				className,
			)}
		>
			<Select.ItemText>{children}</Select.ItemText>
			<Select.ItemIndicator className="absolute right-2.5">
				<Check size={14} className="text-violet-600 dark:text-violet-400" />
			</Select.ItemIndicator>
		</Select.Item>
	);
}
