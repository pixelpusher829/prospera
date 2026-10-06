import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import Button from "@/shared/components/Button";
import {
	COLOR_PALETTE,
	ColorPicker,
	InputField,
	MoneyField,
} from "@/shared/components/forms";
import { Popover } from "@/shared/components/ui/Menu";
import { Modal } from "@/shared/components/ui/Modal";
import {
	type BudgetCategory,
	useAppMutation,
	useMoney,
	useTransactions,
} from "@/shared/hooks/data";
import { useCategories } from "@/shared/hooks/transactions";
import {
	monthKey,
	shiftMonth,
	spentByCategory,
	todayIso,
} from "@/shared/lib/finance";
import { BUDGET_ICONS, guessBudgetIcon, iconFor } from "@/shared/lib/icons";
import { currencySymbol, parseMoney } from "@/shared/lib/money";

type Row = {
	key: string;
	id?: Id<"budgetCategories">;
	name: string;
	limit: string;
	color: string;
	icon: string;
};

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

const toRows = (budget: BudgetCategory[]): Row[] =>
	budget.map((b) => ({
		key: b._id,
		id: b._id,
		name: b.name,
		limit: String(b.limit),
		color: b.color,
		icon: b.icon,
	}));

function validate(rows: Row[]) {
	const errors: Record<string, { name?: string; limit?: string }> = {};
	const seen = new Set<string>();
	for (const row of rows) {
		const e: { name?: string; limit?: string } = {};
		const name = row.name.trim();
		if (!name) e.name = "Name the category.";
		else if (seen.has(name.toLowerCase()))
			e.name = "This category is listed twice.";
		seen.add(name.toLowerCase());
		const limit = parseMoney(row.limit);
		if (limit === null) e.limit = "Enter a limit.";
		else if (limit < 0) e.limit = "Can't be negative.";
		if (e.name || e.limit) errors[row.key] = e;
	}
	return errors;
}

export default function EditBudgetModal({
	open,
	onOpenChange,
	budget,
	suggest = false,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	budget: BudgetCategory[];
	/** Pre-fill rows from last month's spending. */
	suggest?: boolean;
}) {
	const { data: transactions = [] } = useTransactions();
	const categories = useCategories();
	const { currency } = useMoney();
	const listId = useId();
	const [rows, setRows] = useState<Row[]>([]);
	const [showErrors, setShowErrors] = useState(false);
	const save = useAppMutation(api.budgets.saveAll, { success: "Budget saved" });

	const suggestions = (current: Row[]): Row[] => {
		const lastMonth = shiftMonth(monthKey(todayIso()), -1);
		const spent = spentByCategory(transactions, lastMonth);
		const names = new Map(categories.map((c) => [c.toLowerCase(), c]));
		const existing = new Set(current.map((r) => r.name.trim().toLowerCase()));
		return [...spent.entries()]
			.filter(([key]) => !existing.has(key))
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([key, amount], i) => {
				const name = names.get(key) ?? key;
				return {
					key: newKey(),
					name,
					// Round up to a friendly number with a little headroom.
					limit: String(Math.max(10, Math.ceil((amount * 1.1) / 10) * 10)),
					color: COLOR_PALETTE[(current.length + i) % COLOR_PALETTE.length],
					icon: guessBudgetIcon(name),
				};
			});
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when opened
	useEffect(() => {
		if (!open) return;
		const base = toRows(budget);
		setRows(base.length || !suggest ? base : suggestions([]));
		setShowErrors(false);
	}, [open]);

	const errors = validate(rows);
	const update = (key: string, patch: Partial<Row>) =>
		setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

	const addRow = () =>
		setRows((rs) => [
			...rs,
			{
				key: newKey(),
				name: "",
				limit: "",
				color: COLOR_PALETTE[rs.length % COLOR_PALETTE.length],
				icon: "dollar",
			},
		]);

	const submit = () => {
		setShowErrors(true);
		if (Object.keys(errors).length) return;
		save.mutate(
			{
				categories: rows.map((r) => ({
					id: r.id,
					name: r.name.trim(),
					limit: parseMoney(r.limit) ?? 0,
					color: r.color,
					icon: r.icon,
				})),
			},
			{ onSuccess: () => onOpenChange(false) },
		);
	};

	const total = rows.reduce((s, r) => s + (parseMoney(r.limit) ?? 0), 0);
	const symbol = currencySymbol(currency);

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={budget.length ? "Edit monthly budget" : "Create your budget"}
			description="Spending is matched to budgets by category name."
			size="lg"
			onSubmit={submit}
			footer={
				<>
					<span className="text-sm text-slate-500 sm:mr-auto dark:text-slate-400">
						Total {symbol}
						{total.toLocaleString(undefined, { maximumFractionDigits: 2 })} /
						month
					</span>
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button type="submit" isLoading={save.isPending}>
						Save budget
					</Button>
				</>
			}
		>
			<datalist id={listId}>
				{categories.map((c) => (
					<option key={c} value={c} />
				))}
			</datalist>
			{rows.length === 0 && (
				<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
					Add a category for each kind of spending you want to keep an eye on.
				</p>
			)}
			<ul className="space-y-3">
				{rows.map((row) => {
					const Icon = iconFor(BUDGET_ICONS, row.icon);
					const rowErrors = showErrors ? errors[row.key] : undefined;
					return (
						<li
							key={row.key}
							className="grid grid-cols-[auto_1fr_auto] items-start gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[auto_1fr_10rem_auto] dark:border-slate-800"
						>
							<Popover
								align="start"
								className="w-64 space-y-4"
								trigger={
									<button
										type="button"
										className="flex size-11 items-center justify-center rounded-xl transition-transform hover:scale-105 sm:size-10"
										style={{ background: `${row.color}22`, color: row.color }}
										aria-label={`Icon and colour for ${row.name || "new category"}`}
									>
										<Icon size={18} />
									</button>
								}
							>
								<div>
									<p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
										Icon
									</p>
									<div className="grid grid-cols-7 gap-1">
										{Object.entries(BUDGET_ICONS).map(([key, I]) => (
											<button
												key={key}
												type="button"
												onClick={() => update(row.key, { icon: key })}
												aria-label={key}
												aria-pressed={row.icon === key}
												className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 aria-pressed:bg-violet-100 aria-pressed:text-violet-700 dark:hover:bg-slate-800 dark:aria-pressed:bg-violet-500/20 dark:aria-pressed:text-violet-300"
											>
												<I size={16} />
											</button>
										))}
									</div>
								</div>
								<ColorPicker
									value={row.color}
									onChange={(color) => update(row.key, { color })}
									size="sm"
								/>
							</Popover>
							<InputField
								aria-label="Category name"
								placeholder="Category, e.g. Groceries"
								list={listId}
								value={row.name}
								onChange={(e) =>
									update(row.key, {
										name: e.target.value,
										...(row.id
											? {}
											: { icon: guessBudgetIcon(e.target.value) }),
									})
								}
								error={rowErrors?.name}
							/>
							<MoneyField
								aria-label={`Monthly limit for ${row.name || "category"}`}
								placeholder="Limit"
								symbol={symbol}
								value={row.limit}
								onValueChange={(limit) => update(row.key, { limit })}
								error={rowErrors?.limit}
								containerClassName="col-span-2 col-start-2 row-start-2 sm:col-span-1 sm:col-start-auto sm:row-start-auto"
							/>
							<Button
								variant="danger-ghost"
								size="icon"
								aria-label={`Remove ${row.name || "category"}`}
								onClick={() =>
									setRows((rs) => rs.filter((r) => r.key !== row.key))
								}
								className="col-start-3 row-start-1 sm:col-start-auto"
							>
								<Trash2 size={16} />
							</Button>
						</li>
					);
				})}
			</ul>
			<div className="flex flex-wrap gap-2">
				<Button variant="secondary" icon={<Plus size={16} />} onClick={addRow}>
					Add category
				</Button>
				{transactions.length > 0 && (
					<Button
						variant="ghost"
						icon={<Wand2 size={16} />}
						onClick={() => setRows((rs) => [...rs, ...suggestions(rs)])}
					>
						Suggest from last month
					</Button>
				)}
			</div>
		</Modal>
	);
}
