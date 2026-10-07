import type React from "react";
import { useEffect } from "react";

/** Page title block. Also sets the browser tab title. */
export default function Header({
	heading,
	subheading,
	children,
	title,
}: {
	heading: React.ReactNode;
	subheading?: React.ReactNode;
	children?: React.ReactNode;
	/** Tab title, when `heading` isn't plain text. */
	title?: string;
}) {
	const tabTitle = title ?? (typeof heading === "string" ? heading : undefined);
	useEffect(() => {
		if (tabTitle) document.title = `${tabTitle} · Prospera`;
	}, [tabTitle]);

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
					{heading}
				</h1>
				{subheading && (
					<p className="mt-1 text-sm text-slate-500 sm:text-base dark:text-slate-400">
						{subheading}
					</p>
				)}
			</div>
			{children && (
				<div className="flex flex-wrap items-center gap-2 *:grow sm:shrink-0 sm:justify-end sm:*:grow-0">
					{children}
				</div>
			)}
		</div>
	);
}
