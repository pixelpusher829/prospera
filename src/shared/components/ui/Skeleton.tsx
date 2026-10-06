import { cn } from "@/shared/lib/cn";

export function Skeleton({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn(
				"animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800",
				className,
			)}
		/>
	);
}

/** Generic page placeholder: header, a row of tiles and a large panel. */
export function PageSkeleton({ tiles = 3 }: { tiles?: number }) {
	return (
		<div className="page" aria-busy="true">
			<span className="sr-only">Loading…</span>
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-72 max-w-full" />
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: tiles }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
					<Skeleton key={i} className="h-32 rounded-2xl" />
				))}
			</div>
			<Skeleton className="h-80 rounded-2xl" />
		</div>
	);
}
