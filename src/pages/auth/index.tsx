import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import {
	ArrowLeft,
	BarChart3,
	Eye,
	EyeOff,
	Lock,
	Mail,
	PieChart,
	Sparkles,
	Target,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { savePendingClaim, setSignedOut } from "@/app/authFlow";
import logo from "@/shared/assets/logo.svg";
import Button from "@/shared/components/Button";
import { InputField } from "@/shared/components/forms";
import { useZodForm } from "@/shared/hooks/useZodForm";
import { cn } from "@/shared/lib/cn";
import { errorMessage } from "@/shared/lib/errors";
import { emailAddress, passwordRules } from "@/shared/lib/schemas";

type Flow = "signIn" | "signUp";

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

const FEATURES = [
	{ icon: BarChart3, text: "See where your money goes, month by month" },
	{ icon: PieChart, text: "Set budgets that update as you spend" },
	{ icon: Target, text: "Track savings goals and hit them on time" },
];

export default function AuthPage({
	initialFlow = "signIn",
	onBack,
	onSignedIn,
}: {
	initialFlow?: Flow;
	/** Set when a guest opened this page; returns them to the demo. */
	onBack?: () => void;
	onSignedIn?: () => void;
}) {
	const { signIn } = useAuthActions();
	const createGuestClaim = useMutation(api.users.createGuestClaim);
	const [flow, setFlow] = useState<Flow>(initialFlow);
	const [startingGuest, setStartingGuest] = useState(false);

	const continueAsGuest = async () => {
		setStartingGuest(true);
		setError(null);
		setSignedOut(false);
		try {
			await signIn("anonymous");
		} catch (err) {
			setError(errorMessage(err));
			setStartingGuest(false);
		}
	};
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const form = useZodForm(flow === "signIn" ? signInSchema : signUpSchema, {
		name: "",
		email: "",
		password: "",
	});

	useEffect(() => {
		document.title =
			flow === "signIn" ? "Sign in · Prospera" : "Create account · Prospera";
	}, [flow]);

	const switchFlow = (next: Flow) => {
		setFlow(next);
		setError(null);
		form.reset({ ...form.values, password: "" });
	};

	const onSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		form.submit(async (data) => {
			try {
				// A guest signing up keeps their workspace: grab a claim token
				// while still signed in as the guest.
				const claim =
					onBack && flow === "signUp" ? await createGuestClaim({}) : null;
				await signIn("password", {
					email: data.email,
					password: data.password,
					...(flow === "signUp" && data.name ? { name: data.name } : {}),
					flow,
				});
				setSignedOut(false);
				if (onBack) {
					// The live connection still carries the guest's credentials;
					// a reload starts cleanly as the new user.
					if (claim) savePendingClaim(claim);
					window.location.reload();
					return;
				}
				onSignedIn?.();
			} catch (err) {
				setError(errorMessage(err));
				throw err;
			}
		});
	};

	return (
		<div className="grid min-h-dvh lg:grid-cols-2">
			<aside className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
				<div className="absolute -top-32 -left-32 size-96 rounded-full bg-brand-pink/30 blur-3xl" />
				<div className="absolute -right-24 bottom-0 size-96 rounded-full bg-violet-600/30 blur-3xl" />
				<div className="relative flex items-center gap-3">
					<img src={logo} alt="" className="h-8 w-auto" />
					<span className="text-2xl font-bold">Prospera</span>
				</div>
				<div className="relative mt-auto max-w-md">
					<h2 className="text-4xl leading-tight font-bold">
						Your money, clearly.
					</h2>
					<p className="mt-4 text-lg text-slate-300">
						Accounts, spending, budgets and goals in one calm dashboard.
					</p>
					<ul className="mt-10 space-y-4">
						{FEATURES.map(({ icon: Icon, text }) => (
							<li key={text} className="flex items-center gap-3 text-slate-200">
								<span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
									<Icon size={18} />
								</span>
								{text}
							</li>
						))}
					</ul>
				</div>
			</aside>

			<main className="flex items-center justify-center px-4 py-12 sm:px-8">
				<div className="w-full max-w-sm animate-rise">
					<div className="mb-8 flex items-center gap-2 lg:hidden">
						<img src={logo} alt="" className="h-7 w-auto" />
						<span className="text-xl font-bold text-slate-900 dark:text-white">
							Prospera
						</span>
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
						{flow === "signIn" ? "Welcome back" : "Create your account"}
					</h1>
					<p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
						{flow === "signIn"
							? "Sign in to pick up where you left off."
							: "It takes less than a minute. No card required."}
					</p>

					<div
						role="tablist"
						aria-label="Sign in or sign up"
						className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70"
					>
						{(["signIn", "signUp"] as const).map((value) => (
							<button
								key={value}
								type="button"
								role="tab"
								aria-selected={flow === value}
								onClick={() => switchFlow(value)}
								className={cn(
									"rounded-lg py-2 text-sm font-medium transition-colors",
									flow === value
										? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
										: "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
								)}
							>
								{value === "signIn" ? "Sign in" : "Sign up"}
							</button>
						))}
					</div>

					<form noValidate onSubmit={onSubmit} className="mt-6 space-y-4">
						{flow === "signUp" && (
							<InputField
								label="Name"
								icon={<User />}
								autoComplete="name"
								placeholder="Alex Morgan"
								{...form.field("name")}
							/>
						)}
						<InputField
							label="Email"
							type="email"
							icon={<Mail />}
							autoComplete="email"
							placeholder="you@example.com"
							autoFocus
							{...form.field("email")}
						/>
						<InputField
							label="Password"
							type={showPassword ? "text" : "password"}
							icon={<Lock />}
							autoComplete={
								flow === "signIn" ? "current-password" : "new-password"
							}
							hint={flow === "signUp" ? "At least 8 characters." : undefined}
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

						<Button
							type="submit"
							fullWidth
							size="lg"
							isLoading={form.submitting}
						>
							{flow === "signIn" ? "Sign in" : "Create account"}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
						{flow === "signIn"
							? "New to Prospera? "
							: "Already have an account? "}
						<button
							type="button"
							className="link"
							onClick={() =>
								switchFlow(flow === "signIn" ? "signUp" : "signIn")
							}
						>
							{flow === "signIn" ? "Create an account" : "Sign in"}
						</button>
					</p>

					<div className="mt-8 border-t border-slate-200 pt-6 text-center dark:border-slate-800">
						{onBack ? (
							<Button
								variant="ghost"
								icon={<ArrowLeft size={16} />}
								onClick={onBack}
							>
								Back to the demo
							</Button>
						) : (
							<>
								<p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
									Just looking around?
								</p>
								<Button
									variant="secondary"
									fullWidth
									icon={<Sparkles size={16} />}
									isLoading={startingGuest}
									onClick={continueAsGuest}
								>
									Explore the demo as a guest
								</Button>
							</>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
