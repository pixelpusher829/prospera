import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNowStrict } from "date-fns";
import {
	ChevronDown,
	CircleCheck,
	CircleSlash,
	Download,
	MoreHorizontal,
	Pencil,
	Plus,
	Search,
	Trash2,
	Users,
	X,
} from "lucide-react";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Button from "@/shared/components/Button";
import { InputField, SelectField, SelectItem } from "@/shared/components/forms";
import Table, { type Column, type SortState } from "@/shared/components/Table";
import { Avatar } from "@/shared/components/ui/Avatar";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { BulkBar, BulkButton } from "@/shared/components/ui/BulkBar";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Menu, MenuItem, MenuLabel } from "@/shared/components/ui/Menu";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import {
	type Client,
	optimisticList,
	stripSystemFields,
	useAppMutation,
	useClients,
	useMoney,
} from "@/shared/hooks/data";
import Header from "@/shared/layout/Header";
import { downloadFile, safeCell } from "@/shared/lib/csv";
import { parseIsoDate, todayIso } from "@/shared/lib/finance";
import { LoadDemoButton } from "../dashboard/Onboarding";
import ClientSheet from "./ClientSheet";

const STATUSES: Client["status"][] = ["Active", "Pending", "Inactive"];

const lastContact = (iso: string) =>
	iso === todayIso()
		? "Today"
		: formatDistanceToNowStrict(parseIsoDate(iso), { addSuffix: true });

export default function ClientList() {
	const { data: clients } = useClients();
	const { format } = useMoney();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");
	const [sort, setSort] = useState<SortState>({
		key: "name",
		direction: "asc",
	});
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [sheet, setSheet] = useState<{ open: boolean; client: Client | null }>({
		open: false,
		client: null,
	});

	const ids = (rows: Client[]) => rows.map((c) => c._id as Id<"clients">);

	const bulkSetStatus = useAppMutation(api.clients.bulkSetStatus, {
		success: ({ ids, status }) =>
			ids.length === 1
				? `Marked ${status.toLowerCase()}`
				: `${ids.length} clients marked ${status.toLowerCase()}`,
		optimistic: (qc, { ids, status }) => {
			const set = new Set<string>(ids);
			return optimisticList(qc, api.clients.list, (list) =>
				list.map((c) => (set.has(c._id) ? { ...c, status } : c)),
			);
		},
	});
	const bulkRemove = useAppMutation(api.clients.bulkRemove, {
		optimistic: (qc, { ids }) => {
			const set = new Set<string>(ids);
			return optimisticList(qc, api.clients.list, (list) =>
				list.filter((c) => !set.has(c._id)),
			);
		},
	});
	const bulkCreate = useAppMutation(api.clients.bulkCreate);

	const removeWithUndo = (rows: Client[]) =>
		bulkRemove.mutate(
			{ ids: ids(rows) },
			{
				onSuccess: () => {
					setSelectedIds(new Set());
					toast(
						rows.length === 1
							? `Deleted ${rows[0].name}`
							: `Deleted ${rows.length} clients`,
						{
							action: {
								label: "Undo",
								onClick: () =>
									bulkCreate.mutate(
										{ items: rows.map(stripSystemFields) },
										{ onSuccess: () => toast.success("Restored") },
									),
							},
						},
					);
				},
			},
		);

	const filtered = useMemo(() => {
		if (!clients) return [];
		const q = search.trim().toLowerCase();
		const dir = sort.direction === "asc" ? 1 : -1;
		return clients
			.filter(
				(c) =>
					(status === "all" || c.status === status) &&
					(!q ||
						c.name.toLowerCase().includes(q) ||
						c.email.toLowerCase().includes(q) ||
						c.company.toLowerCase().includes(q)),
			)
			.sort((a, b) => {
				if (sort.key === "revenue") return (a.revenue - b.revenue) * dir;
				const key = sort.key as "name" | "company" | "status" | "lastContact";
				return a[key].localeCompare(b[key]) * dir;
			});
	}, [clients, search, status, sort]);

	const selected = filtered.filter((c) => selectedIds.has(c._id));

	if (!clients) return <PageSkeleton tiles={0} />;

	const totals = {
		active: clients.filter((c) => c.status === "Active").length,
		revenue: clients.reduce((s, c) => s + c.revenue, 0),
	};

	const exportCsv = () => {
		const rows = selected.length ? selected : filtered;
		downloadFile(
			`prospera-clients-${todayIso()}.csv`,
			Papa.unparse(
				rows.map((c) => ({
					Name: safeCell(c.name),
					Email: safeCell(c.email),
					Company: safeCell(c.company),
					Status: c.status,
					Revenue: c.revenue.toFixed(2),
					"Last contact": c.lastContact,
					Notes: safeCell(c.notes ?? ""),
				})),
			),
		);
		toast.success(
			`Exported ${rows.length} client${rows.length === 1 ? "" : "s"}`,
		);
	};

	const columns: Column<Client>[] = [
		{
			header: "Name",
			sortKey: "name",
			cell: (c) => (
				<span className="flex items-center gap-3">
					<Avatar name={c.name} size="sm" />
					<span className="min-w-0">
						<span className="block max-w-56 truncate font-medium text-slate-900 dark:text-white">
							{c.name}
						</span>
						<span className="block max-w-56 truncate text-xs text-slate-500 dark:text-slate-400">
							{c.email}
						</span>
					</span>
				</span>
			),
		},
		{
			header: "Company",
			sortKey: "company",
			className: "text-slate-600 dark:text-slate-300",
			cell: (c) =>
				c.company || (
					<span className="text-slate-300 dark:text-slate-600">—</span>
				),
		},
		{
			header: "Status",
			sortKey: "status",
			cell: (c) => (
				<Menu
					label="Change status"
					align="start"
					trigger={
						<button
							type="button"
							className="inline-flex items-center gap-1 rounded-full"
							aria-label={`Status: ${c.status}. Change status`}
						>
							<StatusBadge status={c.status} />
							<ChevronDown size={12} className="text-slate-400" />
						</button>
					}
				>
					<MenuLabel>Set status</MenuLabel>
					{STATUSES.map((s) => (
						<MenuItem
							key={s}
							onSelect={() => bulkSetStatus.mutate({ ids: [c._id], status: s })}
						>
							{s}
						</MenuItem>
					))}
				</Menu>
			),
		},
		{
			header: "Revenue",
			sortKey: "revenue",
			align: "right",
			className: "font-semibold text-slate-900 tabular-nums dark:text-white",
			cell: (c) => format(c.revenue, { whole: true }),
		},
		{
			header: "Last contact",
			sortKey: "lastContact",
			className: "text-slate-500 dark:text-slate-400",
			cell: (c) => lastContact(c.lastContact),
		},
	];

	return (
		<div className="page pb-28">
			<Header
				heading="Clients"
				subheading="The people and businesses you work with."
			>
				{clients.length > 0 && (
					<Button
						variant="secondary"
						icon={<Download size={16} />}
						onClick={exportCsv}
					>
						Export
					</Button>
				)}
				<Button
					icon={<Plus size={16} />}
					onClick={() => setSheet({ open: true, client: null })}
				>
					Add client
				</Button>
			</Header>

			{clients.length === 0 ? (
				<EmptyState
					icon={Users}
					title="No clients yet"
					description="Track the businesses you work with, what they've earned you and when you last spoke."
				>
					<Button
						icon={<Plus size={16} />}
						onClick={() => setSheet({ open: true, client: null })}
					>
						Add client
					</Button>
					<LoadDemoButton />
				</EmptyState>
			) : (
				<>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<InputField
							aria-label="Search clients"
							placeholder="Search name, email or company"
							icon={<Search />}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							containerClassName="sm:max-w-sm"
							suffix={
								search && (
									<button
										type="button"
										onClick={() => setSearch("")}
										className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
										aria-label="Clear search"
									>
										<X size={14} />
									</button>
								)
							}
						/>
						<SelectField
							aria-label="Status"
							value={status}
							onValueChange={setStatus}
							containerClassName="sm:w-44"
						>
							<SelectItem value="all">All statuses</SelectItem>
							{STATUSES.map((s) => (
								<SelectItem key={s} value={s}>
									{s}
								</SelectItem>
							))}
						</SelectField>
						<p className="text-sm text-slate-500 sm:ml-auto dark:text-slate-400">
							{totals.active} active · {format(totals.revenue, { whole: true })}{" "}
							total revenue
						</p>
					</div>

					<Table
						caption="Clients"
						data={filtered}
						columns={columns}
						getRowId={(c) => c._id}
						getRowLabel={(c) => c.name}
						sort={sort}
						onSort={(key) =>
							setSort((s) => ({
								key,
								direction:
									s.key === key && s.direction === "asc" ? "desc" : "asc",
							}))
						}
						selectedIds={selectedIds}
						onSelectionChange={setSelectedIds}
						onRowClick={(client) => setSheet({ open: true, client })}
						empty={
							<EmptyState
								icon={Search}
								title="No matching clients"
								description="Try another search or status."
							>
								<Button
									variant="secondary"
									onClick={() => {
										setSearch("");
										setStatus("all");
									}}
								>
									Clear filters
								</Button>
							</EmptyState>
						}
						renderMobileRow={(c) => (
							<span className="flex items-center gap-3">
								<Avatar name={c.name} size="sm" />
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium text-slate-900 dark:text-white">
										{c.name}
									</span>
									<span className="block truncate text-xs text-slate-500 dark:text-slate-400">
										{c.company || c.email} · {lastContact(c.lastContact)}
									</span>
								</span>
								<StatusBadge status={c.status} />
							</span>
						)}
						renderRowActions={(c) => (
							<Menu
								label="Client actions"
								trigger={
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Actions for ${c.name}`}
										className="text-slate-400 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
									>
										<MoreHorizontal size={18} />
									</Button>
								}
							>
								<MenuItem
									icon={<Pencil />}
									onSelect={() => setSheet({ open: true, client: c })}
								>
									Open
								</MenuItem>
								<MenuItem
									icon={<Trash2 />}
									onSelect={() => removeWithUndo([c])}
									danger
								>
									Delete
								</MenuItem>
							</Menu>
						)}
					/>
				</>
			)}

			<BulkBar
				count={selected.length}
				noun="clients"
				onClear={() => setSelectedIds(new Set())}
			>
				<BulkButton
					icon={<CircleCheck />}
					onClick={() => {
						bulkSetStatus.mutate({ ids: ids(selected), status: "Active" });
						setSelectedIds(new Set());
					}}
				>
					Set active
				</BulkButton>
				<BulkButton
					icon={<CircleSlash />}
					onClick={() => {
						bulkSetStatus.mutate({ ids: ids(selected), status: "Inactive" });
						setSelectedIds(new Set());
					}}
				>
					Set inactive
				</BulkButton>
				<BulkButton icon={<Download />} onClick={exportCsv}>
					Export
				</BulkButton>
				<BulkButton
					danger
					icon={<Trash2 />}
					onClick={() => removeWithUndo(selected)}
				>
					Delete
				</BulkButton>
			</BulkBar>

			<ClientSheet
				open={sheet.open}
				onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
				client={sheet.client}
				onDelete={(c) => removeWithUndo([c])}
			/>
		</div>
	);
}
