import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/lib/cn";

export const buttonVariants = cva(
	"relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				primary:
					"bg-violet-600 text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 dark:bg-violet-600 dark:shadow-none dark:hover:bg-violet-500",
				secondary:
					"border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
				ghost:
					"text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
				danger:
					"bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 dark:shadow-none",
				"danger-ghost":
					"text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
				link: "h-auto! px-0! text-violet-600 underline-offset-4 hover:underline active:scale-100 dark:text-violet-400",
			},
			size: {
				sm: "h-9 px-3 text-sm",
				md: "h-11 px-4 text-sm sm:h-10",
				lg: "h-12 px-5 text-base",
				icon: "size-11 sm:size-10",
				"icon-sm": "size-9",
			},
			fullWidth: { true: "w-full" },
		},
		defaultVariants: { variant: "primary", size: "md" },
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	icon?: React.ReactNode;
	isLoading?: boolean;
	ref?: React.Ref<HTMLButtonElement>;
}

/** Keeps its width while loading so layouts don't jump. */
export default function Button({
	className,
	variant,
	size,
	fullWidth,
	icon,
	isLoading = false,
	disabled,
	children,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cn(buttonVariants({ variant, size, fullWidth }), className)}
			disabled={disabled || isLoading}
			aria-busy={isLoading || undefined}
			{...props}
		>
			<span
				className={cn(
					"inline-flex items-center gap-2",
					isLoading && "invisible",
				)}
			>
				{icon}
				{children}
			</span>
			{isLoading && (
				<Loader2 className="absolute size-4 animate-spin" aria-hidden />
			)}
		</button>
	);
}
