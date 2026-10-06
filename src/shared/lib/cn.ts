import { twMerge } from "tailwind-merge";

/** Joins class names, letting later Tailwind classes override earlier ones. */
export function cn(...classes: unknown[]) {
	return twMerge(
		classes
			.filter((c): c is string => typeof c === "string" && c !== "")
			.join(" "),
	);
}
