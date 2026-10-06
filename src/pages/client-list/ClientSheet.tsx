import { api } from "@convex/_generated/api";
import { Mail, Trash2 } from "lucide-react";
import { useEffect } from "react";
import Button from "@/shared/components/Button";
import {
	InputField,
	MoneyField,
	SelectField,
	SelectItem,
	TextAreaField,
} from "@/shared/components/forms";
import { Avatar } from "@/shared/components/ui/Avatar";
import { StatusBadge } from "@/shared/components/ui/Badge";
import { Modal } from "@/shared/components/ui/Modal";
import { type Client, useAppMutation, useMoney } from "@/shared/hooks/data";
import { useZodForm } from "@/shared/hooks/useZodForm";
import { todayIso } from "@/shared/lib/finance";
import { currencySymbol } from "@/shared/lib/money";
import { clientForm } from "@/shared/lib/schemas";

const initial = (client: Client | null) =>
	client
		? {
				name: client.name,
				email: client.email,
				company: client.company,
				status: client.status,
				revenue: String(client.revenue),
				lastContact: client.lastContact,
				notes: client.notes ?? "",
			}
		: {
				name: "",
				email: "",
				company: "",
				status: "Pending" as const,
				revenue: "0",
				lastContact: todayIso(),
				notes: "",
			};

export default function ClientSheet({
	open,
	onOpenChange,
	client,
	onDelete,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	client: Client | null;
	onDelete: (client: Client) => void;
}) {
	const { currency } = useMoney();
	const form = useZodForm(clientForm, initial(client));
	const create = useAppMutation(api.clients.create, {
		success: "Client added",
	});
	const update = useAppMutation(api.clients.update, {
		success: "Client saved",
	});
	const { reset } = form;

	useEffect(() => {
		if (open) reset(initial(client));
	}, [open, client, reset]);

	const save = () =>
		form.submit(async (data) => {
			const payload = { ...data, notes: data.notes || undefined };
			if (client) await update.mutateAsync({ id: client._id, ...payload });
			else await create.mutateAsync(payload);
			onOpenChange(false);
		});

	return (
		<Modal
			variant="sheet"
			open={open}
			onOpenChange={onOpenChange}
			title={client ? "Client details" : "Add client"}
			description={
				client
					? undefined
					: "Keep track of who you work with and what they're worth."
			}
			onSubmit={save}
			footer={
				<>
					{client && (
						<Button
							variant="danger-ghost"
							icon={<Trash2 size={16} />}
							className="sm:mr-auto"
							onClick={() => {
								onDelete(client);
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
						{client ? "Save changes" : "Add client"}
					</Button>
				</>
			}
		>
			{client && (
				<div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
					<Avatar name={form.values.name || client.name} size="lg" />
					<div className="min-w-0">
						<p className="truncate text-lg font-semibold text-slate-900 dark:text-white">
							{form.values.name || client.name}
						</p>
						<div className="mt-1 flex flex-wrap items-center gap-2">
							<StatusBadge status={form.values.status} />
							<a
								href={`mailto:${client.email}`}
								className="link inline-flex items-center gap-1 text-sm"
							>
								<Mail size={14} /> Email
							</a>
						</div>
					</div>
				</div>
			)}
			<InputField
				label="Full name"
				autoFocus={!client}
				autoComplete="off"
				{...form.field("name")}
			/>
			<InputField
				label="Email"
				type="email"
				autoComplete="off"
				{...form.field("email")}
			/>
			<InputField
				label="Company"
				placeholder="Optional"
				{...form.field("company")}
			/>
			<div className="grid grid-cols-2 gap-4">
				<SelectField
					label="Status"
					value={form.values.status}
					onValueChange={(v) => form.set("status", v as Client["status"])}
				>
					<SelectItem value="Active">Active</SelectItem>
					<SelectItem value="Pending">Pending</SelectItem>
					<SelectItem value="Inactive">Inactive</SelectItem>
				</SelectField>
				<MoneyField
					label="Revenue"
					symbol={currencySymbol(currency)}
					value={form.values.revenue}
					onValueChange={(v) => form.set("revenue", v)}
					onBlur={() => form.blur("revenue")}
					error={form.errors.revenue}
				/>
			</div>
			<InputField
				label="Last contact"
				type="date"
				max={todayIso()}
				{...form.field("lastContact")}
			/>
			<TextAreaField
				label="Notes"
				placeholder="Context, next steps, preferences…"
				rows={5}
				{...form.field("notes")}
			/>
		</Modal>
	);
}
