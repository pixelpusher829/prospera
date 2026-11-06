/**
 * Icon-tile colours. Icons use `icon` (flat neutral, near-black glyph) everywhere;
 * `emerald` is for income/positive. Keep to these so colour stays deliberate.
 */
export const TINTS = {
	/** Default for icon tiles. */
	icon: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
	brand:
		"bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400",
	emerald:
		"bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
	sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
	amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
	/** Default icon tile: flat (no border/shadow, so it never looks clickable) with a near-black icon for weight. */
	neutral: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white",
} as const;

export type Tint = keyof typeof TINTS;

/** The logo's coral-to-pink, for progress fills and other brand moments. */
export const BRAND_GRADIENT = "bg-linear-to-r from-brand-red to-brand-pink";
