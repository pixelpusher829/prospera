import { api } from "@convex/_generated/api";
import { useConvexAction } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Lightbulb, RefreshCw } from "lucide-react";
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
			className="card flex flex-col p-5 sm:p-6"
		>
			<div className="mb-4 flex items-center gap-3">
				<span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-red to-brand-pink text-white">
					<Lightbulb size={18} />
				</span>
				<div>
					<h2
						id="ai-title"
						className="font-semibold text-zinc-900 dark:text-white"
					>
						Advisor
					</h2>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">
						Personal tips based on this month's numbers
					</p>
				</div>
			</div>

			<div
				className="min-h-28 flex-1 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50"
				aria-live="polite"
				aria-busy={generate.isPending}
			>
				{isPending || generate.isPending ? (
					<div className="space-y-2">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-11/12" />
						<Skeleton className="h-3 w-4/5" />
					</div>
				) : latest ? (
					<>
						<p className="text-sm leading-relaxed whitespace-pre-line text-zinc-700 dark:text-zinc-200">
							{latest.text}
						</p>
						<p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
							Generated{" "}
							{formatDistanceToNow(latest.createdAt, { addSuffix: true })}
						</p>
					</>
				) : (
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
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
				icon={latest ? <RefreshCw size={16} /> : <Lightbulb size={16} />}
				variant={latest ? "secondary" : "primary"}
				className="mt-4 w-full"
			>
				{latest ? "Refresh advice" : "Get advice"}
			</Button>
			<p className="mt-3 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
				Only totals are shared with the AI, never payee names or account
				details. Not financial advice.
			</p>
		</section>
	);
}
