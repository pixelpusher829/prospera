import { api } from "@convex/_generated/api";
import { useConvexAction } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Button from "@/shared/components/Button";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { useLatestInsight } from "@/shared/hooks/data";
import { errorMessage } from "@/shared/lib/errors";

export default function AiAdvisor({ hasData }: { hasData: boolean }) {
	const { data: latest, isPending } = useLatestInsight();
	const generate = useMutation({
		mutationFn: useConvexAction(api.ai.generate),
		onError: (error) => toast.error(errorMessage(error)),
	});

	return (
		<section
			aria-labelledby="ai-title"
			className="relative flex flex-col overflow-hidden rounded-2xl bg-linear-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-600/20 sm:p-6 dark:from-violet-700/80 dark:to-indigo-900 dark:shadow-none dark:ring-1 dark:ring-violet-500/30"
		>
			<div className="absolute -top-16 -right-16 size-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
			<div className="relative mb-4 flex items-center gap-3">
				<span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
					<Sparkles size={18} className="text-amber-200" />
				</span>
				<div>
					<h2 id="ai-title" className="font-semibold">
						AI advisor
					</h2>
					<p className="text-xs text-violet-200">
						Personal tips based on this month's numbers
					</p>
				</div>
			</div>

			<div
				className="relative min-h-28 flex-1 rounded-xl bg-white/10 p-4 ring-1 ring-white/10"
				aria-live="polite"
				aria-busy={generate.isPending}
			>
				{isPending || generate.isPending ? (
					<div className="space-y-2">
						<Skeleton className="h-3 w-full bg-white/20 dark:bg-white/20" />
						<Skeleton className="h-3 w-11/12 bg-white/20 dark:bg-white/20" />
						<Skeleton className="h-3 w-4/5 bg-white/20 dark:bg-white/20" />
					</div>
				) : latest ? (
					<>
						<p className="text-sm leading-relaxed text-violet-50">
							{latest.text}
						</p>
						<p className="mt-3 text-xs text-violet-200">
							Generated{" "}
							{formatDistanceToNow(latest.createdAt, { addSuffix: true })}
						</p>
					</>
				) : (
					<p className="text-sm text-violet-100">
						{hasData
							? "Get three quick, specific suggestions based on your spending and budgets."
							: "Add a few transactions first, then ask for advice."}
					</p>
				)}
			</div>

			<Button
				onClick={() => generate.mutate({})}
				isLoading={generate.isPending}
				disabled={!hasData}
				icon={latest ? <RefreshCw size={16} /> : <Sparkles size={16} />}
				className="relative mt-4 w-full bg-white text-violet-700 shadow-none hover:bg-violet-50 dark:bg-white/15 dark:text-white dark:hover:bg-white/25"
			>
				{latest ? "Refresh advice" : "Get advice"}
			</Button>
			<p className="relative mt-3 text-[11px] leading-snug text-violet-200/80">
				Only totals are shared with the AI, never payee names or account
				details. Not financial advice.
			</p>
		</section>
	);
}
