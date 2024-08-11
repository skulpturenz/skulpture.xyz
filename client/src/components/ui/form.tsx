import { cn } from "@/lib/utils";
import React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
	flexDirection?: "row" | "column";
	asChild?: boolean;
}

export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	flexDirection?: "row" | "column";
	asChild?: boolean;
}

export const Form = ({
	className,
	flexDirection,
	asChild,
	...rest
}: FormProps) => {
	const classNames = cn(
		"flex gap-6",
		flexDirection === "row" ? "flex-row items-center" : "flex-col",
	);

	const child = asChild
		? (React.Children.only(rest.children) as React.ReactElement<
				Record<string, any>
			>)
		: null;

	if (child && React.isValidElement(child)) {
		const cloned = React.cloneElement(child, {
			className: cn(classNames, child.props.className),
		});

		return cloned;
	}

	return <form {...rest} className={cn(classNames, className)} />;
};

export const FormGroup = ({
	className,
	asChild,
	flexDirection,
	...rest
}: FormGroupProps) => {
	const classNames = cn(
		"flex gap-2",
		flexDirection === "row" ? "flex-row items-center" : "flex-col",
	);

	const child = asChild
		? (React.Children.only(rest.children) as React.ReactElement<
				Record<string, any>
			>)
		: null;

	if (child && React.isValidElement(child)) {
		const cloned = React.cloneElement(child, {
			className: cn(classNames, child.props.className),
		});

		return cloned;
	}

	return <div {...rest} className={cn(classNames, className)} />;
};
