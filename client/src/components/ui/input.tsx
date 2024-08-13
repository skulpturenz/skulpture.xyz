import * as React from "react";
import { cn, plural } from "@/lib/utils";
import { CircleAlert, Files } from "lucide-react";
import { Cloud } from "@/components/assets";
import { Backdrop } from "./backdrop";
import { constants } from "@/components/constants";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { Button } from "./button";
import { partial } from "filesize";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	isError?: boolean;
}

const resources = {
	ui: {
		inputFile: {
			selectContainer:
				"inline-flex flex-col items-center justify-center font-semibold ",
			selectIcon: "mb-2 h-8 w-auto text-primary",
			selectInstruction: "text-primary",
			selectedListContainer: "flex flex-col gap-0 md:flex-row md:gap-4",
			selectedListLabel: "whitespace-nowrap",
			selectedListItemContainer: "flex flex-wrap items-center gap-x-4",
			infoCard: {
				trigger:
					"cursor-pointer font-semibold hover:underline hover:underline-offset-4 text-left",
				content: "flex max-w-xs flex-col text-sm text-left",
			},
		},
	},
	inputFile: {
		formatFileSize: partial({ standard: "si" }),
		placeholder: ["Drag & drop or", "browse"],
		selected: (numberOfFilesSelected: number, rules: Intl.PluralRules) => [
			`${numberOfFilesSelected} ${plural(rules, constants.plural.file, numberOfFilesSelected)} selected`,
			"Browse",
		],
		instruction: "Drop your files here",
		selectedFilesLabel: "These files were selected",
		notSelectedFilesLabel: "These files were not selected",
		infoCard: {
			size: "Size",
			lastModified: "Modified",
			type: "Type",
			reason: "Reason",
			doRemoveSelection: "Remove selection",
		},
	},
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, isError, ...props }, ref) => {
		return (
			<div className="relative">
				<input
					type={type}
					className={cn(
						"flex h-9 w-full rounded-none border-b-4 border-input bg-transparent px-3 py-1 transition-colors file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
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

export interface InputFileProps
	extends Omit<InputProps, "value" | "onChange" | "children"> {
	value?: null;
	onChange?: (files: File[]) => void;
	onInvalidSelection?: (
		selections: FileSelection[],
		totalSelectionSize: number,
	) => void;
	isFileValid?: (
		file: File,
		totalSelectedFileSize: number,
	) => ValidationResult;
}
export const FILE_VALIDATION_SUCCESS_FLAG = 1 << 5;
export const FILE_VALIDATION_NO_VALIDATOR_FLAG = 1 << 6;
export interface ValidationResult {
	flag: number;
	message?: string;
}
export interface FileSelection {
	file: File;
	validationResult: ValidationResult;
}

const InputFile = React.forwardRef<HTMLInputElement, InputFileProps>(
	(
		{
			className,
			type,
			isError,
			onChange: controlledOnChange,
			onInvalidSelection,
			isFileValid,
			value,
			...props
		},
		ref,
	) => {
		const inputFileRef = React.useRef<HTMLInputElement | null>(null);
		const backdropRef = React.useRef<HTMLDivElement | null>(null);

		const [showBackdrop, setShowBackdrop] = React.useState(false);
		const [selections, setSelections] = React.useState<FileSelection[]>([]);

		const setInputRef = (instance: HTMLInputElement | null) => {
			inputFileRef.current = instance;

			if (typeof ref === "function") {
				ref(instance);
			} else if (ref) {
				ref.current = instance;
			}
		};

		const onlyValid = (files: FileList) => {
			const dataTransfer = new DataTransfer();

			const totalSelectionSize = [...files].reduce(
				(acc, file) => acc + file.size,
				0,
			);

			const grouped = [...files].reduce(
				(acc, file) => {
					if (isFileValid) {
						const validationResult = isFileValid(
							file,
							totalSelectionSize,
						);

						acc.selections = [
							...acc.selections,
							{ file, validationResult },
						];

						if (
							(validationResult.flag &
								FILE_VALIDATION_SUCCESS_FLAG) !==
							FILE_VALIDATION_SUCCESS_FLAG
						) {
							acc.invalidFiles = [...acc.invalidFiles, file];

							return acc;
						}
					} else {
						const validationResult: FileSelection = {
							file,
							validationResult: {
								flag:
									FILE_VALIDATION_SUCCESS_FLAG |
									FILE_VALIDATION_NO_VALIDATOR_FLAG,
							},
						};

						acc.selections = [...acc.selections, validationResult];
					}

					acc.dataTransfer.items.add(file);

					return acc;
				},
				{
					dataTransfer,
					invalidFiles: [],
					selections: [],
					totalSelectionSize,
				},
			);

			onInvalidSelection?.(
				grouped.selections,
				grouped.totalSelectionSize,
			);

			setSelections(grouped.selections);

			return grouped.dataTransfer;
		};
		const select = (dataTransfer: DataTransfer) => {
			inputFileRef.current.files = dataTransfer.files;

			controlledOnChange?.([...dataTransfer.files]);
		};
		const reset = () => {
			select(new DataTransfer());
			setSelections([]);
			setShowBackdrop(false);
		};

		const onClickBrowse: React.MouseEventHandler<
			HTMLButtonElement | HTMLDivElement
		> = event => {
			event.stopPropagation();

			inputFileRef.current?.click();
		};
		const onChange: React.ChangeEventHandler<HTMLInputElement> = event => {
			const dataTransfer = onlyValid(event.target.files);
			select(dataTransfer);
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

			const dataTransfer = onlyValid(event.dataTransfer.files);
			select(dataTransfer);

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
		const validSelections = selections.filter(
			({ validationResult }) =>
				(validationResult.flag & FILE_VALIDATION_SUCCESS_FLAG) ===
				FILE_VALIDATION_SUCCESS_FLAG,
		);
		const invalidSelections = selections.filter(
			({ validationResult }) =>
				(validationResult.flag & FILE_VALIDATION_SUCCESS_FLAG) !==
				FILE_VALIDATION_SUCCESS_FLAG,
		);
		const makeOnClickRemoveSelection = (file: File) => () => {
			const filtered = [...inputFileRef.current.files].filter(
				currentFile => currentFile.name !== file.name,
			);

			const dataTransfer = new DataTransfer();
			filtered.forEach(file => dataTransfer.items.add(file));

			setSelections(results =>
				results.filter(result => result.file.name !== file.name),
			);
			select(dataTransfer);
		};

		const hasHover = () => {
			if (import.meta.env.SSR) {
				return false;
			}

			return window.matchMedia("(hover: none)").matches;
		};

		React.useEffect(() => {
			if (value) {
				return;
			}

			reset();
		}, [value]);

		const SelectedFile = ({ file }: FileSelection) => {
			const Container = hasHover() ? Popover : HoverCard;
			const Trigger = hasHover() ? PopoverTrigger : HoverCardTrigger;
			const Content = hasHover() ? PopoverContent : HoverCardContent;

			return (
				<Container key={file.name}>
					<Trigger
						className={resources.ui.inputFile.infoCard.trigger}>
						{file.name}
					</Trigger>
					<Content
						className={resources.ui.inputFile.infoCard.content}>
						<span>
							{resources.inputFile.infoCard.size}
							:&nbsp;
							{resources.inputFile.formatFileSize(file.size)}
						</span>
						<span>
							{resources.inputFile.infoCard.type}
							:&nbsp;{file.type}
						</span>
						<span>
							{resources.inputFile.infoCard.lastModified}
							:&nbsp;
							{new Date(file.lastModified).toDateString()}
						</span>
						<Button
							variant="destructive"
							className="mt-2 w-full"
							onClick={makeOnClickRemoveSelection(file)}
							type="button">
							{resources.inputFile.infoCard.doRemoveSelection}
						</Button>
					</Content>
				</Container>
			);
		};

		return (
			<>
				<input
					ref={setInputRef}
					type="file"
					multiple
					className="hidden"
					onChange={onChange}
					{...props}
				/>
				<div
					tabIndex={0}
					onClick={onClickBrowse}
					className={cn(
						"flex cursor-pointer flex-col items-center justify-center gap-5 rounded-none px-5 py-5 md:py-10",
						"border-4 border-dashed border-input transition-colors",
						"focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
						numberOfFilesSelected > 0
							? "border-transparent bg-secondary"
							: "bg-transparent",
					)}>
					{numberOfFilesSelected <= 0 && (
						<button
							className={cn(
								resources.ui.inputFile.selectContainer,
								"text-muted-foreground",
							)}
							onClick={onClickBrowse}
							type="button">
							<Cloud
								className={resources.ui.inputFile.selectIcon}
							/>
							{resources.inputFile.placeholder.at(0)}
							<br />
							<span
								className={
									resources.ui.inputFile.selectInstruction
								}>
								{resources.inputFile.placeholder.at(1)}
							</span>
						</button>
					)}
					{numberOfFilesSelected > 0 && (
						<button
							className={cn(
								resources.ui.inputFile.selectContainer,
								"text-white",
							)}
							onClick={onClickBrowse}
							type="button">
							<Files
								className={resources.ui.inputFile.selectIcon}
							/>
							{resources.inputFile
								.selected(numberOfFilesSelected, pluralRules)
								.at(0)}
							<br />
							<span
								className={
									resources.ui.inputFile.selectInstruction
								}>
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
				{selections.length > 0 && (
					<div className="flex flex-col gap-4">
						{validSelections.length > 0 && (
							<div
								className={
									resources.ui.inputFile.selectedListContainer
								}>
								<span
									className={
										resources.ui.inputFile.selectedListLabel
									}>
									{resources.inputFile.selectedFilesLabel}
								</span>
								<div
									className={
										resources.ui.inputFile
											.selectedListItemContainer
									}>
									{validSelections.map(SelectedFile)}
								</div>
							</div>
						)}
						{invalidSelections.length > 0 && (
							<div
								className={
									resources.ui.inputFile.selectedListContainer
								}>
								<span
									className={
										resources.ui.inputFile.selectedListLabel
									}>
									{resources.inputFile.notSelectedFilesLabel}
								</span>
								<div
									className={
										resources.ui.inputFile
											.selectedListItemContainer
									}>
									{invalidSelections.map(SelectedFile)}
								</div>
							</div>
						)}
					</div>
				)}
				<Backdrop
					ref={backdropRef}
					onDrop={onDrop}
					onDragLeave={onDragLeave}
					show={showBackdrop}
					className="flex flex-col items-center justify-center">
					<Cloud className="h-24 w-auto text-primary" />
					<span className="font-medium">
						{resources.inputFile.instruction}
					</span>
				</Backdrop>
			</>
		);
	},
);
InputFile.displayName = "InputFile";

export { Input, InputFile };
