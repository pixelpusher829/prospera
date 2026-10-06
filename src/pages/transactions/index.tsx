import type { Id } from "@convex/_generated/dataModel";
import {
	ArrowRightLeft,
	CheckCircle2,
	Download,
	FolderInput,
	Plus,
	Search,
	SlidersHorizontal,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Button from "@/shared/components/Button";
import {
	Checkbox,
	InputField,
	MoneyField,
	SelectField,
	SelectItem,
} from "@/shared/components/forms";
import type { SortState } from "@/shared/components/Table";
import { BulkBar, BulkButton } from "@/shared/components/ui/BulkBar";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import {
	Menu,
	MenuItem,
	MenuLabel,
	Popover,
} from "@/shared/components/ui/Menu";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import {
	type Transaction,
	useAccountNames,
	useAccounts,
	useMoney,
	useTransactions,
} from "@/shared/hooks/data";
import {
	useCategories,
	useTransactionActions,
} from "@/shared/hooks/transactions";
import Header from "@/shared/layout/Header";
import { downloadFile, toCsv } from "@/shared/lib/csv";
import { todayIso } from "@/shared/lib/finance";
import { currencySymbol, parseMoney } from "@/shared/lib/money";
import { LoadDemoButton } from "../dashboard/Onboarding";
import ImportModal from "./ImportModal";
import TransactionModal from "./TransactionModal";
import TransactionsTable from "./TransactionsTable";

type Filters = {
	search: string;
	type: "all" | "income" | "expense";
	account: string;
	status: "all" | "cleared" | "pending";
	from: string;
	to: string;
	min: string;
	max: string;
	categories: string[];
};

const EMPTY_FILTERS: Filters = {
	search: "",
	type: "all",
	account: "all",
	status: "all",
	from: "",
	to: "",
	min: "",
	max: "",
	categories: [],
};

const PAGE_SIZE = 100;

export default function Transactions() {
	const { data: transactions } = useTransactions();
	const { data: accounts = [] } = useAccounts();
	const accountNames = useAccountNames();
	const categories = useCategories();
	const { format, currency } = useMoney();
	const actions = useTransactionActions();

	const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
	const [sort, setSort] = useState<SortState>({
		key: "date",
		direction: "desc",
	});
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [visible, setVisible] = useState(PAGE_SIZE);
	const [editing, setEditing] = useState<Transaction | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);

	const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
		setFilters((f) => ({ ...f, [key]: value }));
		setVisible(PAGE_SIZE);
	};

	const advancedCount = [
		filters.status !== "all",
		filters.from || filters.to,
		filters.min || filters.max,
		filters.categories.length > 0,
	].filter(Boolean).length;
	const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

	const filtered = useMemo(() => {
		if (!transactions) return [];
		const q = filters.search.trim().toLowerCase();
		const min = parseMoney(filters.min);
		const max = parseMoney(filters.max);
		const cats = new Set(filters.categories);
		const rows = transactions.filter(
			(t) =>
				(!q ||
					t.payee.toLowerCase().includes(q) ||
					t.category.toLowerCase().includes(q) ||
					t.notes?.toLowerCase().includes(q)) &&
				(filters.type === "all" || t.type === filters.type) &&
				(filters.account === "all" ||
					(filters.account === "none"
						? !t.accountId
						: t.accountId === filters.account)) &&
				(filters.status === "all" || t.status === filters.status) &&
				(!filters.from || t.date >= filters.from) &&
				(!filters.to || t.date <= filters.to) &&
				(min === null || t.amount >= min) &&
				(max === null || t.amount <= max) &&
				(cats.size === 0 || cats.has(t.category)),
		);

		const dir = sort.direction === "asc" ? 1 : -1;
		const value = (t: Transaction): string | number => {
			switch (sort.key) {
				case "amount":
					return t.type === "income" ? t.amount : -t.amount;
				case "account":
					return (t.accountId && accountNames.get(t.accountId)) || "";
				case "payee":
				case "category":
				case "status":
					return t[sort.key].toLowerCase();
				default:
					return t.date;
			}
		};
		return rows.sort((a, b) => {
			const av = value(a);
			const bv = value(b);
			const cmp =
				typeof av === "number" && typeof bv === "number"
					? av - bv
					: String(av).localeCompare(String(bv));
			// Stable tie-break: newest first.
			return cmp * dir || b._creationTime - a._creationTime;
		});
	}, [transactions, filters, sort, accountNames]);

	const totals = useMemo(() => {
		let income = 0;
		let expense = 0;
		for (const t of filtered) {
			if (t.type === "income") income += t.amount;
			else expense += t.amount;
		}
		return { income, expense };
	}, [filtered]);

	const selected = useMemo(
		() => filtered.filter((t) => selectedIds.has(t._id)),
		[filtered, selectedIds],
	);

	if (!transactions) return <PageSkeleton tiles={0} />;

	const onSort = (key: string) =>
		setSort((s) =>
			s.key === key
				? { key, direction: s.direction === "asc" ? "desc" : "asc" }
				: {
						key,
						direction: key === "date" || key === "amount" ? "desc" : "asc",
					},
		);

	const openNew = () => {
		setEditing(null);
		setModalOpen(true);
	};

	const openEdit = (t: Transaction) => {
		setEditing(t);
		setModalOpen(true);
	};

	const exportCsv = () => {
		const rows = selected.length ? selected : filtered;
		downloadFile(
			`prospera-transactions-${todayIso()}.csv`,
			toCsv(
				rows.map((t) => ({
					...t,
					account: (t.accountId && accountNames.get(t.accountId)) || "",
				})),
			),
		);
		toast.success(
			`Exported ${rows.length} transaction${rows.length === 1 ? "" : "s"}`,
		);
	};

	const ids = (rows: Transaction[]) =>
		rows.map((t) => t._id as Id<"transactions">);

	const noTransactions = transactions.length === 0;

	return (
		<div className="page pb-28">
			<Header
				heading="Transactions"
				subheading="Every dollar in and out, searchable and sortable."
			>
				<Button
					variant="secondary"
					icon={<Upload size={16} />}
					onClick={() => setImportOpen(true)}
				>
					Import
				</Button>
				{!noTransactions && (
					<Button
						variant="secondary"
						icon={<Download size={16} />}
						onClick={exportCsv}
					>
						Export
					</Button>
				)}
				<Button icon={<Plus size={16} />} onClick={openNew}>
					Add transaction
				</Button>
			</Header>

			{noTransactions ? (
				<EmptyState
					icon={ArrowRightLeft}
					title="No transactions yet"
					description="Add your first transaction, import a CSV from your bank, or explore with sample data."
				>
					<Button icon={<Plus size={16} />} onClick={openNew}>
						Add transaction
					</Button>
					<Button
						variant="secondary"
						icon={<Upload size={16} />}
						onClick={() => setImportOpen(true)}
					>
						Import CSV
					</Button>
					<LoadDemoButton />
				</EmptyState>
			) : (
				<>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
						<InputField
							aria-label="Search transactions"
							placeholder="Search payee, category or notes"
							icon={<Search />}
							value={filters.search}
							onChange={(e) => setFilter("search", e.target.value)}
							containerClassName="lg:max-w-sm"
							suffix={
								filters.search && (
									<button
										type="button"
										onClick={() => setFilter("search", "")}
										className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
										aria-label="Clear search"
									>
										<X size={14} />
									</button>
								)
							}
						/>
						<div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
							<SelectField
								aria-label="Type"
								value={filters.type}
								onValueChange={(v) => setFilter("type", v as Filters["type"])}
								containerClassName="sm:w-40"
							>
								<SelectItem value="all">All types</SelectItem>
								<SelectItem value="income">Income</SelectItem>
								<SelectItem value="expense">Expenses</SelectItem>
							</SelectField>
							<SelectField
								aria-label="Account"
								value={filters.account}
								onValueChange={(v) => setFilter("account", v)}
								containerClassName="sm:w-48"
							>
								<SelectItem value="all">All accounts</SelectItem>
								{accounts.map((a) => (
									<SelectItem key={a._id} value={a._id}>
										{a.name}
									</SelectItem>
								))}
								<SelectItem value="none">No account</SelectItem>
							</SelectField>
							<Popover
								trigger={
									<Button
										variant="secondary"
										icon={<SlidersHorizontal size={16} />}
										className="col-span-2 sm:col-span-1"
									>
										More filters
										{advancedCount > 0 && (
											<span className="ml-0.5 rounded-full bg-violet-600 px-1.5 text-xs text-white">
												{advancedCount}
											</span>
										)}
									</Button>
								}
								className="w-80 space-y-4"
							>
								<div className="grid grid-cols-2 gap-3">
									<InputField
										label="From"
										type="date"
										value={filters.from}
										max={filters.to || undefined}
										onChange={(e) => setFilter("from", e.target.value)}
									/>
									<InputField
										label="To"
										type="date"
										value={filters.to}
										min={filters.from || undefined}
										onChange={(e) => setFilter("to", e.target.value)}
									/>
									<MoneyField
										label="Min amount"
										symbol={currencySymbol(currency)}
										value={filters.min}
										onValueChange={(v) => setFilter("min", v)}
									/>
									<MoneyField
										label="Max amount"
										symbol={currencySymbol(currency)}
										value={filters.max}
										onValueChange={(v) => setFilter("max", v)}
									/>
								</div>
								<SelectField
									label="Status"
									value={filters.status}
									onValueChange={(v) =>
										setFilter("status", v as Filters["status"])
									}
								>
									<SelectItem value="all">Any status</SelectItem>
									<SelectItem value="cleared">Cleared</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
								</SelectField>
								<fieldset>
									<legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
										Categories
									</legend>
									<div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 p-2.5 dark:border-slate-700">
										{categories.map((c) => (
											<Checkbox
												key={c}
												label={c}
												className="flex"
												checked={filters.categories.includes(c)}
												onCheckedChange={(on) =>
													setFilter(
														"categories",
														on
															? [...filters.categories, c]
															: filters.categories.filter((x) => x !== c),
													)
												}
											/>
										))}
									</div>
								</fieldset>
							</Popover>
							{isFiltered && (
								<Button
									variant="ghost"
									className="col-span-2 sm:col-span-1"
									onClick={() => {
										setFilters(EMPTY_FILTERS);
										setVisible(PAGE_SIZE);
									}}
								>
									Clear filters
								</Button>
							)}
						</div>
					</div>

					<p
						className="text-sm text-slate-500 dark:text-slate-400"
						aria-live="polite"
					>
						{filtered.length} transaction{filtered.length === 1 ? "" : "s"}
						{filtered.length > 0 && (
							<>
								{" · "}
								<span className="text-emerald-600 dark:text-emerald-400">
									{format(totals.income)} in
								</span>
								{" · "}
								<span>{format(totals.expense)} out</span>
							</>
						)}
					</p>

					<TransactionsTable
						transactions={filtered.slice(0, visible)}
						accountNames={accountNames}
						categories={categories}
						format={format}
						sort={sort}
						onSort={onSort}
						selectedIds={selectedIds}
						onSelectionChange={setSelectedIds}
						onEdit={openEdit}
						onDelete={(t) => actions.removeWithUndo([t])}
						onCategoryChange={(id, category) =>
							actions.setCategory.mutate({ id, category })
						}
						empty={
							<EmptyState
								icon={Search}
								title="No matching transactions"
								description="Try a different search or clear your filters."
							>
								<Button
									variant="secondary"
									onClick={() => setFilters(EMPTY_FILTERS)}
								>
									Clear filters
								</Button>
							</EmptyState>
						}
					/>

					{filtered.length > visible && (
						<div className="flex justify-center">
							<Button
								variant="secondary"
								onClick={() => setVisible((v) => v + PAGE_SIZE)}
							>
								Show more ({filtered.length - visible} remaining)
							</Button>
						</div>
					)}
				</>
			)}

			<BulkBar
				count={selected.length}
				noun="transactions"
				onClear={() => setSelectedIds(new Set())}
			>
				<Menu
					label="Move to category"
					align="start"
					trigger={<BulkButton icon={<FolderInput />}>Categorize</BulkButton>}
				>
					<MenuLabel>Move to</MenuLabel>
					<div className="max-h-64 overflow-y-auto">
						{categories.map((c) => (
							<MenuItem
								key={c}
								onSelect={() => {
									actions.bulkSetCategory.mutate({
										ids: ids(selected),
										category: c,
									});
									setSelectedIds(new Set());
								}}
							>
								{c}
							</MenuItem>
						))}
					</div>
				</Menu>
				<BulkButton
					icon={<CheckCircle2 />}
					onClick={() => {
						actions.bulkSetStatus.mutate({
							ids: ids(selected),
							status: "cleared",
						});
						setSelectedIds(new Set());
					}}
				>
					Mark cleared
				</BulkButton>
				<BulkButton icon={<Download />} onClick={exportCsv}>
					Export
				</BulkButton>
				<BulkButton
					danger
					icon={<Trash2 />}
					onClick={() =>
						actions.removeWithUndo(selected, () => setSelectedIds(new Set()))
					}
				>
					Delete
				</BulkButton>
			</BulkBar>

			<TransactionModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				transaction={editing}
				onDelete={(t) => actions.removeWithUndo([t])}
			/>
			<ImportModal open={importOpen} onOpenChange={setImportOpen} />
		</div>
	);
}
