import { motion, useSpring, useTransform, useVelocity } from "framer-motion";
import React from "react";

export interface CursorProps {}

export const Cursor = ({}: CursorProps) => {
	const DIMENSION = 24;
	const DIMENSION_TEXT = 48;

	const getDefaultMousePosition = () => {
		const clientX = sessionStorage.getItem("mouseMoveX");
		const clientY = sessionStorage.getItem("mouseMoveY");

		return {
			x: Number(clientX) || -100,
			y: Number(clientY) || -100,
		};
	};

	// https://stackoverflow.com/a/50302305
	const isMobile = () => {
		if (import.meta.env.SSR) {
			return false;
		}

		return window.matchMedia(
			"(pointer:none), (pointer:coarse), (hover:none), (hover:on-demand)",
		).matches;
	};

	const cursorXSpring = useSpring(getDefaultMousePosition().x, {
		damping: 37.5,
		stiffness: 1000,
	});
	const cursorYSpring = useSpring(getDefaultMousePosition().y, {
		damping: 37.5,
		stiffness: 1000,
	});
	const dimensionSpring = useSpring(DIMENSION, {
		damping: 37.5,
		stiffness: 1000,
	});

	const xSmooth = useSpring(cursorXSpring, { damping: 50, stiffness: 500 });
	const xVelocity = useVelocity(xSmooth);
	const scale = useTransform(xVelocity, [-1500, 0, 1500], [3, 1, 3], {
		clamp: false,
	});

	React.useLayoutEffect(() => {
		if (!isMobile()) {
			return;
		}

		const style = document.createElement("style");
		style.innerHTML = `
			* {
				cursor: auto;
			}
		`;

		const node: HTMLStyleElement = document.head.appendChild(style);

		return () => {
			node.remove();
		};
	}, []);

	React.useLayoutEffect(() => {
		if (isMobile()) {
			return;
		}

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
		if (isMobile()) {
			return;
		}

		const onMouseMove = (event: MouseEvent) => {
			const isEmphasised = [].some.call(
				[...(event.target as HTMLElement).childNodes, event.target],
				(element: Node) => {
					const hasText =
						element?.nodeType === Node.TEXT_NODE &&
						Boolean(element.textContent.trim());

					const isClickable = (element as HTMLElement)?.matches?.(
						"a,button",
					);

					const isImage = (element as HTMLElement)?.matches?.(
						"path,img,svg",
					);

					return hasText || isClickable || isImage;
				},
			);

			const newDimension = isEmphasised ? DIMENSION_TEXT : DIMENSION;

			cursorXSpring.set(event.clientX - 8);
			cursorYSpring.set(event.clientY - 8);

			dimensionSpring.set(newDimension);

			sessionStorage.setItem("mouseMoveX", `${event.clientX}`);
			sessionStorage.setItem("mouseMoveY", `${event.clientY}`);
		};

		window.addEventListener("mousemove", onMouseMove);

		return () => {
			window.removeEventListener("mousemove", onMouseMove);
		};
	}, []);

	if (isMobile()) {
		return null;
	}

	return (
		<>
			<motion.div
				className="cursor fixed left-0 top-0 rounded-full bg-white mix-blend-difference z-[999] pointer-events-none"
				style={{
					width: dimensionSpring,
					height: dimensionSpring,
					translateX: cursorXSpring,
					translateY: cursorYSpring,
					scale,
				}}
			/>
		</>
	);
};
