import logo from "@/shared/assets/logo.svg";

/** Shown when the app was built without VITE_CONVEX_URL. */
export function SetupRequired() {
	return (
		<main className="flex min-h-dvh items-center justify-center p-6">
			<div className="card max-w-lg p-8">
				<img src={logo} alt="" className="mb-6 size-10" />
				<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
					Connect a Convex backend
				</h1>
				<p className="mt-2 text-slate-600 dark:text-slate-300">
					Prospera needs a Convex deployment to store data. Run this in the
					project folder, then restart the dev server:
				</p>
				<pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
					npx convex dev
				</pre>
				<p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
					That creates <code>.env.local</code> with <code>VITE_CONVEX_URL</code>
					. See the README for production setup.
				</p>
			</div>
		</main>
	);
}
