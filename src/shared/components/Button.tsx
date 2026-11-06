import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type React from "react";
import { cn } from "@/shared/lib/cn";

export const buttonVariants = cva(
	"relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] select-none active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				primary:
					"bg-zinc-900 text-white shadow-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
				secondary:
					"border border-zinc-200 bg-white text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white",
				ghost:
					"text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
				danger:
					"bg-red-600 text-white shadow-xs hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500",
				"danger-ghost":
					"text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
				link: "h-auto! px-0! text-accent-700 underline-offset-4 hover:underline active:scale-100 dark:text-accent-400",
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
