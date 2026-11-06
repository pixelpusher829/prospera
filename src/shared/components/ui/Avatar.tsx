import { cn } from "@/shared/lib/cn";

const TONES = [
	"bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
	"bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
	"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
	"bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
	"bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
];

export function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	const first = parts[0][0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
	return (first + last).toUpperCase();
}

/** Initials on a tint picked from the name, so it's stable per person. */
export function Avatar({
	name,
	size = "md",
	className,
}: {
	name: string;
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	let hash = 0;
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
	const tone = TONES[Math.abs(hash) % TONES.length];
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
				tone,
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
