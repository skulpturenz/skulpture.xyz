import React from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";

export interface BackdropProps
	extends React.HtmlHTMLAttributes<HTMLDivElement> {}

export const Backdrop = React.forwardRef<HTMLDivElement, BackdropProps>(
	({ children, ...rest }: BackdropProps, ref) => {
		const Backdrop = ({ className, ...rest }: BackdropProps) => (
			<div
				ref={ref}
				className={cn(
					"fixed top-0 z-50 h-screen w-screen bg-black bg-opacity-90",
					className,
				)}
				{...rest}
			/>
		);

		if (import.meta.env.SSR) {
			return <Backdrop {...rest}>{children}</Backdrop>;
		}

		React.useEffect(() => {
			const body = document.getElementsByTagName("body").item(0);

			body.style.setProperty("overflow", "hidden");

			return () => {
				body.style.setProperty("overflow", "auto");
			};
		});

		return ReactDOM.createPortal(
			<Backdrop {...rest}>{children}</Backdrop>,
			document.body,
		);
	},
);
