import type { Id } from "@convex/_generated/dataModel";
import {
	ArrowDownLeft,
	ArrowUpRight,
	ChevronDown,
	MoreHorizontal,
	Pencil,
	Trash2,
} from "lucide-react";
import type React from "react";
import Button from "@/shared/components/Button";
import Table, { type Column, type SortState } from "@/shared/components/Table";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Menu, MenuItem, MenuLabel } from "@/shared/components/ui/Menu";
import type { Transaction } from "@/shared/hooks/data";
import { cn } from "@/shared/lib/cn";
import { parseIsoDate } from "@/shared/lib/finance";

export const formatDate = (iso: string) =>
	parseIsoDate(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

export function TypeIcon({ type }: { type: Transaction["type"] }) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-9 shrink-0 items-center justify-center rounded-full",
				type === "income"
					? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
					: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
			)}
		>
			{type === "income" ? (
				<ArrowDownLeft size={16} />
			) : (
				<ArrowUpRight size={16} />
			)}
		</span>
	);
}

export function Amount({
	transaction,
	format,
	className,
}: {
	transaction: Pick<Transaction, "amount" | "type">;
	format: (n: number, o?: { sign?: boolean }) => string;
	className?: string;
}) {
	const income = transaction.type === "income";
	return (
		<span
			className={cn(
				"font-semibold tabular-nums",
				income
					? "text-emerald-600 dark:text-emerald-400"
					: "text-slate-900 dark:text-white",
				className,
			)}
		>
			{format(income ? transaction.amount : -transaction.amount, {
				sign: true,
			})}
		</span>
	);
}

interface TransactionsTableProps {
	transactions: Transaction[];
	accountNames: Map<string, string>;
	categories: string[];
	format: (n: number, o?: { sign?: boolean }) => string;
	sort: SortState;
	onSort: (key: string) => void;
	selectedIds: Set<string>;
	onSelectionChange: (ids: Set<string>) => void;
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
	onCategoryChange: (id: Id<"transactions">, category: string) => void;
	empty: React.ReactNode;
}

export default function TransactionsTable({
	transactions,
	accountNames,
	categories,
	format,
	sort,
	onSort,
	selectedIds,
	onSelectionChange,
	onEdit,
	onDelete,
	onCategoryChange,
	empty,
}: TransactionsTableProps) {
	const columns: Column<Transaction>[] = [
		{
			header: "Payee",
			sortKey: "payee",
			cell: (t) => (
				<span className="flex min-w-0 items-center gap-3">
					<TypeIcon type={t.type} />
					<span className="max-w-64 truncate font-medium text-slate-900 dark:text-white">
						{t.payee}
					</span>
				</span>
			),
		},
		{
			header: "Date",
			sortKey: "date",
			className: "text-slate-500 tabular-nums dark:text-slate-400",
			cell: (t) => formatDate(t.date),
		},
		{
			header: "Category",
			sortKey: "category",
			cell: (t) => (
				<Menu
					label="Change category"
					align="start"
					trigger={
						<button
							type="button"
							className="inline-flex max-w-44 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
							aria-label={`Category: ${t.category}. Change category`}
						>
							<span className="truncate">{t.category}</span>
							<ChevronDown size={12} className="shrink-0 opacity-60" />
						</button>
					}
				>
					<MenuLabel>Move to</MenuLabel>
					<div className="max-h-64 overflow-y-auto">
						{categories.map((c) => (
							<MenuItem key={c} onSelect={() => onCategoryChange(t._id, c)}>
								<span className={cn(c === t.category && "font-semibold")}>
									{c}
								</span>
							</MenuItem>
						))}
					</div>
				</Menu>
			),
		},
		{
			header: "Account",
			sortKey: "account",
			className: "text-slate-500 dark:text-slate-400",
			cell: (t) =>
				(t.accountId && accountNames.get(t.accountId)) || (
					<span className="text-slate-300 dark:text-slate-600">—</span>
				),
		},
		{
			header: "Status",
			sortKey: "status",
			cell: (t) => <StatusBadge status={t.status} />,
		},
		{
			header: "Amount",
			sortKey: "amount",
			align: "right",
			cell: (t) => <Amount transaction={t} format={format} />,
		},
	];

	return (
		<Table
			caption="Transactions"
			data={transactions}
			columns={columns}
			getRowId={(t) => t._id}
			getRowLabel={(t) => `${t.payee}, ${formatDate(t.date)}`}
			sort={sort}
			onSort={onSort}
			selectedIds={selectedIds}
			onSelectionChange={onSelectionChange}
			onRowClick={onEdit}
			empty={empty}
			renderMobileRow={(t) => (
				<span className="flex items-center gap-3">
					<TypeIcon type={t.type} />
					<span className="min-w-0 flex-1">
						<span className="block truncate font-medium text-slate-900 dark:text-white">
							{t.payee}
						</span>
						<span className="block truncate text-xs text-slate-500 dark:text-slate-400">
							{formatDate(t.date)} · {t.category}
							{t.status === "pending" && " · Pending"}
						</span>
					</span>
					<Amount transaction={t} format={format} className="text-sm" />
				</span>
			)}
			renderRowActions={(t) => (
				<Menu
					label="Transaction actions"
					trigger={
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={`Actions for ${t.payee}`}
							className="text-slate-400 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
						>
							<MoreHorizontal size={18} />
						</Button>
					}
				>
					<MenuItem icon={<Pencil />} onSelect={() => onEdit(t)}>
						Edit
					</MenuItem>
					<MenuItem icon={<Trash2 />} onSelect={() => onDelete(t)} danger>
						Delete
					</MenuItem>
				</Menu>
			)}
		/>
	);
}
