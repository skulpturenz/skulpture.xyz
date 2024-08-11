import * as React from "react";
import { cn } from "@/lib/utils";
import { CircleAlert } from "lucide-react";
import { Cloud } from "@/components/assets";
import { Backdrop } from "./backdrop";
import { Transition } from "@headlessui/react";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	isError?: boolean;
}

export interface InputFileProps extends Omit<InputProps, "value" | "onChange"> {
	value?: File[];
	onChange?: (files: File[]) => void;
}

const resources = {
	inputFile: {
		placeholder: ["Drag & drop or", "browse"],
	},
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, isError, ...props }, ref) => {
		return (
			<div className="relative">
				<input
					type={type}
					className={cn(
						"flex h-9 w-full border-b-4 border-input bg-transparent px-3 py-1 transition-colors file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
						isError
							? "border-red-500 focus-visible:ring-red-500"
							: "",
						className,
					)}
					ref={ref}
					{...props}
				/>
				{isError && (
					<CircleAlert className="absolute right-2 top-[10%] h-5 w-auto text-red-500" />
				)}
			</div>
		);
	},
);
Input.displayName = "Input";

const InputFile = React.forwardRef<HTMLInputElement, InputFileProps>(
	(
		{
			className,
			type,
			isError,
			value: controlledValue,
			onChange: controlledSetFiles,
			children,
			...props
		},
		ref,
	) => {
		const inputFileRef = React.useRef<HTMLInputElement | null>(null);
		const dragAndDropRef = React.useRef<HTMLDivElement | null>(null);
		const backdropRef = React.useRef<HTMLDivElement | null>(null);

		const [, uncontrolledSetFiles] = React.useState<File[]>();
		const setValue = controlledSetFiles ?? uncontrolledSetFiles;

		const [showBackdrop, setShowBackdrop] = React.useState(false);

		const setInputRef = (instance: HTMLInputElement | null) => {
			inputFileRef.current = instance;

			if (typeof ref === "function") {
				ref(instance);
			} else if (ref) {
				ref.current = instance;
			}
		};

		const onChange: React.ChangeEventHandler<HTMLInputElement> = event => {
			if (!event.target.files || !event.target.files.length) {
				return;
			}

			setValue([...event.target.files]);
		};

		const onClickBrowse: React.MouseEventHandler<
			HTMLButtonElement | HTMLDivElement
		> = () => inputFileRef.current?.click();

		React.useEffect(() => {
			const onDragEnter = (event: DragEvent) => {
				setShowBackdrop(true);
			};
			const onDragOver = (event: DragEvent) => event.preventDefault();
			const onDragLeave = (event: DragEvent) => {};
			const onDrop = (event: DragEvent) => {
				setShowBackdrop(false);
			};

			window.addEventListener("dragenter", onDragEnter);
			window.addEventListener("dragover", onDragOver);
			backdropRef.current?.addEventListener("dragleave", onDragLeave);
			backdropRef.current?.addEventListener("drop", onDrop);

			return () => {
				window.removeEventListener("dragenter", onDragEnter);
				window.removeEventListener("dragover", onDragOver);
				backdropRef.current?.removeEventListener(
					"dragleave",
					onDragLeave,
				);
				backdropRef.current?.removeEventListener("drop", onDrop);
			};
		}, [showBackdrop]);

		const onDragEnter: React.DragEventHandler<HTMLDivElement> = event => {
			setShowBackdrop(true);
		};
		const onDragOver: React.DragEventHandler<HTMLDivElement> = event =>
			event.preventDefault();
		const onDragLeave: React.DragEventHandler<HTMLDivElement> = event => {
			setShowBackdrop(false);
		};
		const onDrop: React.DragEventHandler<HTMLDivElement> = event => {
			setShowBackdrop(false);
		};

		return (
			<>
				<input
					ref={setInputRef}
					type="file"
					name={props.name}
					multiple
					className="hidden"
					accept={props.accept}
					onChange={onChange}
				/>
				<div
					tabIndex={0}
					onClick={onClickBrowse}
					onDragOver={onDragOver}
					onDragEnter={onDragEnter}
					draggable
					ref={dragAndDropRef}
					className="flex cursor-pointer flex-col items-center justify-center gap-5 border-4 border-dashed border-input p-5 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
					<div>
						<button
							className="inline-flex flex-col items-center justify-center text-muted-foreground"
							onClick={onClickBrowse}
							type="button">
							<Cloud className="mb-2 h-6 w-auto text-primary" />
							{resources.inputFile.placeholder.at(0)}&nbsp;
							<a className="text-primary">
								{resources.inputFile.placeholder.at(1)}
							</a>
						</button>
					</div>
				</div>
				<Transition show={showBackdrop} appear>
					<Backdrop
						ref={backdropRef}
						onDrop={onDrop}
						onDragLeave={onDragLeave}
						className={cn(
							"transition-opacity data-[closed]:opacity-0",
							"data-[enter]:opacity-100",
						)}>
						{/* TODO */}
						HELLO WORLD!!
					</Backdrop>
				</Transition>
				{children}
			</>
		);
	},
);
InputFile.displayName = "InputFile";

export { Input, InputFile };
