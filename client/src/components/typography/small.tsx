import { cn } from "@/lib/utils";
import React from "react";

export type TypographyProps<T extends keyof React.JSX.IntrinsicElements> =
	React.ComponentPropsWithRef<T>;

export const Small = React.forwardRef<
	React.ElementRef<"small">,
	TypographyProps<"small">
>(({ className, ...props }, ref) => (
	<small
		ref={ref}
		className={cn("text-sm font-medium leading-none", className)}
		{...props}
	/>
));
