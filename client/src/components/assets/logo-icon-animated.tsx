import { motion, type Variants } from "framer-motion";
import type React from "react";

const draw: Variants = {
	hidden: { pathLength: 0, fillOpacity: 0, strokeWidth: 0, opacity: 0 },
	visible: ({ duration, delay }) => {
		const calculateDuration = (scale: number) => 1 + scale * 0.5;

		return {
			pathLength: 1,
			fillOpacity: 1,
			opacity: 1,
			strokeWidth: 2,
			transition: {
				strokeWidth: {
					delay,
				},
				pathLength: {
					delay,
					type: "spring",
					duration: calculateDuration(duration),
					bounce: 0,
				},
				fillOpacity: {
					type: "spring",
					delay: delay + calculateDuration(2),
					duration: 2,
				},
			},
		};
	},
};

export interface LogoIconAnimatedProps
	extends React.ComponentProps<typeof motion.svg> {
	delay?: number;
	duration?: number;
}

export const LogoIconAnimated: React.FC<LogoIconAnimatedProps> = ({
	delay = 0,
	duration = 2,
	...rest
}) => (
	<motion.svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 30.3 30.3"
		{...rest}
		initial="hidden"
		whileInView="visible"
		viewport={{ once: true }}>
		<motion.g>
			<motion.polygon
				points="0 21.52 0 30.3 25.37 30.3 30.3 25.37 30.3 12.95 21.73 21.52 0 21.52"
				fill="currentColor"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				variants={draw}
				custom={{ duration, delay }}
			/>
			<motion.polygon
				points="4.93 0 0 4.93 0 17.36 8.57 8.78 30.3 8.78 30.3 0 4.93 0"
				fill="currentColor"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				variants={draw}
				custom={{ duration, delay }}
			/>
		</motion.g>
	</motion.svg>
);
