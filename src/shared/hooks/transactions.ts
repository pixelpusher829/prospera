import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMemo } from "react";
import { toast } from "sonner";
import {
	optimisticList,
	stripSystemFields,
	type Transaction,
	useAppMutation,
	useBudgets,
	useTransactions,
} from "./data";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Every category the user has used or budgeted for, alphabetised. */
export function useCategories() {
	const { data: transactions } = useTransactions();
	const { data: budgets } = useBudgets();
	return useMemo(() => {
		const byKey = new Map<string, string>();
		for (const b of budgets ?? []) byKey.set(b.name.toLowerCase(), b.name);
		for (const t of transactions ?? []) {
			const key = t.category.toLowerCase();
			if (!byKey.has(key)) byKey.set(key, t.category);
		}
		return [...byKey.values()].sort((a, b) => a.localeCompare(b));
	}, [transactions, budgets]);
}

export function useTransactionActions() {
	const create = useAppMutation(api.transactions.create, {
		success: "Transaction added",
	});
	const update = useAppMutation(api.transactions.update, {
		success: "Changes saved",
	});
	const bulkCreate = useAppMutation(api.transactions.bulkCreate);

	const setCategory = useAppMutation(api.transactions.setCategory, {
		optimistic: (qc, { id, category }) =>
			optimisticList(qc, api.transactions.list, (list) =>
				list.map((t) => (t._id === id ? { ...t, category } : t)),
			),
	});

	const bulkSetCategory = useAppMutation(api.transactions.bulkSetCategory, {
		success: ({ ids, category }) =>
			`Moved ${plural(ids.length, "transaction")} to ${category}`,
		optimistic: (qc, { ids, category }) => {
			const set = new Set<string>(ids);
			return optimisticList(qc, api.transactions.list, (list) =>
				list.map((t) => (set.has(t._id) ? { ...t, category } : t)),
			);
		},
	});

	const bulkSetStatus = useAppMutation(api.transactions.bulkSetStatus, {
		success: ({ ids, status }) =>
			`Marked ${plural(ids.length, "transaction")} ${status}`,
		optimistic: (qc, { ids, status }) => {
			const set = new Set<string>(ids);
			return optimisticList(qc, api.transactions.list, (list) =>
				list.map((t) => (set.has(t._id) ? { ...t, status } : t)),
			);
		},
	});

	const bulkRemove = useAppMutation(api.transactions.bulkRemove, {
		optimistic: (qc, { ids }) => {
			const set = new Set<string>(ids);
			return optimisticList(qc, api.transactions.list, (list) =>
				list.filter((t) => !set.has(t._id)),
			);
		},
	});

	/** Deletes immediately and offers Undo, which re-creates the rows. */
	const removeWithUndo = (items: Transaction[], onDone?: () => void) => {
		if (items.length === 0) return;
		bulkRemove.mutate(
			{ ids: items.map((t) => t._id as Id<"transactions">) },
			{
				onSuccess: () => {
					onDone?.();
					toast(`Deleted ${plural(items.length, "transaction")}`, {
						action: {
							label: "Undo",
							onClick: () =>
								bulkCreate.mutate(
									{
										items: items.map(stripSystemFields),
										adjustBalances: true,
									},
									{ onSuccess: () => toast.success("Restored") },
								),
						},
					});
				},
			},
		);
	};

	return {
		create,
		update,
		bulkCreate,
		setCategory,
		bulkSetCategory,
		bulkSetStatus,
		removeWithUndo,
	};
}
