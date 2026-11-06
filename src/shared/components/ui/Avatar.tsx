import { cn } from "@/shared/lib/cn";

export function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	const first = parts[0][0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
	return (first + last).toUpperCase();
}

/** Initials on a neutral disc. Colour is reserved for things that carry meaning. */
export function Avatar({
	name,
	size = "md",
	className,
}: {
	name: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
				size === "sm" && "size-8 text-xs",
				size === "md" && "size-10 text-sm",
				size === "lg" && "size-16 text-xl",
				className,
			)}
		>
			{initials(name)}
		</span>
	);
}
