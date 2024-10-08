import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default:
					"font-semibold bg-primary text-primary-foreground shadow hover:bg-primary/90",
				destructive:
					"font-semibold bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
				outline:
					"font-semibold border-2 border-primary bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
				secondary:
					"font-semibold bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
				ghost: "font-semibold hover:bg-accent hover:text-accent-foreground",
				link: "text-foreground font-semibold underline-offset-4 hover:underline",
			},
			size: {
				default: "rounded-full h-9 px-5 py-5",
				sm: "h-8 rounded-full px-3 text-xs",
				lg: "h-10 rounded-full px-8",
				icon: "h-9 w-9",
				inherit: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

const Link = React.forwardRef<
	HTMLButtonElement,
	ButtonProps & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, variant, size, asChild = true, ...props }, ref) => {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			ref={ref}
			{...props}>
			<a {...props} />
		</Comp>
	);
});
Link.displayName = "Link";

export { Button, buttonVariants, Link };
