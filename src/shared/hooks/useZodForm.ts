import { useCallback, useMemo, useState } from "react";
import type { z } from "zod";

/**
 * Minimal form state driven by a Zod schema. Errors appear once a field has
 * been blurred or the form submitted, so users aren't scolded mid-typing.
 */
export function useZodForm<
	S extends z.ZodType<unknown, Record<string, unknown>>,
>(schema: S, initial: z.input<S>) {
	type Values = z.input<S>;
	type Key = keyof Values & string;

	const [values, setValues] = useState<Values>(initial);
	const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
	const [submitted, setSubmitted] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const result = useMemo(() => schema.safeParse(values), [schema, values]);

	const allErrors = useMemo(() => {
		const errors: Partial<Record<Key, string>> = {};
		if (!result.success) {
			for (const issue of result.error.issues) {
				const key = issue.path[0] as Key | undefined;
				if (key !== undefined && !errors[key]) errors[key] = issue.message;
			}
		}
		return errors;
	}, [result]);

	const errors = useMemo(() => {
		const visible: Partial<Record<Key, string>> = {};
		for (const key of Object.keys(allErrors) as Key[]) {
			if (submitted || touched[key]) visible[key] = allErrors[key];
		}
		return visible;
	}, [allErrors, submitted, touched]);

	const set = useCallback(<K extends Key>(key: K, value: Values[K]) => {
		setValues((prev) => ({ ...prev, [key]: value }));
	}, []);

	const blur = useCallback((key: Key) => {
		setTouched((prev) => ({ ...prev, [key]: true }));
	}, []);

	const reset = useCallback((next: Values) => {
		setValues(next);
		setTouched({});
		setSubmitted(false);
		setSubmitting(false);
	}, []);

	/** Props for a text input bound to `key`. */
	const field = (key: Key) => ({
		name: key,
		value: String(values[key] ?? ""),
		onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			set(key, e.target.value as Values[typeof key]),
		onBlur: () => blur(key),
		error: errors[key],
	});

	const submit = async (
		onValid: (data: z.output<S>) => Promise<unknown> | unknown,
	) => {
		setSubmitted(true);
		if (!result.success || submitting) return false;
		setSubmitting(true);
		try {
			await onValid(result.data);
			return true;
		} catch {
			return false;
		} finally {
			setSubmitting(false);
		}
	};

	return {
		values,
		set,
		blur,
		errors,
		field,
		reset,
		submit,
		submitting,
		isValid: result.success,
	};
}
