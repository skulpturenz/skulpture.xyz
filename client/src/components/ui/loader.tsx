import { cn } from "@/lib/utils";
import { motion, type Transition, type Variants } from "framer-motion";

export const Loader = ({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof motion.div>) => {
	const variants: Variants = {
		start: {
			transition: {
				staggerChildren: 0.25,
			},
		},
		end: {
			transition: {
				staggerChildren: 0.25,
			},
		},
	};

	return (
		<motion.div
			{...props}
			className={className}
			variants={variants}
			initial="start"
			animate="end">
			{children}
		</motion.div>
	);
};

export interface DotsProps extends React.HTMLAttributes<HTMLDivElement> {
	variants?: Variants;
}

const DEFAULT_VARIANTS: Variants = {
	start: {
		y: "-75%",
		opacity: 0.8,
	},
	end: {
		y: "25%",
		opacity: 1,
	},
};

export const Dots = ({
	className,
	variants = DEFAULT_VARIANTS,
	...props
}: React.ComponentPropsWithoutRef<typeof motion.span>) => {
	const transition: Transition = {
		duration: 0.5,
		repeat: Infinity,
		repeatType: "reverse",
		ease: "easeInOut",
	};

	return (
		<>
			<motion.span
				{...props}
				className={cn("h-2 w-2 bg-current", className, "rounded-full")}
				variants={variants}
				transition={transition}
			/>
			<motion.span
				{...props}
				className={cn("h-2 w-2 bg-current", className, "rounded-full")}
				variants={variants}
				transition={transition}
			/>
			<motion.span
				{...props}
				className={cn("h-2 w-2 bg-current", className, "rounded-full")}
				variants={variants}
				transition={transition}
			/>
		</>
	);
};
