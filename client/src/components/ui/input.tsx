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
	isFileValid?: (file: File) => boolean;
}

const resources = {
	inputFile: {
		placeholder: ["Drag & drop or", "browse"],
		instruction: "Drop your files here",
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
			isFileValid,
			...props
		},
		ref,
	) => {
		const inputFileRef = React.useRef<HTMLInputElement | null>(null);
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
		> = event => {
			event.stopPropagation();

			inputFileRef.current?.click();
		};

		const onDragEnter = (
			event: DragEvent | React.DragEvent<HTMLDivElement>,
		) => {
			if (!event.dataTransfer.items.length) {
				return;
			}

			setShowBackdrop(true);
		};
		const onDragOver = (
			event: DragEvent | React.DragEvent<HTMLDivElement>,
		) => {
			event.preventDefault();
		};
		const onDragLeave = () => {
			setShowBackdrop(false);
		};
		const onDrop = (event: DragEvent | React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();

			const dataTransfer = new DataTransfer();

			Object.values(event.dataTransfer.files).forEach(file => {
				if (isFileValid && !isFileValid(file)) {
					return;
				}

				dataTransfer.items.add(file);
			});
			inputFileRef.current.files = dataTransfer.files;

			// TODO: if files invalid show error and don't hide backdrop
			// backdrop text resets when dragging again or after a timeout
			// allow cancel
			// TODO: allow checking total size of all files

			setShowBackdrop(false);
		};

		React.useEffect(() => {
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
		}, []);

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
					className="flex cursor-pointer flex-col items-center justify-center gap-5 border-4 border-dashed border-input p-5 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
					<div>
						<button
							className="inline-flex flex-col items-center justify-center text-muted-foreground"
							onClick={onClickBrowse}
							type="button">
							<Cloud className="mb-2 h-6 w-auto text-primary" />
							{resources.inputFile.placeholder.at(0)}&nbsp;
							<span className="text-primary">
								{resources.inputFile.placeholder.at(1)}
							</span>
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
							"flex flex-col items-center justify-center",
						)}>
						<Cloud className="h-24 w-auto text-primary" />
						<span className="font-medium">
							{resources.inputFile.instruction}
						</span>
					</Backdrop>
				</Transition>
				{children}
			</>
		);
	},
);
InputFile.displayName = "InputFile";

export { Input, InputFile };
