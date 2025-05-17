import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom";

export interface BackdropProps
	extends React.HtmlHTMLAttributes<HTMLDivElement> {
	show?: boolean;
}

export const Backdrop = React.forwardRef<HTMLDivElement, BackdropProps>(
	function Backdrop({ children, show, ...rest }: BackdropProps, ref) {
		React.useEffect(() => {
			if (!show) {
				return;
			}

			const body = document.getElementsByTagName("body").item(0);

			body.style.setProperty("overflow", "hidden");

			return () => {
				body.style.setProperty("overflow", "auto");
			};
		}, [show]);

		if (import.meta.env.SSR) {
			return (
				<AnimatedBackdrop {...rest} show={show} ref={ref}>
					{children}
				</AnimatedBackdrop>
			);
		}

		return ReactDOM.createPortal(
			<AnimatedBackdrop {...rest} show={show} ref={ref}>
				{children}
			</AnimatedBackdrop>,
			document.body,
		);
	},
);

const AnimatedBackdrop = React.forwardRef<HTMLDivElement, BackdropProps>(
	function AnimatedBackdrop({ className, show, ...rest }, ref) {
		return (
			<AnimatePresence>
				{show && (
					<div
						ref={ref}
						className={cn(
							"fixed top-0 z-50 h-screen w-screen bg-black/95 text-white",
							className,
						)}
						{...rest}
					/>
				)}
			</AnimatePresence>
		);
	},
);
