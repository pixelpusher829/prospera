// Shared between the Convex backend and the React app.

export const CURRENCIES = [
	{ code: "USD", label: "US Dollar" },
	{ code: "EUR", label: "Euro" },
	{ code: "GBP", label: "British Pound" },
	{ code: "CAD", label: "Canadian Dollar" },
	{ code: "AUD", label: "Australian Dollar" },
	{ code: "NZD", label: "New Zealand Dollar" },
	{ code: "JPY", label: "Japanese Yen" },
	{ code: "INR", label: "Indian Rupee" },
	{ code: "CHF", label: "Swiss Franc" },
	{ code: "SEK", label: "Swedish Krona" },
	{ code: "MXN", label: "Mexican Peso" },
	{ code: "BRL", label: "Brazilian Real" },
] as const;

export const DEFAULT_SETTINGS = {
	currency: "USD",
	onboardingDismissed: false,
};
