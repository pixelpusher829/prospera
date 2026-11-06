import { Plus, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import {
	type Account,
	useAccounts,
	useMoney,
	useViewer,
} from "@/shared/hooks/data";
import Header from "@/shared/layout/Header";
import { cn } from "@/shared/lib/cn";
import { balanceSheet } from "@/shared/lib/finance";
import { LoadDemoButton } from "../dashboard/Onboarding";
import AccountModal from "./AccountModal";
import {
	type AccountType,
	GROUPS,
	investmentInfo,
	typeInfo,
} from "./accountTypes";

function CreditCardTile({
	account,
	holder,
	onClick,
	format,
}: {
	account: Account;
	holder: string;
	onClick: () => void;
	format: (n: number) => string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group text-left"
			aria-label={`${account.name}, ${format(-account.balance)} owed. Edit`}
		>
			<div
				className={cn(
					"@container relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-2xl bg-linear-to-br p-5 text-white shadow-lg transition-transform group-hover:-translate-y-1",
					account.colorTheme ?? "from-zinc-700 to-zinc-950",
				)}
			>
				<div className="relative flex items-start justify-between">
					<span className="text-xs font-semibold tracking-wider uppercase opacity-80">
						{account.institution || account.name}
					</span>
					<span className="flex -space-x-2.5" aria-hidden>
						<span className="size-6 rounded-full bg-white/40" />
						<span className="size-6 rounded-full bg-white/25" />
					</span>
				</div>
				<div className="relative">
					<div
						className="mb-3 h-7 w-10 rounded-md bg-linear-to-br from-amber-200/70 to-amber-400/50"
						aria-hidden
					/>
					{/* Scales with the card so the number never overflows a narrow tile. */}
					<p className="font-mono text-[clamp(0.8rem,5.5cqw,1.125rem)] tracking-[0.2em] whitespace-nowrap opacity-90">
						•••• •••• •••• {account.mask ?? "••••"}
					</p>
					<div className="mt-2 flex items-end justify-between gap-3 text-xs">
						<span className="min-w-0 truncate font-medium tracking-wide uppercase opacity-80">
							{holder}
						</span>
						{account.expiry && (
							<span className="opacity-80">{account.expiry}</span>
						)}
					</div>
				</div>
			</div>
			<div className="mt-2 flex items-center justify-between gap-3 px-1 text-sm">
				<span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
					{account.name}
				</span>
				<span className="shrink-0 font-semibold text-zinc-900 tabular-nums dark:text-white">
					{format(Math.max(0, -account.balance))} owed
				</span>
			</div>
		</button>
	);
}

function AccountRow({
	account,
	onClick,
	format,
}: {
	account: Account;
	onClick: () => void;
	format: (n: number) => string;
}) {
	const info = typeInfo(account.type);
	const invest =
		account.type === "Investment"
			? investmentInfo(account.investmentCategory)
			: null;
	const Icon = invest?.icon ?? info.icon;
	const subtitle = [
		invest?.label ?? info.label,
		account.institution,
		account.mask && `•••• ${account.mask}`,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<button
			type="button"
			onClick={onClick}
			className="card flex w-full items-center gap-3 p-4 text-left sm:gap-4 transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-sm dark:hover:border-zinc-700"
		>
			<span
				className={cn(
					"flex size-11 shrink-0 items-center justify-center rounded-xl",
					invest?.tint ??
						(info.liability
							? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
							: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"),
				)}
			>
				<Icon size={20} />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-semibold text-zinc-900 dark:text-white">
					{account.name}
				</span>
				<span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
					{subtitle}
				</span>
			</span>
			<span className="shrink-0 text-right">
				<span
					className={cn(
						"block font-semibold tabular-nums",
						account.balance < 0
							? "text-red-600 dark:text-red-400"
							: "text-zinc-900 dark:text-white",
					)}
				>
					{format(info.liability ? -account.balance : account.balance)}
				</span>
				<span className="text-xs text-zinc-400">
					{info.liability ? "owed" : "balance"}
				</span>
			</span>
		</button>
	);
}

export default function Wallet() {
	const { data: accounts } = useAccounts();
	const { data: viewer } = useViewer();
	const { format } = useMoney();
	const [filter, setFilter] = useState("all");
	const [modal, setModal] = useState<{
		open: boolean;
		account: Account | null;
		type: AccountType;
	}>({
		open: false,
		account: null,
		type: "Debit",
	});

	const sheet = useMemo(() => balanceSheet(accounts ?? []), [accounts]);

	if (!accounts) return <PageSkeleton />;

	const openNew = (type: AccountType = "Debit") =>
		setModal({ open: true, account: null, type });
	const openEdit = (account: Account) =>
		setModal({ open: true, account, type: account.type });
	const groups = GROUPS.filter((g) => filter === "all" || g.id === filter);

	return (
		<div className="page">
			<Header
				heading="Wallet"
				subheading="Every account, card, investment and loan in one place."
			>
				<Button icon={<Plus size={16} />} onClick={() => openNew()}>
					Add account
				</Button>
			</Header>

			{accounts.length === 0 ? (
				<EmptyState
					icon={WalletIcon}
					title="Add your first account"
					description="Start with your main checking account. Add cards, savings, investments and loans to see your full net worth."
				>
					<Button icon={<Plus size={16} />} onClick={() => openNew()}>
						Add account
					</Button>
					<LoadDemoButton />
				</EmptyState>
			) : (
				<>
					<section aria-label="Balance sheet" className="pt-2">
						<p className="eyebrow">Net worth</p>
						<p className="hero-figure mt-3 truncate">
							{format(sheet.netWorth)}
						</p>
						<dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
							<div className="flex items-baseline gap-2">
								<dt className="text-zinc-500 dark:text-zinc-400">Assets</dt>
								<dd className="font-semibold text-zinc-900 tabular-nums dark:text-white">
									{format(sheet.assets)}
								</dd>
							</div>
							<div className="flex items-baseline gap-2">
								<dt className="text-zinc-500 dark:text-zinc-400">Debts</dt>
								<dd className="font-semibold text-zinc-900 tabular-nums dark:text-white">
									{format(sheet.liabilities)}
								</dd>
							</div>
						</dl>
					</section>

					<div
						role="tablist"
						aria-label="Filter accounts"
						className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 sm:w-fit dark:bg-zinc-900"
					>
						{[{ id: "all", label: "All" }, ...GROUPS].map((g) => (
							<button
								key={g.id}
								type="button"
								role="tab"
								aria-selected={filter === g.id}
								onClick={() => setFilter(g.id)}
								className={cn(
									"rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
									filter === g.id
										? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
										: "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white",
								)}
							>
								{g.label}
							</button>
						))}
					</div>

					<div className="space-y-10">
						{groups.map((group) => {
							const items = accounts.filter((a) =>
								group.types.includes(a.type),
							);
							if (items.length === 0 && filter === "all") return null;
							const total = items.reduce((s, a) => s + a.balance, 0);
							const isCards = group.id === "cards";
							return (
								<section
									key={group.id}
									aria-labelledby={`group-${group.id}`}
									className="animate-rise"
								>
									<div className="mb-4 flex items-baseline justify-between gap-4">
										<h2
											id={`group-${group.id}`}
											className="text-lg font-semibold text-zinc-900 dark:text-white"
										>
											{group.label}
										</h2>
										{items.length > 0 && (
											<span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
												{format(Math.abs(total))}
												{total < 0 ? " owed" : ""}
											</span>
										)}
									</div>
									<div
										className={cn(
											"grid grid-cols-1 gap-4",
											isCards
												? "sm:grid-cols-2 xl:grid-cols-3"
												: "lg:grid-cols-2",
										)}
									>
										{items.map((account) =>
											isCards ? (
												<CreditCardTile
													key={account._id}
													account={account}
													holder={viewer?.name ?? ""}
													onClick={() => openEdit(account)}
													format={format}
												/>
											) : (
												<AccountRow
													key={account._id}
													account={account}
													onClick={() => openEdit(account)}
													format={format}
												/>
											),
										)}
										<button
											type="button"
											onClick={() => openNew(group.addType)}
											className={cn(
												"flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 p-4 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white",
												isCards ? "aspect-[1.586]" : "min-h-[78px]",
											)}
										>
											{group.id === "loans" ? (
												<ShieldCheck size={18} />
											) : (
												<Plus size={18} />
											)}
											Add{" "}
											{group.label
												.toLowerCase()
												.replace("banking & cash", "bank account")
												.replace(/s$/, "")}
										</button>
									</div>
								</section>
							);
						})}
					</div>
				</>
			)}

			<AccountModal
				open={modal.open}
				onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
				account={modal.account}
				defaultType={modal.type}
			/>
		</div>
	);
}
