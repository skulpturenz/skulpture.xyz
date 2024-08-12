import * as React from "react";

import { cn } from "@/lib/utils";
import { CircleAlert } from "lucide-react";

export interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	isError?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, isError, ...props }, ref) => {
		return (
			<div className="relative">
				<textarea
					className={cn(
						"flex min-h-[60px] w-full border-b-4 border-input bg-transparent px-3 py-2 transition-colors placeholder:text-muted-foreground",
						"rounded-none focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
						"disabled:cursor-not-allowed disabled:opacity-50",
						isError
							? "border-red-500 focus-visible:ring-red-500"
							: "",
						className,
					)}
					ref={ref}
					{...props}
				/>
				{isError && (
					<CircleAlert className="absolute right-2 top-[15%] h-5 w-auto text-red-500" />
				)}
			</div>
		);
	},
);
Textarea.displayName = "Textarea";

export { Textarea };
