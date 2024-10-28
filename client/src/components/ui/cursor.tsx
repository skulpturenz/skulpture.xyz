import { motion, useSpring, type SpringOptions } from "framer-motion";
import React from "react";

export interface CursorProps {}

export const Cursor = ({}: CursorProps) => {
	const springConfig: SpringOptions = {
		damping: 37.5,
		stiffness: 1000,
	};

	const getDefaultMousePosition = () => {
		const clientX = sessionStorage.getItem("mouseMoveX");
		const clientY = sessionStorage.getItem("mouseMoveY");

		return {
			x: Number(clientX) || -100,
			y: Number(clientY) || -100,
		};
	};

	const cursorXSpring = useSpring(getDefaultMousePosition().x, springConfig);
	const cursorYSpring = useSpring(getDefaultMousePosition().y, springConfig);

	const widthSpring = useSpring(16, springConfig);
	const heightSpring = useSpring(16, springConfig);

	React.useLayoutEffect(() => {
		const style = document.createElement("style");
		style.innerHTML = `
			* {
				cursor: none !important;
			}
		`;

		const node: HTMLStyleElement = document.head.appendChild(style);

		return () => {
			node.remove();
		};
	}, []);

	React.useEffect(() => {
		const onMouseMove = (event: MouseEvent) => {
			const hasText = [].reduce.call(
				(event.target as HTMLElement).childNodes,
				(acc: string, element: HTMLElement) => {
					if (element.nodeType === Node.TEXT_NODE) {
						return element.textContent.trim();
					}

					return acc;
				},
				"",
			);

			const width = hasText ? 48 : 16;
			const height = hasText ? 48 : 16;

			cursorXSpring.set(event.clientX - 8);
			cursorYSpring.set(event.clientY - 8);

			widthSpring.set(width);
			heightSpring.set(height);

			sessionStorage.setItem("mouseMoveX", `${event.clientX}`);
			sessionStorage.setItem("mouseMoveY", `${event.clientY}`);
		};

		window.addEventListener("mousemove", onMouseMove);

		return () => {
			window.removeEventListener("mousemove", onMouseMove);
		};
	}, []);

	return (
		<>
			<motion.div
				className="cursor fixed left-0 top-0 rounded-full bg-white mix-blend-difference z-[999] pointer-events-none"
				style={{
					width: widthSpring,
					height: heightSpring,
					translateX: cursorXSpring,
					translateY: cursorYSpring,
				}}
			/>
		</>
	);
};
