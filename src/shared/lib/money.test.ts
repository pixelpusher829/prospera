import { describe, expect, it } from "vitest";
import { formatMoney, formatPercent, parseMoney } from "./money";

describe("formatMoney", () => {
	const usd = (n: number, o = {}) =>
		formatMoney(n, "USD", { locale: "en-US", ...o });

	it("formats with cents and a narrow symbol", () => {
		expect(usd(1234.5)).toBe("$1,234.50");
		expect(formatMoney(10, "CAD", { locale: "en-US" })).toBe("$10.00");
	});
	it("never shows negative zero", () => {
		expect(usd(-0.001)).toBe("$0.00");
		expect(usd(-0)).toBe("$0.00");
	});
	it("supports signs, whole numbers and compact form", () => {
		expect(usd(5, { sign: true })).toBe("+$5.00");
		expect(usd(-5, { sign: true })).toBe("-$5.00");
		expect(usd(0, { sign: true })).toBe("$0.00");
		expect(usd(1999.99, { whole: true })).toBe("$2,000");
		expect(usd(12345, { compact: true })).toBe("$12.3K");
	});
});

describe("parseMoney", () => {
	it.each([
		["12", 12],
		["$1,234.56", 1234.56],
		["-12.50", -12.5],
		["$-12.50", -12.5],
		["(40.00)", -40],
		["40.00-", -40],
		["  7 ", 7],
	])("parses %s", (input, expected) => {
		expect(parseMoney(input)).toBe(expected);
	});

	it.each(["", "abc", "1.2.3", "$"])("rejects %j", (input) => {
		expect(parseMoney(input)).toBeNull();
	});
});

describe("formatPercent", () => {
	it("adds a plus for growth and a dash for unknown", () => {
		expect(formatPercent(12.34)).toBe("+12.3%");
		expect(formatPercent(-4)).toBe("-4%");
		expect(formatPercent(null)).toBe("—");
	});
});
