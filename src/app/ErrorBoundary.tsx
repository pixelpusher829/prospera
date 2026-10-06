import { RefreshCw, TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "@/shared/components/Button";

type Props = { children: ReactNode; inline?: boolean };
type State = { error: Error | null };

/** Catches render errors so one broken widget can't blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Unhandled UI error", error, info.componentStack);
	}

	render() {
		if (!this.state.error) return this.props.children;
		return (
			<div
				role="alert"
				className={
					this.props.inline
						? "page"
						: "flex min-h-dvh items-center justify-center p-6"
				}
			>
				<div className="mx-auto max-w-md text-center">
					<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
						<TriangleAlert size={24} />
					</div>
					<h1 className="text-xl font-semibold text-slate-900 dark:text-white">
						Something went wrong
					</h1>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
						This part of the app hit an unexpected error. Your data is safe;
						reloading usually fixes it.
					</p>
					<Button
						className="mt-6"
						icon={<RefreshCw size={16} />}
						onClick={() => window.location.reload()}
					>
						Reload
					</Button>
				</div>
			</div>
		);
	}
}
