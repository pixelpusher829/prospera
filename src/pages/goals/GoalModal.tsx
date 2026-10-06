import { api } from "@convex/_generated/api";
import { useEffect } from "react";
import Button from "@/shared/components/Button";
import {
	COLOR_PALETTE,
	ColorPicker,
	InputField,
	MoneyField,
} from "@/shared/components/forms";
import { Modal } from "@/shared/components/ui/Modal";
import { type Goal, useAppMutation, useMoney } from "@/shared/hooks/data";
import { useZodForm } from "@/shared/hooks/useZodForm";
import { cn } from "@/shared/lib/cn";
import { addDays, todayIso } from "@/shared/lib/finance";
import { GOAL_ICONS } from "@/shared/lib/icons";
import { currencySymbol } from "@/shared/lib/money";
import { goalForm } from "@/shared/lib/schemas";

const initial = (goal: Goal | null) =>
	goal
		? {
				name: goal.name,
				targetAmount: String(goal.targetAmount),
				currentAmount: String(goal.currentAmount),
				deadline: goal.deadline,
				icon: goal.icon,
				color: goal.color,
			}
		: {
				name: "",
				targetAmount: "",
				currentAmount: "0",
				deadline: addDays(todayIso(), 365),
				icon: "target",
				color: COLOR_PALETTE[0],
			};

export default function GoalModal({
	open,
	onOpenChange,
	goal,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	goal: Goal | null;
}) {
	const { currency } = useMoney();
	const form = useZodForm(goalForm, initial(goal));
	const create = useAppMutation(api.goals.create, { success: "Goal created" });
	const update = useAppMutation(api.goals.update, { success: "Goal updated" });
	const { reset } = form;

	useEffect(() => {
		if (open) reset(initial(goal));
	}, [open, goal, reset]);

	const save = () =>
		form.submit(async (data) => {
			if (goal) await update.mutateAsync({ id: goal._id, ...data });
			else await create.mutateAsync(data);
			onOpenChange(false);
		});

	const symbol = currencySymbol(currency);

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={goal ? "Edit goal" : "New savings goal"}
			onSubmit={save}
			footer={
				<>
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button type="submit" isLoading={form.submitting}>
						{goal ? "Save changes" : "Create goal"}
					</Button>
				</>
			}
		>
			<InputField
				label="What are you saving for?"
				placeholder="e.g. Emergency fund, Japan trip"
				autoFocus
				{...form.field("name")}
			/>
			<div className="grid gap-4 sm:grid-cols-2">
				<MoneyField
					label="Target amount"
					symbol={symbol}
					placeholder="5,000"
					value={form.values.targetAmount}
					onValueChange={(v) => form.set("targetAmount", v)}
					onBlur={() => form.blur("targetAmount")}
					error={form.errors.targetAmount}
				/>
				<MoneyField
					label="Saved so far"
					symbol={symbol}
					value={form.values.currentAmount}
					onValueChange={(v) => form.set("currentAmount", v)}
					onBlur={() => form.blur("currentAmount")}
					error={form.errors.currentAmount}
				/>
			</div>
			<InputField
				label="Target date"
				type="date"
				min={goal ? undefined : todayIso()}
				{...form.field("deadline")}
			/>
			<fieldset>
				<legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
					Icon
				</legend>
				<div className="flex flex-wrap gap-2">
					{Object.entries(GOAL_ICONS).map(([key, Icon]) => (
						<button
							key={key}
							type="button"
							onClick={() => form.set("icon", key)}
							aria-pressed={form.values.icon === key}
							aria-label={key}
							className={cn(
								"flex size-10 items-center justify-center rounded-xl border transition-colors",
								form.values.icon === key
									? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
									: "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
							)}
						>
							<Icon size={18} />
						</button>
					))}
				</div>
			</fieldset>
			<ColorPicker
				value={form.values.color}
				onChange={(c) => form.set("color", c)}
			/>
		</Modal>
	);
}
