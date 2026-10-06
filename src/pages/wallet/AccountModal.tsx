import { api } from "@convex/_generated/api";
import { Check, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import Button from "@/shared/components/Button";
import {
	InputField,
	MoneyField,
	SelectField,
	SelectItem,
} from "@/shared/components/forms";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import { Modal } from "@/shared/components/ui/Modal";
import {
	type Account,
	useAppMutation,
	useMoney,
	useTransactions,
} from "@/shared/hooks/data";
import { useZodForm } from "@/shared/hooks/useZodForm";
import { cn } from "@/shared/lib/cn";
import { currencySymbol } from "@/shared/lib/money";
import { moneyInput, requiredText } from "@/shared/lib/schemas";
import {
	ACCOUNT_TYPES,
	type AccountType,
	CARD_THEMES,
	INVESTMENT_CATEGORIES,
	typeInfo,
} from "./accountTypes";

const schema = z
	.object({
		type: z.enum(["Cash", "Debit", "Savings", "Credit", "Investment", "Loan"]),
		name: requiredText("Name", 60),
		institution: z.string().trim().max(60),
		// Sign rules depend on the type and are applied on save.
		balance: moneyInput("A balance", { min: Number.NEGATIVE_INFINITY }),
		mask: z
			.string()
			.trim()
			.refine((v) => v === "" || /^\d{4}$/.test(v), "Enter the last 4 digits."),
		expiry: z.string().trim(),
		colorTheme: z.string(),
		investmentCategory: z.string(),
	})
	.superRefine((v, ctx) => {
		if (
			v.type === "Credit" &&
			v.expiry &&
			!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v.expiry)
		) {
			ctx.addIssue({ code: "custom", path: ["expiry"], message: "Use MM/YY." });
		}
	});

type Values = z.input<typeof schema>;

function initial(account: Account | null, type: AccountType): Values {
	if (account) {
		const liability = typeInfo(account.type).liability;
		return {
			type: account.type,
			name: account.name,
			institution: account.institution,
			// Liabilities are entered as the positive amount owed.
			balance: String(liability ? -account.balance : account.balance),
			mask: account.mask ?? "",
			expiry: account.expiry ?? "",
			colorTheme: account.colorTheme ?? CARD_THEMES[0].value,
			investmentCategory: account.investmentCategory ?? "stocks",
		};
	}
	return {
		type,
		name: "",
		institution: "",
		balance: "",
		mask: "",
		expiry: "",
		colorTheme: CARD_THEMES[0].value,
		investmentCategory: "stocks",
	};
}

export default function AccountModal({
	open,
	onOpenChange,
	account,
	defaultType,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	account: Account | null;
	defaultType: AccountType;
}) {
	const { currency } = useMoney();
	const { data: transactions = [] } = useTransactions();
	const form = useZodForm(schema, initial(account, defaultType));
	const [confirmDelete, setConfirmDelete] = useState(false);
	const create = useAppMutation(api.accounts.create, {
		success: "Account added",
	});
	const update = useAppMutation(api.accounts.update, {
		success: "Account updated",
	});
	const remove = useAppMutation(api.accounts.remove, {
		success: "Account deleted",
	});
	const { reset } = form;

	useEffect(() => {
		if (open) reset(initial(account, defaultType));
	}, [open, account, defaultType, reset]);

	const linkedCount = useMemo(
		() =>
			account
				? transactions.filter((t) => t.accountId === account._id).length
				: 0,
		[account, transactions],
	);

	const type = form.values.type;
	const info = typeInfo(type);

	const save = () =>
		form.submit(async (data) => {
			const payload = {
				type: data.type,
				name: data.name,
				institution: data.institution,
				balance: info.liability ? -Math.abs(data.balance) : data.balance,
				mask: data.mask || undefined,
				expiry: data.type === "Credit" ? data.expiry || undefined : undefined,
				colorTheme: data.type === "Credit" ? data.colorTheme : undefined,
				investmentCategory:
					data.type === "Investment" ? data.investmentCategory : undefined,
			};
			if (account) await update.mutateAsync({ id: account._id, ...payload });
			else await create.mutateAsync(payload);
			onOpenChange(false);
		});

	const balanceLabel = info.liability
		? type === "Credit"
			? "Current balance owed"
			: "Amount remaining"
		: type === "Investment"
			? "Current value"
			: "Current balance";

	return (
		<>
			<Modal
				open={open}
				onOpenChange={onOpenChange}
				title={account ? `Edit ${account.name}` : "Add an account"}
				description={
					account
						? undefined
						: "Track balances manually. Transactions linked to it keep it up to date."
				}
				onSubmit={save}
				footer={
					<>
						{account && (
							<Button
								variant="danger-ghost"
								icon={<Trash2 size={16} />}
								className="sm:mr-auto"
								onClick={() => setConfirmDelete(true)}
							>
								Delete
							</Button>
						)}
						<Button variant="secondary" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" isLoading={form.submitting}>
							{account ? "Save changes" : "Add account"}
						</Button>
					</>
				}
			>
				<fieldset>
					<legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
						Type
					</legend>
					<div className="grid grid-cols-3 gap-2">
						{ACCOUNT_TYPES.map((t) => (
							<button
								key={t.value}
								type="button"
								aria-pressed={type === t.value}
								onClick={() => form.set("type", t.value)}
								className={cn(
									"flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
									type === t.value
										? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
										: "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
								)}
							>
								<t.icon size={18} />
								{t.label}
							</button>
						))}
					</div>
				</fieldset>

				<div className="grid gap-4 sm:grid-cols-2">
					<InputField
						label="Name"
						placeholder={
							type === "Credit"
								? "e.g. Travel card"
								: type === "Loan"
									? "e.g. Car loan"
									: type === "Investment"
										? "e.g. Index fund"
										: "e.g. Everyday checking"
						}
						{...form.field("name")}
					/>
					{type !== "Cash" && (
						<InputField
							label={type === "Loan" ? "Lender" : "Institution"}
							placeholder="Optional"
							{...form.field("institution")}
						/>
					)}
				</div>

				<MoneyField
					label={balanceLabel}
					symbol={currencySymbol(currency)}
					allowNegative={!info.liability}
					value={form.values.balance}
					onValueChange={(v) => form.set("balance", v)}
					onBlur={() => form.blur("balance")}
					error={form.errors.balance}
					hint={
						info.liability
							? "Enter what you owe as a positive number."
							: undefined
					}
				/>

				{(type === "Debit" || type === "Savings" || type === "Credit") && (
					<div className="grid gap-4 sm:grid-cols-2">
						<InputField
							label="Last 4 digits"
							placeholder="Optional"
							inputMode="numeric"
							maxLength={4}
							hint="Only the last four digits are stored."
							{...form.field("mask")}
							onChange={(e) =>
								form.set("mask", e.target.value.replace(/\D/g, "").slice(0, 4))
							}
						/>
						{type === "Credit" && (
							<InputField
								label="Expiry"
								placeholder="MM/YY"
								inputMode="numeric"
								maxLength={5}
								{...form.field("expiry")}
								onChange={(e) => {
									const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
									form.set(
										"expiry",
										digits.length > 2
											? `${digits.slice(0, 2)}/${digits.slice(2)}`
											: digits,
									);
								}}
							/>
						)}
					</div>
				)}

				{type === "Credit" && (
					<fieldset>
						<legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
							Card colour
						</legend>
						<div className="flex flex-wrap gap-2">
							{CARD_THEMES.map((t) => (
								<button
									key={t.value}
									type="button"
									aria-label={t.label}
									aria-pressed={form.values.colorTheme === t.value}
									onClick={() => form.set("colorTheme", t.value)}
									className={cn(
										"flex h-8 w-12 items-center justify-center rounded-lg bg-linear-to-br ring-offset-2 ring-offset-white dark:ring-offset-slate-900",
										t.value,
										form.values.colorTheme === t.value &&
											"ring-2 ring-violet-500",
									)}
								>
									{form.values.colorTheme === t.value && (
										<Check size={14} className="text-white" />
									)}
								</button>
							))}
						</div>
					</fieldset>
				)}

				{type === "Investment" && (
					<SelectField
						label="Investment type"
						value={form.values.investmentCategory}
						onValueChange={(v) => form.set("investmentCategory", v)}
					>
						{INVESTMENT_CATEGORIES.map((c) => (
							<SelectItem key={c.value} value={c.value}>
								{c.label}
							</SelectItem>
						))}
					</SelectField>
				)}
			</Modal>

			{account && (
				<ConfirmDialog
					open={confirmDelete}
					onOpenChange={setConfirmDelete}
					title={`Delete ${account.name}?`}
					description={
						linkedCount > 0
							? `Its ${linkedCount} transaction${linkedCount === 1 ? "" : "s"} will be kept but no longer linked to an account. This can't be undone.`
							: "This can't be undone."
					}
					confirmLabel="Delete account"
					onConfirm={async () => {
						await remove.mutateAsync({ id: account._id });
						onOpenChange(false);
					}}
				/>
			)}
		</>
	);
}
