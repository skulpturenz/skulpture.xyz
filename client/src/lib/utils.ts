import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
	return twMerge(clsx(inputs));
};

export const plural = (
	rules: Intl.PluralRules,
	variants: Record<string, Record<string, string>>,
	count: number,
) => {
	const { locale } = rules.resolvedOptions();

	return variants[locale]?.[rules.select(count)] ?? "";
};
