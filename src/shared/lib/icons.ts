import {
	BookOpen,
	Car,
	Coffee,
	DollarSign,
	Dumbbell,
	Gift,
	GraduationCap,
	HeartPulse,
	Home,
	Laptop,
	type LucideIcon,
	PawPrint,
	PiggyBank,
	Plane,
	ShoppingBag,
	ShoppingCart,
	Target,
	Tv,
	Umbrella,
	Zap,
} from "lucide-react";

export const BUDGET_ICONS: Record<string, LucideIcon> = {
	home: Home,
	cart: ShoppingCart,
	coffee: Coffee,
	car: Car,
	zap: Zap,
	bag: ShoppingBag,
	heart: HeartPulse,
	tv: Tv,
	plane: Plane,
	gift: Gift,
	book: BookOpen,
	paw: PawPrint,
	gym: Dumbbell,
	dollar: DollarSign,
};

export const GOAL_ICONS: Record<string, LucideIcon> = {
	target: Target,
	piggy: PiggyBank,
	umbrella: Umbrella,
	home: Home,
	car: Car,
	plane: Plane,
	laptop: Laptop,
	school: GraduationCap,
	gift: Gift,
	heart: HeartPulse,
};

export const iconFor = (
	set: Record<string, LucideIcon>,
	key: string,
	fallback: LucideIcon = DollarSign,
) => set[key] ?? fallback;

/** Picks a sensible budget icon from a category name. */
export function guessBudgetIcon(name: string): string {
	const n = name.toLowerCase();
	if (/rent|mortgage|hous|home/.test(n)) return "home";
	if (/grocer|food|supermarket/.test(n)) return "cart";
	if (/dining|restaurant|cafe|coffee|eat/.test(n)) return "coffee";
	if (/car|transport|gas|fuel|uber|transit/.test(n)) return "car";
	if (/utilit|electric|power|internet|phone|bill/.test(n)) return "zap";
	if (/shop|cloth|amazon/.test(n)) return "bag";
	if (/health|medical|pharm|doctor|dental/.test(n)) return "heart";
	if (/subscri|stream|netflix|tv|entertain/.test(n)) return "tv";
	if (/travel|flight|hotel|vacation/.test(n)) return "plane";
	if (/gift|donat|charity/.test(n)) return "gift";
	if (/educa|school|course|book/.test(n)) return "book";
	if (/pet|vet/.test(n)) return "paw";
	if (/gym|fitness|sport/.test(n)) return "gym";
	return "dollar";
}
