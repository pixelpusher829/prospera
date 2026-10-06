import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import Button from "@/shared/components/Button";
import { InputField } from "@/shared/components/forms";
import { Modal } from "@/shared/components/ui/Modal";
import { useZodForm } from "@/shared/hooks/useZodForm";
import { cn } from "@/shared/lib/cn";
import { errorMessage } from "@/shared/lib/errors";
import { emailAddress, passwordRules } from "@/shared/lib/schemas";
import { type AuthFlow, savePendingClaim } from "./authFlow";

const signInSchema = z.object({
	name: z.string(),
	email: emailAddress,
	password: z.string().min(1, "Enter your password."),
});

const signUpSchema = z.object({
	name: z.string().trim().max(60, "Keep your name under 60 characters."),
	email: emailAddress,
	password: passwordRules,
});

const EMPTY = { name: "", email: "", password: "" };

/**
 * Optional sign-up / sign-in, opened from the guest demo. Never a gate:
 * closing it returns to the demo exactly as it was.
 */
export function AuthDialog({
	flow,
	onFlowChange,
	onClose,
}: {
	flow: AuthFlow | null;
	onFlowChange: (flow: AuthFlow) => void;
	onClose: () => void;
}) {
	const { signIn } = useAuthActions();
	const createGuestClaim = useMutation(api.users.createGuestClaim);
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const isSignUp = flow !== "signIn";
	const form = useZodForm(isSignUp ? signUpSchema : signInSchema, EMPTY);
	const { reset } = form;

	useEffect(() => {
		if (flow) {
			reset(EMPTY);
			setError(null);
			setShowPassword(false);
		}
	}, [flow, reset]);

	const switchTo = (next: AuthFlow) => {
		onFlowChange(next);
		setError(null);
	};

	const submit = () => {
		setError(null);
		form.submit(async (data) => {
			try {
				// Signing up keeps the guest workspace; get a claim token while
				// we're still signed in as the guest.
				const claim = isSignUp ? await createGuestClaim({}) : null;
				await signIn("password", {
					email: data.email,
					password: data.password,
					...(isSignUp && data.name ? { name: data.name } : {}),
					flow: isSignUp ? "signUp" : "signIn",
				});
				if (claim) savePendingClaim(claim);
				// Reload so the live connection starts fresh as the new user.
				window.location.reload();
			} catch (err) {
				setError(errorMessage(err));
				throw err;
			}
		});
	};

	return (
		<Modal
			open={flow !== null}
			onOpenChange={(open) => !open && onClose()}
			size="sm"
			title={isSignUp ? "Save your workspace" : "Welcome back"}
			description={
				isSignUp
					? "Everything in this demo, including your changes, moves into your new account."
					: "Sign in to your Prospera account."
			}
			onSubmit={submit}
			footer={
				<Button type="submit" fullWidth isLoading={form.submitting}>
					{isSignUp ? "Create account" : "Sign in"}
				</Button>
			}
		>
			{isSignUp && (
				<InputField
					label="Name"
					autoComplete="name"
					placeholder="Optional"
					{...form.field("name")}
				/>
			)}
			<InputField
				label="Email"
				type="email"
				autoComplete="email"
				autoFocus
				{...form.field("email")}
			/>
			<InputField
				label="Password"
				type={showPassword ? "text" : "password"}
				autoComplete={isSignUp ? "new-password" : "current-password"}
				hint={isSignUp ? "At least 8 characters." : undefined}
				suffix={
					<button
						type="button"
						onClick={() => setShowPassword((s) => !s)}
						className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
						aria-label={showPassword ? "Hide password" : "Show password"}
					>
						{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
					</button>
				}
				{...form.field("password")}
			/>
			{error && (
				<p
					role="alert"
					className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
				>
					{error}
				</p>
			)}
			<p className="text-sm text-slate-500 dark:text-slate-400">
				{isSignUp ? "Already have an account? " : "New here? "}
				<button
					type="button"
					className={cn("link")}
					onClick={() => switchTo(isSignUp ? "signIn" : "signUp")}
				>
					{isSignUp ? "Sign in" : "Create an account"}
				</button>
			</p>
		</Modal>
	);
}
