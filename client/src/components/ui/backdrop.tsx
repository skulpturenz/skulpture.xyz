import React from "react";
import ReactDOM from "react-dom";

export const Backdrop = ({ children }: React.PropsWithChildren) => {
	const Backdrop = ({ children }: React.PropsWithChildren) => (
		<div className="z-50 fixed top-0 h-screen w-screen bg-black bg-opacity-90">
			{children}
		</div>
	);

	if (import.meta.env.SSR) {
		return <Backdrop>{children}</Backdrop>;
	}

	React.useEffect(() => {
		const body = document.getElementsByTagName("body").item(0);

		body.style.setProperty("overflow", "hidden");

		return () => {
			body.style.setProperty("overflow", "auto");
		};
	});

	return ReactDOM.createPortal(
		<Backdrop>{children}</Backdrop>,
		document.body,
	);
};
