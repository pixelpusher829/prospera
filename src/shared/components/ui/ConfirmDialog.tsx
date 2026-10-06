import type React from "react";
import { useState } from "react";
import Button from "@/shared/components/Button";
import { InputField } from "@/shared/components/forms";
import { Modal } from "./Modal";

/**
 * Confirmation for irreversible actions. Pass `confirmText` to make the user
 * type a phrase (e.g. their email) before the button unlocks.
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Delete",
	confirmText,
	onConfirm,
	tone = "danger",
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: React.ReactNode;
	confirmLabel?: string;
	confirmText?: string;
	onConfirm: (typed: string) => Promise<unknown> | unknown;
	tone?: "danger" | "primary";
}) {
	const [typed, setTyped] = useState("");
	const [busy, setBusy] = useState(false);
	const locked =
		confirmText !== undefined &&
		typed.trim().toLowerCase() !== confirmText.toLowerCase();

	const close = (next: boolean) => {
		if (!next) setTyped("");
		onOpenChange(next);
	};

	const confirm = async () => {
		if (locked) return;
		setBusy(true);
		try {
			await onConfirm(typed);
			close(false);
		} catch {
			// The caller reports the error; keep the dialog open.
		} finally {
			setBusy(false);
		}
	};

	return (
		<Modal
			open={open}
			onOpenChange={close}
			title={title}
			size="sm"
			onSubmit={confirm}
			footer={
				<>
					<Button variant="secondary" onClick={() => close(false)}>
						Cancel
					</Button>
					<Button
						type="submit"
						variant={tone === "danger" ? "danger" : "primary"}
						disabled={locked}
						isLoading={busy}
					>
						{confirmLabel}
					</Button>
				</>
			}
		>
			<div className="text-sm text-slate-600 dark:text-slate-300">
				{description}
			</div>
			{confirmText !== undefined && (
				<InputField
					label={`Type ${confirmText} to confirm`}
					value={typed}
					onChange={(e) => setTyped(e.target.value)}
					autoComplete="off"
					autoFocus
				/>
			)}
		</Modal>
	);
}
