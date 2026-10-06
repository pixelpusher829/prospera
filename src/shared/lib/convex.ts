import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";

export const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

const convexQueryClient = convex ? new ConvexQueryClient(convex) : null;

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: convexQueryClient
			? {
					queryKeyHashFn: convexQueryClient.hashFn(),
					queryFn: convexQueryClient.queryFn(),
				}
			: {},
	},
});

convexQueryClient?.connect(queryClient);
