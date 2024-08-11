import * as React from "react";
import { cn, plural } from "@/lib/utils";
import { CircleAlert, Files } from "lucide-react";
import { Cloud } from "@/components/assets";
import { Backdrop } from "./backdrop";
import { constants } from "@/components/constants";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	isError?: boolean;
}

export interface InputFileProps extends Omit<InputProps, "value" | "onChange"> {
	onChange?: (files: File[]) => void;
	onInvalidSelection?: (files: File[], totalSelectedFileSize: number) => void;
	isFileValid?: (file: File, totalSelectedFileSize: number) => boolean;
}

const resources = {
	inputFile: {
		placeholder: ["Drag & drop or", "browse"],
		selected: (numberOfFilesSelected: number, rules: Intl.PluralRules) => [
			`${numberOfFilesSelected} ${plural(rules, constants.plural.file, numberOfFilesSelected)} selected`,
			"Browse",
		],
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
					<CircleAlert className="absolute right-2 top-[15%] h-5 w-auto text-red-500" />
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
			onChange: controlledOnChange,
			onInvalidSelection,
			children,
			isFileValid,
			...props
		},
		ref,
	) => {
		const inputFileRef = React.useRef<HTMLInputElement | null>(null);
		const backdropRef = React.useRef<HTMLDivElement | null>(null);

		const [showBackdrop, setShowBackdrop] = React.useState(false);

		const setInputRef = (instance: HTMLInputElement | null) => {
			inputFileRef.current = instance;

			if (typeof ref === "function") {
				ref(instance);
			} else if (ref) {
				ref.current = instance;
			}
		};

		const filterValidFiles = (files: FileList) => {
			const dataTransfer = new DataTransfer();

			const totalSelectedFilesSize = [...files].reduce(
				(acc, file) => acc + file.size,
				0,
			);

			const grouped = [...files].reduce(
				(acc, file) => {
					if (
						isFileValid &&
						!isFileValid(file, totalSelectedFilesSize)
					) {
						acc.invalidFiles = [...acc.invalidFiles, file];

						return acc;
					}

					acc.dataTransfer.items.add(file);

					return acc;
				},
				{ dataTransfer, invalidFiles: [], totalSelectedFilesSize },
			);

			onInvalidSelection?.(
				grouped.invalidFiles,
				grouped.totalSelectedFilesSize,
			);

			return grouped.dataTransfer;
		};
		const selectValidFiles = (dataTransfer: DataTransfer) => {
			inputFileRef.current.files = dataTransfer.files;

			controlledOnChange?.([...dataTransfer.files]);
		};

		const onClickBrowse: React.MouseEventHandler<
			HTMLButtonElement | HTMLDivElement
		> = event => {
			event.stopPropagation();

			inputFileRef.current?.click();
		};
		const onChange: React.ChangeEventHandler<HTMLInputElement> = event => {
			const dataTransfer = filterValidFiles(event.target.files);
			selectValidFiles(dataTransfer);
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

			const dataTransfer = filterValidFiles(event.dataTransfer.files);
			selectValidFiles(dataTransfer);

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

		const numberOfFilesSelected = inputFileRef.current?.files.length ?? 0;
		const pluralRules = new Intl.PluralRules("en-US");

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
					className={cn(
						"flex cursor-pointer flex-col items-center justify-center gap-5 px-5 py-5 md:py-10",
						"border-4 border-dashed border-input transition-colors",
						"focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
						numberOfFilesSelected > 0
							? "border-transparent bg-secondary"
							: "bg-transparent",
					)}>
					{numberOfFilesSelected <= 0 && (
						<button
							className="inline-flex flex-col items-center justify-center font-medium text-muted-foreground"
							onClick={onClickBrowse}
							type="button">
							<Cloud className="mb-2 h-8 w-auto text-primary" />
							{resources.inputFile.placeholder.at(0)}
							<br />
							<span className="text-primary">
								{resources.inputFile.placeholder.at(1)}
							</span>
						</button>
					)}
					{numberOfFilesSelected > 0 && (
						<button
							className="inline-flex flex-col items-center justify-center font-medium text-white dark:text-muted-foreground"
							onClick={onClickBrowse}
							type="button">
							<Files className="mb-2 h-8 w-auto text-primary" />
							{resources.inputFile
								.selected(numberOfFilesSelected, pluralRules)
								.at(0)}
							<br />
							<span className="text-primary">
								{resources.inputFile
									.selected(
										numberOfFilesSelected,
										pluralRules,
									)
									.at(1)}
							</span>
						</button>
					)}
				</div>
				<Backdrop
					ref={backdropRef}
					onDrop={onDrop}
					onDragLeave={onDragLeave}
					show={showBackdrop}
					className={"flex flex-col items-center justify-center"}>
					<Cloud className="h-24 w-auto text-primary" />
					<span className="font-medium">
						{resources.inputFile.instruction}
					</span>
				</Backdrop>
				{children}
			</>
		);
	},
);
InputFile.displayName = "InputFile";

export { Input, InputFile };
