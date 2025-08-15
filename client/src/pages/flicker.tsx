import { AnimatePresence, motion } from "framer-motion";
import React from "react";

export const Flicker = ({ content = [] }) => {
	const [idx, setIdx] = React.useState(0);

	React.useEffect(() => {
		const INTERVAL_MS = 2000;

		const interval = setInterval(() => {
			setIdx(idx => (idx + 1) % (content.length - 1));
		}, INTERVAL_MS);

		return () => clearInterval(interval);
	}, []);

	return (
		<AnimatePresence>
			<motion.div
				key={idx}
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: -20, opacity: 0 }}
				transition={{ ease: "easeInOut" }}
				style={{ position: "absolute" }}>
				{content[idx]}
			</motion.div>
		</AnimatePresence>
	);
};
