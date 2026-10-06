import { useMemo } from "react";
import { buildAlerts } from "@/shared/lib/finance";
import { useBudgets, useGoals, useMoney, useTransactions } from "./data";

/** Budget, goal and pending-transaction alerts derived from live data. */
export function useAlerts() {
	const { data: budgets } = useBudgets();
	const { data: goals } = useGoals();
	const { data: transactions } = useTransactions();
	const { format } = useMoney();

	return useMemo(() => {
		if (!budgets || !goals || !transactions) return undefined;
		return buildAlerts({
			budgets,
			goals,
			txs: transactions,
			format: (n) => format(n),
		});
	}, [budgets, goals, transactions, format]);
}
