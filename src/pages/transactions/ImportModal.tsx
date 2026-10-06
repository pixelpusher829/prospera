import type { Id } from "@convex/_generated/dataModel";
import { AlertCircle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Button from "@/shared/components/Button";
import {
	Checkbox,
	InputField,
	SelectField,
	SelectItem,
} from "@/shared/components/forms";
import { Modal } from "@/shared/components/ui/Modal";
import { useAccounts, useMoney } from "@/shared/hooks/data";
import { useTransactionActions } from "@/shared/hooks/transactions";
import { cn } from "@/shared/lib/cn";
import {
	type ColumnMapping,
	type CsvTable,
	guessMapping,
	isMappingComplete,
	mapRows,
	parseCsv,
} from "@/shared/lib/csv";
import { errorMessage } from "@/shared/lib/errors";

const NONE = "__none";
const NO_ACCOUNT = "none";
const CHUNK = 200;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROWS = 8;

export default function ImportModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: accounts = [] } = useAccounts();
	const { format } = useMoney();
	const { bulkCreate } = useTransactionActions();
	const inputRef = useRef<HTMLInputElement>(null);

	const [fileName, setFileName] = useState("");
	const [table, setTable] = useState<CsvTable | null>(null);
	const [mapping, setMapping] = useState<ColumnMapping | null>(null);
	const [accountId, setAccountId] = useState(NO_ACCOUNT);
	const [defaultCategory, setDefaultCategory] = useState("Uncategorized");
	const [adjustBalances, setAdjustBalances] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [dragging, setDragging] = useState(false);

	const reset = () => {
		setFileName("");
		setTable(null);
		setMapping(null);
		setProgress(null);
		setAdjustBalances(false);
	};

	const close = (next: boolean) => {
		if (progress !== null) return; // don't abandon a running import
		if (!next) reset();
		onOpenChange(next);
	};

	const loadFile = async (file: File) => {
		if (file.size > MAX_FILE_BYTES) {
			toast.error("That file is over 5 MB. Split it into smaller exports.");
			return;
		}
		const parsed = parseCsv(await file.text());
		if (parsed.headers.length === 0 || parsed.rows.length === 0) {
			toast.error(
				"We couldn't find any rows in that file. Is it a CSV with a header row?",
			);
			return;
		}
		setFileName(file.name);
		setTable(parsed);
		setMapping(guessMapping(parsed.headers));
	};

	const results = useMemo(
		() =>
			table && mapping && isMappingComplete(mapping)
				? mapRows(
						table.rows,
						mapping,
						defaultCategory.trim() || "Uncategorized",
					)
				: [],
		[table, mapping, defaultCategory],
	);
	const valid = results.flatMap((r) => (r.ok ? [r.value] : []));
	const invalid = results.filter((r) => !r.ok);

	const runImport = async () => {
		if (valid.length === 0) return;
		setProgress(0);
		const account =
			accountId === NO_ACCOUNT ? undefined : (accountId as Id<"accounts">);
		let done = 0;
		try {
			for (let i = 0; i < valid.length; i += CHUNK) {
				const items = valid.slice(i, i + CHUNK).map((t) => ({
					...t,
					status: "cleared" as const,
					accountId: account,
				}));
				await bulkCreate.mutateAsync({
					items,
					adjustBalances: Boolean(account) && adjustBalances,
				});
				done += items.length;
				setProgress(done / valid.length);
			}
			toast.success(`Imported ${done} transaction${done === 1 ? "" : "s"}`);
			setProgress(null);
			reset();
			onOpenChange(false);
		} catch (error) {
			setProgress(null);
			toast.error(
				done > 0
					? `Imported ${done} of ${valid.length} before an error: ${errorMessage(error)}`
					: errorMessage(error),
			);
		}
	};

	const columnSelect = (
		key: "date" | "payee" | "amount" | "debit" | "credit" | "category",
		label: string,
		optional = false,
	) => (
		<SelectField
			label={label}
			value={mapping?.[key] || NONE}
			onValueChange={(v) =>
				setMapping((m) => (m ? { ...m, [key]: v === NONE ? "" : v } : m))
			}
		>
			<SelectItem value={NONE}>
				{optional ? "Not in file" : "Choose a column"}
			</SelectItem>
			{table?.headers.map((h) => (
				<SelectItem key={h} value={h}>
					{h}
				</SelectItem>
			))}
		</SelectField>
	);

	return (
		<Modal
			open={open}
			onOpenChange={close}
			title="Import transactions"
			description="Upload a CSV export from your bank or card provider."
			size="lg"
			footer={
				table ? (
					<>
						<Button
							variant="ghost"
							className="sm:mr-auto"
							onClick={reset}
							disabled={progress !== null}
						>
							Choose another file
						</Button>
						<Button
							variant="secondary"
							onClick={() => close(false)}
							disabled={progress !== null}
						>
							Cancel
						</Button>
						<Button
							onClick={runImport}
							disabled={valid.length === 0}
							isLoading={progress !== null}
							icon={<Upload size={16} />}
						>
							Import {valid.length || ""} transaction
							{valid.length === 1 ? "" : "s"}
						</Button>
					</>
				) : undefined
			}
		>
			{!table || !mapping ? (
				<label
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragging(false);
						const file = e.dataTransfer.files[0];
						if (file) loadFile(file);
					}}
					className={cn(
						"flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors focus-within:border-violet-500",
						dragging
							? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
							: "border-slate-300 hover:border-violet-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50",
					)}
				>
					<FileUp className="mb-3 text-violet-500" size={32} />
					<span className="font-medium text-slate-900 dark:text-white">
						Drop a CSV here or click to browse
					</span>
					<span className="mt-1 text-sm text-slate-500 dark:text-slate-400">
						We'll detect the columns. Nothing is saved until you confirm.
					</span>
					<input
						ref={inputRef}
						type="file"
						accept=".csv,text/csv"
						className="sr-only"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) loadFile(file);
							e.target.value = "";
						}}
					/>
				</label>
			) : (
				<div className="space-y-6">
					<p className="text-sm text-slate-600 dark:text-slate-300">
						<span className="font-medium text-slate-900 dark:text-white">
							{fileName}
						</span>{" "}
						· {table.rows.length} row{table.rows.length === 1 ? "" : "s"}
					</p>

					<section className="space-y-4">
						<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
							1. Match the columns
						</h3>
						<div className="grid gap-4 sm:grid-cols-2">
							{columnSelect("date", "Date")}
							{columnSelect("payee", "Description")}
							{columnSelect("amount", "Amount (signed)", true)}
							{columnSelect("category", "Category", true)}
							{!mapping.amount && (
								<>
									{columnSelect("debit", "Money out", true)}
									{columnSelect("credit", "Money in", true)}
								</>
							)}
							<SelectField
								label="Date format"
								value={mapping.dateFormat}
								onValueChange={(v) =>
									setMapping({
										...mapping,
										dateFormat: v as ColumnMapping["dateFormat"],
									})
								}
							>
								<SelectItem value="auto">Detect automatically</SelectItem>
								<SelectItem value="ymd">Year-month-day (2026-03-31)</SelectItem>
								<SelectItem value="mdy">Month/day/year (03/31/2026)</SelectItem>
								<SelectItem value="dmy">Day/month/year (31/03/2026)</SelectItem>
							</SelectField>
							<InputField
								label="Category when blank"
								value={defaultCategory}
								onChange={(e) => setDefaultCategory(e.target.value)}
							/>
						</div>
						<Checkbox
							checked={mapping.invert}
							onCheckedChange={(invert) => setMapping({ ...mapping, invert })}
							label="Spending shows as positive numbers in this file"
						/>
					</section>

					<section className="space-y-4">
						<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
							2. Choose an account
						</h3>
						<SelectField
							label="Account"
							value={accountId}
							onValueChange={setAccountId}
						>
							<SelectItem value={NO_ACCOUNT}>No account</SelectItem>
							{accounts.map((a) => (
								<SelectItem key={a._id} value={a._id}>
									{a.name}
								</SelectItem>
							))}
						</SelectField>
						{accountId !== NO_ACCOUNT && (
							<Checkbox
								checked={adjustBalances}
								onCheckedChange={setAdjustBalances}
								label="Also update this account's balance (leave off if the balance already includes these)"
							/>
						)}
					</section>

					<section className="space-y-3">
						<h3 className="text-sm font-semibold text-slate-900 dark:text-white">
							3. Check the preview
						</h3>
						{!isMappingComplete(mapping) ? (
							<p className="text-sm text-amber-700 dark:text-amber-400">
								Choose the date, description and amount columns to see a
								preview.
							</p>
						) : (
							<>
								<div className="flex flex-wrap gap-2 text-sm">
									<span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
										<CheckCircle2 size={16} /> {valid.length} ready
									</span>
									{invalid.length > 0 && (
										<span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
											<AlertCircle size={16} /> {invalid.length} will be skipped
										</span>
									)}
								</div>
								<div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
									<table className="w-full text-left text-sm">
										<thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
											<tr>
												<th className="px-3 py-2 font-medium">Row</th>
												<th className="px-3 py-2 font-medium">Date</th>
												<th className="px-3 py-2 font-medium">Description</th>
												<th className="px-3 py-2 font-medium">Category</th>
												<th className="px-3 py-2 text-right font-medium">
													Amount
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
											{results.slice(0, PREVIEW_ROWS).map((r) =>
												r.ok ? (
													<tr key={r.row}>
														<td className="px-3 py-2 text-slate-400">
															{r.row}
														</td>
														<td className="px-3 py-2 whitespace-nowrap tabular-nums">
															{r.value.date}
														</td>
														<td className="max-w-48 truncate px-3 py-2">
															{r.value.payee}
														</td>
														<td className="px-3 py-2">{r.value.category}</td>
														<td
															className={cn(
																"px-3 py-2 text-right whitespace-nowrap tabular-nums",
																r.value.type === "income" &&
																	"text-emerald-600 dark:text-emerald-400",
															)}
														>
															{format(
																r.value.type === "income"
																	? r.value.amount
																	: -r.value.amount,
																{ sign: true },
															)}
														</td>
													</tr>
												) : (
													<tr
														key={r.row}
														className="bg-amber-50/60 dark:bg-amber-500/5"
													>
														<td className="px-3 py-2 text-slate-400">
															{r.row}
														</td>
														<td
															colSpan={4}
															className="px-3 py-2 text-amber-700 dark:text-amber-400"
														>
															Skipped: {r.error}
														</td>
													</tr>
												),
											)}
										</tbody>
									</table>
								</div>
								{results.length > PREVIEW_ROWS && (
									<p className="text-xs text-slate-500 dark:text-slate-400">
										Showing the first {PREVIEW_ROWS} of {results.length} rows.
									</p>
								)}
							</>
						)}
						{progress !== null && (
							<div
								className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
								role="progressbar"
								aria-valuenow={Math.round(progress * 100)}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label="Import progress"
							>
								<div
									className="h-full rounded-full bg-violet-600 transition-[width]"
									style={{ width: `${Math.max(5, progress * 100)}%` }}
								/>
							</div>
						)}
					</section>
				</div>
			)}
		</Modal>
	);
}
