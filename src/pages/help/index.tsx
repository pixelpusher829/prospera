import {
	ArrowRightLeft,
	ChevronDown,
	PieChart,
	Search,
	Target,
	Upload,
	Wallet,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InputField } from "@/shared/components/forms";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import Header from "@/shared/layout/Header";

const GUIDES = [
	{
		to: "/wallet",
		icon: Wallet,
		title: "Add your accounts",
		text: "Checking, savings, cards, investments and loans.",
	},
	{
		to: "/transactions",
		icon: Upload,
		title: "Import from your bank",
		text: "Upload a CSV export and map the columns.",
	},
	{
		to: "/budget",
		icon: PieChart,
		title: "Set a budget",
		text: "Limits per category, tracked automatically.",
	},
	{
		to: "/goals",
		icon: Target,
		title: "Plan a goal",
		text: "See how much to save each month.",
	},
];

const FAQ = [
	{
		q: "How do I get my bank transactions into Prospera?",
		a: "Most banks let you download your history as a CSV file. On the Transactions page choose Import, pick the file, check that the date, description and amount columns are matched correctly, then import. You can attach the transactions to one of your accounts.",
	},
	{
		q: "Why didn't my account balance change after an import?",
		a: "Imported history usually happened before the balance you entered, so by default imports don't change balances. Tick \"Also update this account's balance\" in the import window if you want them to.",
	},
	{
		q: "How are balances kept up to date?",
		a: "When you add, edit or delete a transaction that's linked to an account, that account's balance moves by the same amount. You can always correct a balance by editing the account.",
	},
	{
		q: "How does the budget know what I've spent?",
		a: 'Each budget category is matched to transactions with the same category name in the selected month. If spending shows up under "Spending without a budget", either rename the transactions\' category or add that category to your budget.',
	},
	{
		q: "Can I undo a delete?",
		a: "Yes. After deleting transactions, goals or clients, a message appears with an Undo button for a few seconds. Deleting an account or your whole workspace asks for confirmation instead, because those can't be undone.",
	},
	{
		q: "What does the AI advisor see?",
		a: "Only totals: your net worth, this month's and last month's income and spending, spending by category and your budget limits. Payee names, notes and account details are never sent. Advice is general guidance, not professional financial advice.",
	},
	{
		q: "Is my data private?",
		a: "Your data is only readable by your account; every request is checked on the server. Only the last four digits of card and account numbers are stored. Settings → Your data lets you download a full backup or delete everything.",
	},
	{
		q: "Can I change currency?",
		a: "Yes, in Settings → Preferences. This changes how amounts are displayed. Prospera tracks one currency per account and doesn't convert between currencies.",
	},
	{
		q: "I forgot my password. What can I do?",
		a: "If you're still signed in somewhere, change it in Settings → Security. Password reset by email isn't available yet, so contact whoever runs your Prospera instance.",
	},
];

export default function Help() {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState<string | null>(FAQ[0].q);

	const results = useMemo(() => {
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		if (!terms.length) return FAQ;
		return FAQ.filter((f) => {
			const text = `${f.q} ${f.a}`.toLowerCase();
			return terms.every((t) => text.includes(t));
		});
	}, [query]);

	return (
		<div className="page max-w-4xl">
			<Header
				heading="Help"
				subheading="Answers to common questions about Prospera."
			/>

			<div className="grid gap-3 sm:grid-cols-2">
				{GUIDES.map((g) => (
					<Link
						key={g.to}
						to={g.to}
						className="card flex items-start gap-3 p-4 transition-[border-color,box-shadow] hover:border-violet-300 hover:shadow-md dark:hover:border-violet-700"
					>
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
							<g.icon size={18} />
						</span>
						<span>
							<span className="block font-medium text-slate-900 dark:text-white">
								{g.title}
							</span>
							<span className="block text-sm text-slate-500 dark:text-slate-400">
								{g.text}
							</span>
						</span>
					</Link>
				))}
			</div>

			<section aria-labelledby="faq-title" className="space-y-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h2
						id="faq-title"
						className="text-lg font-semibold text-slate-900 dark:text-white"
					>
						Frequently asked questions
					</h2>
					<InputField
						aria-label="Search help"
						placeholder="Search questions"
						icon={<Search />}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						containerClassName="sm:max-w-xs"
						suffix={
							query && (
								<button
									type="button"
									onClick={() => setQuery("")}
									className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
									aria-label="Clear search"
								>
									<X size={14} />
								</button>
							)
						}
					/>
				</div>
				{results.length === 0 ? (
					<EmptyState
						icon={ArrowRightLeft}
						title="No answers found"
						description="Try different words, or browse all questions."
					/>
				) : (
					<ul className="card divide-y divide-slate-100 dark:divide-slate-800">
						{results.map((f) => {
							const isOpen = open === f.q || query.length > 0;
							const id = `faq-${FAQ.indexOf(f)}`;
							return (
								<li key={f.q}>
									<h3>
										<button
											type="button"
											aria-expanded={isOpen}
											aria-controls={id}
											onClick={() => setOpen(open === f.q ? null : f.q)}
											className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-slate-900 hover:bg-slate-50 dark:text-white dark:hover:bg-slate-800/50"
										>
											{f.q}
											<ChevronDown
												size={18}
												className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
											/>
										</button>
									</h3>
									<div
										id={id}
										hidden={!isOpen}
										className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
									>
										{f.a}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</section>
		</div>
	);
}
