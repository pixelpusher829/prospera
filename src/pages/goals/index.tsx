import { api } from "@convex/_generated/api";
import {
	CalendarDays,
	CheckCircle2,
	MinusCircle,
	MoreVertical,
	Pencil,
	Plus,
	PlusCircle,
	Target,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Button from "@/shared/components/Button";
import { MoneyField } from "@/shared/components/forms";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Menu, MenuItem, MenuSeparator } from "@/shared/components/ui/Menu";
import { Modal } from "@/shared/components/ui/Modal";
import { PageSkeleton } from "@/shared/components/ui/Skeleton";
import {
	type Goal,
	optimisticList,
	stripSystemFields,
	useAppMutation,
	useGoals,
	useMoney,
} from "@/shared/hooks/data";
import Header from "@/shared/layout/Header";
import { cn } from "@/shared/lib/cn";
import { goalProgress, parseIsoDate, todayIso } from "@/shared/lib/finance";
import { GOAL_ICONS, iconFor } from "@/shared/lib/icons";
import { currencySymbol, parseMoney } from "@/shared/lib/money";
import { BRAND_GRADIENT } from "@/shared/lib/tints";
import GoalModal from "./GoalModal";

function ContributeModal({
	goal,
	mode,
	onClose,
}: {
	goal: Goal | null;
	mode: "add" | "withdraw";
	onClose: () => void;
}) {
	const { format, currency } = useMoney();
	const [amount, setAmount] = useState("");
	const [touched, setTouched] = useState(false);
	const contribute = useAppMutation(api.goals.contribute, {
		success: ({ amount }) =>
			amount > 0 ? `Added ${format(amount)}` : `Withdrew ${format(-amount)}`,
	});
	const value = parseMoney(amount);
	const error =
		value === null || value <= 0
			? "Enter an amount."
			: mode === "withdraw" && goal && value > goal.currentAmount
				? `You only have ${format(goal.currentAmount)} saved.`
				: undefined;

	const submit = () => {
		setTouched(true);
		if (!goal || error || value === null) return;
		contribute.mutate(
			{ id: goal._id, amount: mode === "add" ? value : -value },
			{
				onSuccess: () => {
					setAmount("");
					setTouched(false);
					onClose();
				},
			},
		);
	};

	return (
		<Modal
			open={goal !== null}
			onOpenChange={(open) => {
				if (!open) {
					setAmount("");
					setTouched(false);
					onClose();
				}
			}}
			title={
				mode === "add" ? `Add to ${goal?.name}` : `Withdraw from ${goal?.name}`
			}
			size="sm"
			onSubmit={submit}
			footer={
				<>
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" isLoading={contribute.isPending}>
						{mode === "add" ? "Add money" : "Withdraw"}
					</Button>
				</>
			}
		>
			<MoneyField
				label="Amount"
				symbol={currencySymbol(currency)}
				autoFocus
				value={amount}
				onValueChange={setAmount}
				onBlur={() => setTouched(true)}
				error={touched ? error : undefined}
				hint={
					goal
						? `${format(goal.currentAmount)} saved of ${format(goal.targetAmount)}`
						: undefined
				}
			/>
		</Modal>
	);
}

function GoalCard({
	goal,
	onEdit,
	onContribute,
	onDelete,
}: {
	goal: Goal;
	onEdit: () => void;
	onContribute: (mode: "add" | "withdraw") => void;
	onDelete: () => void;
}) {
	const { format } = useMoney();
	const p = goalProgress(goal, todayIso());
	const Icon = iconFor(GOAL_ICONS, goal.icon, Target);
	const deadline = parseIsoDate(goal.deadline).toLocaleDateString(undefined, {
		month: "short",
		year: "numeric",
	});

	return (
		<Card className="flex flex-col">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white">
						<Icon size={22} />
					</span>
					<div className="min-w-0">
						<h3 className="truncate text-lg font-semibold text-zinc-900 dark:text-white">
							{goal.name}
						</h3>
						<p
							className={cn(
								"mt-0.5 flex items-center gap-1 text-xs",
								p.isOverdue
									? "text-amber-600 dark:text-amber-400"
									: "text-zinc-500 dark:text-zinc-400",
							)}
						>
							<CalendarDays size={12} />
							{p.isOverdue ? `Target was ${deadline}` : `By ${deadline}`}
						</p>
					</div>
				</div>
				<Menu
					label={`${goal.name} actions`}
					trigger={
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={`Actions for ${goal.name}`}
							className="-mr-2 text-zinc-400"
						>
							<MoreVertical size={18} />
						</Button>
					}
				>
					<MenuItem icon={<PlusCircle />} onSelect={() => onContribute("add")}>
						Add money
					</MenuItem>
					<MenuItem
						icon={<MinusCircle />}
						onSelect={() => onContribute("withdraw")}
						disabled={goal.currentAmount <= 0}
					>
						Withdraw
					</MenuItem>
					<MenuItem icon={<Pencil />} onSelect={onEdit}>
						Edit
					</MenuItem>
					<MenuSeparator />
					<MenuItem icon={<Trash2 />} onSelect={onDelete} danger>
						Delete
					</MenuItem>
				</Menu>
			</div>

			<div className="mt-6 flex items-end justify-between gap-2">
				<span className="font-display text-2xl font-bold tracking-tight text-zinc-900 tabular-nums dark:text-white">
					{format(goal.currentAmount)}
				</span>
				<span className="mb-0.5 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
					of {format(goal.targetAmount)}
				</span>
			</div>
			<div
				className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
				role="progressbar"
				aria-valuenow={p.pct}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={`${goal.name} progress`}
			>
				<div
					className={cn(
						"h-full rounded-full transition-[width] duration-700 ease-out",
						BRAND_GRADIENT,
					)}
					style={{ width: `${Math.max(2, p.pct)}%` }}
				/>
			</div>
			<div className="mt-3 flex items-center justify-between text-sm">
				<span className="font-semibold text-zinc-900 tabular-nums dark:text-white">
					{p.pct}%
				</span>
				{p.isComplete ? (
					<span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
						<CheckCircle2 size={16} /> Goal reached
					</span>
				) : (
					<span className="text-zinc-500 dark:text-zinc-400">
						{p.isOverdue
							? `${format(p.remaining)} to go`
							: `${format(p.monthlyNeeded, { whole: p.monthlyNeeded >= 100 })}/mo to finish on time`}
					</span>
				)}
			</div>
			{!p.isComplete && (
				<Button
					variant="secondary"
					size="sm"
					icon={<Plus size={14} />}
					className="mt-5 self-start"
					onClick={() => onContribute("add")}
				>
					Add money
				</Button>
			)}
		</Card>
	);
}

export default function Goals() {
	const { data: goals } = useGoals();
	const [editing, setEditing] = useState<Goal | null>(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [contributing, setContributing] = useState<{
		goal: Goal;
		mode: "add" | "withdraw";
	} | null>(null);
	const create = useAppMutation(api.goals.create);
	const remove = useAppMutation(api.goals.remove, {
		optimistic: (qc, { id }) =>
			optimisticList(qc, api.goals.list, (list) =>
				list.filter((g) => g._id !== id),
			),
	});

	if (!goals) return <PageSkeleton />;

	const openNew = () => {
		setEditing(null);
		setModalOpen(true);
	};

	const deleteGoal = (goal: Goal) =>
		remove.mutate(
			{ id: goal._id },
			{
				onSuccess: () =>
					toast(`Deleted "${goal.name}"`, {
						action: {
							label: "Undo",
							onClick: () => create.mutate(stripSystemFields(goal)),
						},
					}),
			},
		);

	const active = goals.filter((g) => g.currentAmount < g.targetAmount);
	const done = goals.filter((g) => g.currentAmount >= g.targetAmount);

	const grid = (list: Goal[]) => (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
			{list.map((goal) => (
				<GoalCard
					key={goal._id}
					goal={goal}
					onEdit={() => {
						setEditing(goal);
						setModalOpen(true);
					}}
					onContribute={(mode) => setContributing({ goal, mode })}
					onDelete={() => deleteGoal(goal)}
				/>
			))}
		</div>
	);

	return (
		<div className="page">
			<Header
				heading="Goals"
				subheading="Save with a plan, not just good intentions."
			>
				{goals.length > 0 && (
					<Button icon={<Plus size={16} />} onClick={openNew}>
						New goal
					</Button>
				)}
			</Header>

			{goals.length === 0 ? (
				<EmptyState
					icon={Target}
					title="What are you saving for?"
					description="Set a target and a date. Prospera works out how much to put aside each month."
				>
					<Button icon={<Plus size={16} />} onClick={openNew}>
						Create your first goal
					</Button>
				</EmptyState>
			) : (
				<>
					{active.length > 0 ? (
						grid(active)
					) : (
						<p className="text-sm text-zinc-500 dark:text-zinc-400">
							Every goal is complete. Time to set a new one!
						</p>
					)}
					{done.length > 0 && (
						<section className="space-y-3">
							<h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
								Completed
							</h2>
							{grid(done)}
						</section>
					)}
				</>
			)}

			<GoalModal open={modalOpen} onOpenChange={setModalOpen} goal={editing} />
			<ContributeModal
				goal={contributing?.goal ?? null}
				mode={contributing?.mode ?? "add"}
				onClose={() => setContributing(null)}
			/>
		</div>
	);
}
