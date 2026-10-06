import type { Id } from "@convex/_generated/dataModel";
import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { useEffect, useId } from "react";
import Button from "@/shared/components/Button";
import {
	InputField,
	MoneyField,
	SelectField,
	SelectItem,
	TextAreaField,
} from "@/shared/components/forms";
import { Modal } from "@/shared/components/ui/Modal";
import { type Transaction, useAccounts, useMoney } from "@/shared/hooks/data";
import {
	useCategories,
	useTransactionActions,
} from "@/shared/hooks/transactions";
import { useZodForm } from "@/shared/hooks/useZodForm";
import { cn } from "@/shared/lib/cn";
import { todayIso } from "@/shared/lib/finance";
import { currencySymbol } from "@/shared/lib/money";
import { transactionForm } from "@/shared/lib/schemas";

const NO_ACCOUNT = "none";
const LAST_ACCOUNT_KEY = "last-account";

function rememberedAccount() {
	try {
		return localStorage.getItem(LAST_ACCOUNT_KEY) ?? NO_ACCOUNT;
	} catch {
		return NO_ACCOUNT;
	}
}

function initialValues(transaction: Transaction | null) {
	if (transaction) {
		return {
			payee: transaction.payee,
			amount: transaction.amount.toFixed(2),
			type: transaction.type,
			category: transaction.category,
			date: transaction.date,
			status: transaction.status,
			accountId: transaction.accountId ?? NO_ACCOUNT,
			notes: transaction.notes ?? "",
		};
	}
	return {
		payee: "",
		amount: "",
		type: "expense" as const,
		category: "",
		date: todayIso(),
		status: "cleared" as const,
		accountId: rememberedAccount(),
		notes: "",
	};
}

export default function TransactionModal({
	open,
	onOpenChange,
	transaction,
	onDelete,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transaction: Transaction | null;
	onDelete?: (transaction: Transaction) => void;
}) {
	const { data: accounts = [] } = useAccounts();
	const categories = useCategories();
	const { currency } = useMoney();
	const { create, update } = useTransactionActions();
	const form = useZodForm(transactionForm, initialValues(transaction));
	const listId = useId();
	const { reset } = form;

	useEffect(() => {
		if (open) reset(initialValues(transaction));
	}, [open, transaction, reset]);

	// A remembered account may have been deleted since.
	const accountValue = accounts.some((a) => a._id === form.values.accountId)
		? form.values.accountId
		: NO_ACCOUNT;

	const save = () =>
		form.submit(async (data) => {
			const payload = {
				...data,
				accountId:
					accountValue === NO_ACCOUNT
						? undefined
						: (accountValue as Id<"accounts">),
				notes: data.notes || undefined,
			};
			try {
				localStorage.setItem(LAST_ACCOUNT_KEY, accountValue);
			} catch {
				// Only a convenience.
			}
			if (transaction) {
				await update.mutateAsync({ id: transaction._id, ...payload });
			} else {
				await create.mutateAsync(payload);
			}
			onOpenChange(false);
		});

	const isIncome = form.values.type === "income";

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={transaction ? "Edit transaction" : "Add transaction"}
			onSubmit={save}
			footer={
				<>
					{transaction && onDelete && (
						<Button
							variant="danger-ghost"
							icon={<Trash2 size={16} />}
							className="sm:mr-auto"
							onClick={() => {
								onDelete(transaction);
								onOpenChange(false);
							}}
						>
							Delete
						</Button>
					)}
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button type="submit" isLoading={form.submitting}>
						{transaction ? "Save changes" : "Add transaction"}
					</Button>
				</>
			}
		>
			<fieldset className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
				<legend className="sr-only">Transaction type</legend>
				{(
					[
						["expense", "Expense", ArrowUpRight],
						["income", "Income", ArrowDownLeft],
					] as const
				).map(([value, label, Icon]) => {
					const active = form.values.type === value;
					return (
						<button
							key={value}
							type="button"
							aria-pressed={active}
							onClick={() => form.set("type", value)}
							className={cn(
								"flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
								active
									? value === "income"
										? "bg-white text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400"
										: "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
									: "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
							)}
						>
							<Icon size={16} />
							{label}
						</button>
					);
				})}
			</fieldset>

			<MoneyField
				label="Amount"
				symbol={currencySymbol(currency)}
				placeholder="0.00"
				autoFocus
				value={form.values.amount}
				onValueChange={(v) => form.set("amount", v)}
				onBlur={() => form.blur("amount")}
				error={form.errors.amount}
			/>
			<InputField
				label={isIncome ? "From" : "Paid to"}
				placeholder={isIncome ? "e.g. Employer, Client" : "e.g. Grocery store"}
				autoComplete="off"
				{...form.field("payee")}
			/>
			<div className="grid gap-4 sm:grid-cols-2">
				<InputField
					label="Category"
					placeholder="e.g. Groceries"
					list={listId}
					autoComplete="off"
					hint={
						categories.length ? "Pick one or type a new category." : undefined
					}
					{...form.field("category")}
				/>
				<datalist id={listId}>
					{categories.map((c) => (
						<option key={c} value={c} />
					))}
				</datalist>
				<InputField label="Date" type="date" {...form.field("date")} />
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<SelectField
					label="Account"
					value={accountValue}
					onValueChange={(v) => form.set("accountId", v)}
					hint={
						accountValue === NO_ACCOUNT
							? undefined
							: "Its balance updates automatically."
					}
				>
					<SelectItem value={NO_ACCOUNT}>No account</SelectItem>
					{accounts.map((a) => (
						<SelectItem key={a._id} value={a._id}>
							{a.name}
						</SelectItem>
					))}
				</SelectField>
				<SelectField
					label="Status"
					value={form.values.status}
					onValueChange={(v) => form.set("status", v as "cleared" | "pending")}
				>
					<SelectItem value="cleared">Cleared</SelectItem>
					<SelectItem value="pending">Pending</SelectItem>
				</SelectField>
			</div>
			<TextAreaField
				label="Notes"
				placeholder="Optional"
				rows={2}
				className="min-h-16"
				{...form.field("notes")}
			/>
		</Modal>
	);
}
