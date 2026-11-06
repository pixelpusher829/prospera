import { useId } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * A quiet trend line with a soft fill. Colour comes from `currentColor`,
 * or the logo's coral-to-pink gradient when `brand` is set.
 */
export function Sparkline({
	values,
	className,
	label,
	brand = false,
}: {
	values: number[];
	className?: string;
	label?: string;
	brand?: boolean;
}) {
	// useId can contain characters that break `url(#…)` references.
	const id = `spark${useId().replace(/[^\w-]/g, "")}`;
	if (values.length < 2) return null;

	const W = 100;
	const H = 32;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min || 1;
	const pts = values.map((v, i) => [
		(i / (values.length - 1)) * W,
		// Keep 2px of headroom so the stroke isn't clipped.
		2 + (1 - (v - min) / span) * (H - 4),
	]);
	const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
	const area = `${line} L${W},${H} L0,${H} Z`;

	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			preserveAspectRatio="none"
			className={cn("block w-full overflow-visible", className)}
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			<defs>
				<linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
					<stop
						offset="0%"
						stopColor={brand ? "var(--color-brand-pink)" : "currentColor"}
						stopOpacity={brand ? 0.14 : 0.12}
					/>
					<stop
						offset="100%"
						stopColor={brand ? "var(--color-brand-pink)" : "currentColor"}
						stopOpacity={0}
					/>
				</linearGradient>
				<linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor="var(--color-brand-red)" />
					<stop offset="100%" stopColor="var(--color-brand-pink)" />
				</linearGradient>
			</defs>
			<path d={area} fill={`url(#${id}f)`} />
			<path
				d={line}
				fill="none"
				stroke={brand ? `url(#${id}s)` : "currentColor"}
				strokeWidth={brand ? 2 : 1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}
