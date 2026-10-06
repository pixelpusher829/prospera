const formatters = new Map<string, Intl.NumberFormat>();

function formatter(options: Intl.NumberFormatOptions, locale?: string) {
	const key = `${locale ?? ""}|${JSON.stringify(options)}`;
	let f = formatters.get(key);
	if (!f) {
		f = new Intl.NumberFormat(locale, options);
		formatters.set(key, f);
	}
	return f;
}

export type MoneyOptions = {
	/** Show a + for positive values. */
	sign?: boolean;
	/** 12.3K style for chart axes and tight spaces. */
	compact?: boolean;
	/** Drop the cents. */
	whole?: boolean;
	locale?: string;
};

/** Formats an amount in `currency`, never showing `-0.00`. */
export function formatMoney(
	value: number,
	currency = "USD",
	{ sign = false, compact = false, whole = false, locale }: MoneyOptions = {},
): string {
	const rounded = Math.round(value * 100) / 100 || 0;
	return formatter(
		{
			style: "currency",
			currencyDisplay: "narrowSymbol",
			currency,
			signDisplay: sign ? "exceptZero" : "auto",
			notation: compact ? "compact" : "standard",
			...(compact
				? { maximumFractionDigits: 1 }
				: whole
					? { maximumFractionDigits: 0, minimumFractionDigits: 0 }
					: {}),
		},
		locale,
	).format(rounded);
}

export function currencySymbol(currency = "USD", locale?: string): string {
	return (
		formatter(
			{ style: "currency", currency, currencyDisplay: "narrowSymbol" },
			locale,
		)
			.formatToParts(0)
			.find((p) => p.type === "currency")?.value ?? currency
	);
}

export function formatPercent(value: number | null, { sign = true } = {}) {
	if (value === null || !Number.isFinite(value)) return "—";
	const rounded = Math.round(value * 10) / 10 || 0;
	return `${sign && rounded > 0 ? "+" : ""}${rounded}%`;
}

/**
 * Parses user-typed money: "$1,234.50", "(12.00)" and "-12" all work.
 * Returns null for anything that isn't a number.
 */
export function parseMoney(input: string): number | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	const negative =
		/^\(.*\)$/.test(trimmed) || /^[^\d]*-/.test(trimmed) || /-$/.test(trimmed);
	const digits = trimmed.replace(/[^\d.]/g, "");
	if (!digits || (digits.match(/\./g)?.length ?? 0) > 1) return null;
	const value = Number(digits);
	if (!Number.isFinite(value)) return null;
	return negative ? -value : value;
}
