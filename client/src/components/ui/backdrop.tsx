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
						transition={{ duration: 0.15 }}>
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
		});

		if (import.meta.env.SSR) {
			return <Backdrop {...rest}>{children}</Backdrop>;
		}

		return ReactDOM.createPortal(
			<Backdrop {...rest}>{children}</Backdrop>,
			document.body,
		);
	},
);
