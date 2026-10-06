import { cn } from "@/shared/lib/cn";

const GRADIENTS = [
	"from-violet-500 to-fuchsia-500",
	"from-sky-500 to-indigo-500",
	"from-emerald-500 to-teal-500",
	"from-amber-500 to-orange-500",
	"from-rose-500 to-pink-500",
];

export function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	const first = parts[0][0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
	return (first + last).toUpperCase();
}

/** Initials on a gradient picked from the name, so it's stable per person. */
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
	const gradient = GRADIENTS[Math.abs(hash) % GRADIENTS.length];
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-semibold text-white",
				gradient,
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
