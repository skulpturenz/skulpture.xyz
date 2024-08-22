import { cn } from "@/lib/utils";
import {
	motion,
	type Transition,
	type Variant,
	type Variants,
} from "framer-motion";

type LoaderVariants = Record<"initial" | "animate", Variant>;

export const Loader = ({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof motion.div>) => {
	const variants: LoaderVariants = {
		initial: {
			transition: {
				staggerChildren: 0.25,
			},
		},
		animate: {
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
			initial="initial"
			animate="animate">
			{children}
		</motion.div>
	);
};

export interface DotsProps extends React.HTMLAttributes<HTMLDivElement> {
	variants?: LoaderVariants;
}

const DEFAULT_VARIANTS: Variants = {
	initial: {
		y: "0%",
	},
	animate: {
		y: ["-50%", "50%"],
	},
};

export const Dot = ({
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
		<motion.span
			{...props}
			className={cn(
				"h-[0.6em] aspect-square bg-current",
				className,
				"rounded-full",
			)}
			variants={variants}
			transition={transition}
		/>
	);
};
