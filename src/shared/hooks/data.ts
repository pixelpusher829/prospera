import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import {
	type QueryClient,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { errorMessage } from "../lib/errors";
import { formatMoney, type MoneyOptions } from "../lib/money";

export type Transaction = Doc<"transactions">;
export type Account = Doc<"accounts">;
export type Goal = Doc<"goals">;
export type BudgetCategory = Doc<"budgetCategories">;
export type Client = Doc<"clients">;

// ---- Queries ----------------------------------------------------------------
// Convex pushes new results into the TanStack cache, so these stay live
// without refetching or invalidation.

export const useViewer = () => useQuery(convexQuery(api.users.viewer, {}));
export const useTransactions = () =>
	useQuery(convexQuery(api.transactions.list, {}));
export const useAccounts = () => useQuery(convexQuery(api.accounts.list, {}));
export const useGoals = () => useQuery(convexQuery(api.goals.list, {}));
export const useBudgets = () => useQuery(convexQuery(api.budgets.list, {}));
export const useClients = () => useQuery(convexQuery(api.clients.list, {}));
export const useLatestInsight = () => useQuery(convexQuery(api.ai.latest, {}));

/** Formats money in the user's chosen currency. */
export function useMoney() {
	const { data: viewer } = useViewer();
	const currency = viewer?.settings.currency ?? "USD";
	const format = useCallback(
		(value: number, options?: MoneyOptions) =>
			formatMoney(value, currency, options),
		[currency],
	);
	return { currency, format };
}

export function useAccountNames() {
	const { data: accounts } = useAccounts();
	return useMemo(
		() => new Map((accounts ?? []).map((a) => [a._id as string, a.name])),
		[accounts],
	);
}

// ---- Mutations --------------------------------------------------------------

type ListQuery = FunctionReference<"query", "public", Record<string, never>>;

/**
 * Applies `update` to a cached list query right away and returns a function
 * that restores the previous value if the server rejects the change.
 */
export function optimisticList<Q extends ListQuery>(
	queryClient: QueryClient,
	query: Q,
	update: (current: FunctionReturnType<Q>) => FunctionReturnType<Q>,
) {
	const { queryKey } = convexQuery(query, {});
	const previous = queryClient.getQueryData<FunctionReturnType<Q>>(queryKey);
	if (previous !== undefined) {
		queryClient.setQueryData(queryKey, update(previous));
	}
	return () => queryClient.setQueryData(queryKey, previous);
}

type MutationOptions<M extends FunctionReference<"mutation" | "action">> = {
	/** Toast shown after the server confirms the change. */
	success?: string | ((args: FunctionArgs<M>) => string);
	/** Update the cache before the server answers; return a rollback. */
	optimistic?: (queryClient: QueryClient, args: FunctionArgs<M>) => () => void;
};

/**
 * A TanStack mutation around a Convex mutation, with error toasts and
 * optional optimistic updates that roll back on failure.
 */
export function useAppMutation<M extends FunctionReference<"mutation">>(
	mutation: M,
	options: MutationOptions<M> = {},
) {
	const queryClient = useQueryClient();
	const mutationFn = useConvexMutation(mutation);
	return useMutation<
		FunctionReturnType<M>,
		unknown,
		FunctionArgs<M>,
		{ rollback?: () => void }
	>({
		mutationFn: (args) => mutationFn(args),
		onMutate: (args) => ({
			rollback: options.optimistic?.(queryClient, args),
		}),
		onError: (error, _args, context) => {
			context?.rollback?.();
			toast.error(errorMessage(error));
		},
		onSuccess: (_data, args) => {
			const message =
				typeof options.success === "function"
					? options.success(args)
					: options.success;
			if (message) toast.success(message);
		},
	});
}

/** Removes document fields so a deleted doc can be re-created for undo. */
export function stripSystemFields<
	T extends { _id: unknown; _creationTime: number; userId: unknown },
>({ _id, _creationTime, userId, ...rest }: T) {
	return rest;
}
