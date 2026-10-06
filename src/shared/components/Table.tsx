import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type React from "react";
import { Checkbox } from "@/shared/components/forms";
import { cn } from "@/shared/lib/cn";

export interface Column<T> {
	header: string;
	/** Key used for sorting; omit to make the column unsortable. */
	sortKey?: string;
	cell: (row: T) => React.ReactNode;
	className?: string;
	align?: "left" | "right";
}

export type SortState = { key: string; direction: "asc" | "desc" };

interface TableProps<T> {
	data: T[];
	columns: Column<T>[];
	getRowId: (row: T) => string;
	/** Short description of a row for screen readers, e.g. its name. */
	getRowLabel: (row: T) => string;
	sort?: SortState;
	onSort?: (key: string) => void;
	selectedIds?: Set<string>;
	onSelectionChange?: (ids: Set<string>) => void;
	onRowClick?: (row: T) => void;
	renderRowActions?: (row: T) => React.ReactNode;
	/** Card layout for phones; the table is used from `md` up. */
	renderMobileRow: (row: T) => React.ReactNode;
	empty: React.ReactNode;
	caption: string;
}

export default function Table<T>({
	data,
	columns,
	getRowId,
	getRowLabel,
	sort,
	onSort,
	selectedIds,
	onSelectionChange,
	onRowClick,
	renderRowActions,
	renderMobileRow,
	empty,
	caption,
}: TableProps<T>) {
	const selectable = Boolean(selectedIds && onSelectionChange);
	const selectedCount = data.filter((row) =>
		selectedIds?.has(getRowId(row)),
	).length;
	const allSelected = data.length > 0 && selectedCount === data.length;

	const toggle = (id: string) => {
		if (!selectedIds || !onSelectionChange) return;
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		onSelectionChange(next);
	};

	const toggleAll = () => {
		onSelectionChange?.(
			allSelected ? new Set() : new Set(data.map((row) => getRowId(row))),
		);
	};

	if (data.length === 0) return <>{empty}</>;

	return (
		<>
			{/* Phones: stacked cards */}
			<ul className="space-y-2 md:hidden" aria-label={caption}>
				{data.map((row) => {
					const id = getRowId(row);
					return (
						<li
							key={id}
							className={cn(
								"card flex items-center gap-3 p-3.5 transition-colors",
								selectedIds?.has(id) &&
									"border-violet-300 bg-violet-50/60 dark:border-violet-700 dark:bg-violet-500/10",
							)}
						>
							{selectable && (
								<Checkbox
									checked={selectedIds?.has(id) ?? false}
									onCheckedChange={() => toggle(id)}
									label={`Select ${getRowLabel(row)}`}
									labelHidden
									className="p-1"
								/>
							)}
							<button
								type="button"
								className="min-w-0 flex-1 text-left"
								onClick={() => onRowClick?.(row)}
								disabled={!onRowClick}
							>
								{renderMobileRow(row)}
							</button>
						</li>
					);
				})}
			</ul>

			{/* Tablet and up: real table */}
			<div className="card hidden overflow-hidden md:block">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<caption className="sr-only">{caption}</caption>
						<thead>
							<tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900">
								{selectable && (
									<th scope="col" className="w-12 py-3 pl-5">
										<Checkbox
											checked={allSelected}
											indeterminate={selectedCount > 0 && !allSelected}
											onCheckedChange={toggleAll}
											label="Select all rows"
											labelHidden
										/>
									</th>
								)}
								{columns.map((col) => {
									const active = sort && col.sortKey === sort.key;
									return (
										<th
											key={col.header}
											scope="col"
											aria-sort={
												active
													? sort.direction === "asc"
														? "ascending"
														: "descending"
													: undefined
											}
											className={cn(
												"px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400",
												col.align === "right" && "text-right",
											)}
										>
											{col.sortKey && onSort ? (
												<button
													type="button"
													onClick={() => onSort(col.sortKey as string)}
													className={cn(
														"inline-flex items-center gap-1 rounded uppercase hover:text-slate-800 dark:hover:text-white",
														active && "text-slate-800 dark:text-white",
													)}
												>
													{col.header}
													{active ? (
														sort.direction === "asc" ? (
															<ArrowUp size={13} />
														) : (
															<ArrowDown size={13} />
														)
													) : (
														<ChevronsUpDown size={13} className="opacity-40" />
													)}
												</button>
											) : (
												col.header
											)}
										</th>
									);
								})}
								{renderRowActions && (
									<th scope="col" className="w-14">
										<span className="sr-only">Actions</span>
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
							{data.map((row) => {
								const id = getRowId(row);
								const selected = selectedIds?.has(id);
								return (
									<tr
										key={id}
										onClick={() => onRowClick?.(row)}
										className={cn(
											"group transition-colors",
											onRowClick &&
												"cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50",
											selected &&
												"bg-violet-50/60 hover:bg-violet-50 dark:bg-violet-500/10 dark:hover:bg-violet-500/15",
										)}
									>
										{selectable && (
											<td className="py-3 pl-5">
												<Checkbox
													checked={selected ?? false}
													onCheckedChange={() => toggle(id)}
													label={`Select ${getRowLabel(row)}`}
													labelHidden
												/>
											</td>
										)}
										{columns.map((col, i) => (
											<td
												key={col.header}
												className={cn(
													"px-4 py-3 whitespace-nowrap",
													col.align === "right" && "text-right",
													col.className,
												)}
											>
												{i === 0 && onRowClick ? (
													<button
														type="button"
														className="text-left focus-visible:outline-offset-4"
														onClick={(e) => {
															e.stopPropagation();
															onRowClick(row);
														}}
														aria-label={`Open ${getRowLabel(row)}`}
													>
														{col.cell(row)}
													</button>
												) : (
													col.cell(row)
												)}
											</td>
										))}
										{renderRowActions && (
											<td
												className="pr-3 text-right"
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
											>
												{renderRowActions(row)}
											</td>
										)}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}
