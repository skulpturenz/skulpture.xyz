import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom";

export interface BackdropProps
	extends React.HtmlHTMLAttributes<HTMLDivElement> {
	show?: boolean;
}

export const Backdrop = React.forwardRef<HTMLDivElement, BackdropProps>(
	({ children, show, ...rest }: BackdropProps, ref) => {
		const Backdrop = ({ className, ...rest }: BackdropProps) => (
			<AnimatePresence>
				{show && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.15 }}
						// TODO: there is a bug here, something is applying `will-change: transform`
						// which breaks animations
						// working in `v1.0.11`, not working in `v1.1.0`
						// bad commit:
						// - https://github.com/skulpturenz/skulpture.xyz/pull/140/commits/77c8fe72adea1640ce75e5dacb028c6cce752675
						style={{ willChange: "auto" }}>
						<div
							ref={ref}
							className={cn(
								"fixed top-0 z-50 h-screen w-screen bg-black bg-opacity-95 text-white",
								className,
							)}
							{...rest}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		);

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
			return <Backdrop {...rest}>{children}</Backdrop>;
		}

		return ReactDOM.createPortal(
			<Backdrop {...rest}>{children}</Backdrop>,
			document.body,
		);
	},
);
