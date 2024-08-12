import { Form, FormGroup } from "@/components/ui/form";
import {
	FILE_VALIDATION_SUCCESS_FLAG,
	Input,
	InputFile,
} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Controller, useForm } from "react-hook-form";
import { Small } from "@/components/typography/small";

const constants = {
	// From: https://emailregex.com/index.html
	regexEmail:
		/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gi,
	regexPhone: /[0-9]{3}-[0-9]{3}-[0-9]{4}/gi,
};

const resources = {
	enquiryAction: "/api/enquiry",
	required: (label: string) => `${label}*`,
	doSubmit: "Submit",
	form: {
		firstName: {
			label: "First name",
			required: "First name must be specified",
		},
		lastName: {
			label: "Last name",
			required: "Last name must be specified",
		},
		email: {
			label: "Email",
			required: "Email must be specified",
			pattern: "Must be a valid email address",
		},
		phone: {
			label: "Phone",
			pattern: "Must be a valid phone number",
		},
		enquiry: {
			label: "Enquiry",
			required: "Enquiry must be specified",
		},
		files: {
			label: "Attachments",
		},
	},
};

export const EnquiryForm = () => {
	const {
		handleSubmit,
		control,
		formState: _formState,
		reset,
	} = useForm({
		mode: "onChange",
	});

	const onSubmit = handleSubmit(_data => {
		reset();
	});

	return (
		<Form
			method="POST"
			action={resources.enquiryAction}
			onSubmit={onSubmit}>
			<FormGroup>
				<Controller
					control={control}
					name="firstName"
					defaultValue=""
					rules={{
						required: {
							value: true,
							message: resources.form.firstName.required,
						},
					}}
					render={({ field, formState }) => (
						<>
							<Input
								type="text"
								placeholder={resources.required(
									resources.form.firstName.label,
								)}
								autoComplete="name given-name"
								autoCapitalize="on"
								autoFocus
								required
								aria-required
								isError={Boolean(formState.errors.firstName)}
								{...field}
							/>
							<Small aria-live="polite" className="h-2">
								{(formState.errors.firstName
									?.message as string) || " "}
							</Small>
						</>
					)}
				/>
			</FormGroup>
			<FormGroup>
				<Controller
					control={control}
					name="lastName"
					defaultValue=""
					rules={{
						required: {
							value: true,
							message: resources.form.lastName.required,
						},
					}}
					render={({ field, formState }) => (
						<>
							<Input
								type="text"
								name="lastName"
								placeholder={resources.required(
									resources.form.lastName.label,
								)}
								autoComplete="name family-name"
								autoCapitalize="on"
								required
								aria-required
								isError={Boolean(formState.errors.lastName)}
								{...field}
							/>
							<Small aria-live="polite" className="h-2">
								{formState.errors.lastName?.message as string}
							</Small>
						</>
					)}
				/>
			</FormGroup>
			<FormGroup>
				<Controller
					control={control}
					name="email"
					defaultValue=""
					rules={{
						required: {
							value: true,
							message: resources.form.email.required,
						},
						pattern: {
							value: constants.regexEmail,
							message: resources.form.email.pattern,
						},
					}}
					render={({ field, formState }) => (
						<>
							<Input
								type="text"
								name="email"
								placeholder={resources.required(
									resources.form.email.label,
								)}
								autoComplete="email"
								autoCapitalize="off"
								required
								aria-required
								isError={Boolean(formState.errors.email)}
								{...field}
							/>
							<Small aria-live="polite" className="h-2">
								{formState.errors.email?.message as string}
							</Small>
						</>
					)}
				/>
			</FormGroup>
			<FormGroup>
				<Controller
					control={control}
					name="phone"
					defaultValue=""
					rules={{
						pattern: {
							value: constants.regexPhone,
							message: resources.form.phone.pattern,
						},
					}}
					render={({ field, formState }) => (
						<>
							<Input
								type="tel"
								name="phone"
								placeholder={resources.required(
									resources.form.phone.label,
								)}
								autoComplete="home work mobile"
								isError={Boolean(formState.errors.phone)}
								pattern={constants.regexPhone
									.toString()
									.slice(1, -3)}
								{...field}
							/>
							<Small aria-live="polite" className="h-2">
								{formState.errors.phone?.message as string}
							</Small>
						</>
					)}
				/>
			</FormGroup>
			<FormGroup>
				<Controller
					control={control}
					name="enquiry"
					defaultValue=""
					rules={{
						required: {
							value: true,
							message: resources.form.enquiry.required,
						},
					}}
					render={({ field, formState }) => (
						<>
							<Textarea
								placeholder={resources.required(
									resources.form.enquiry.label,
								)}
								autoCapitalize="on"
								required
								aria-required
								isError={Boolean(formState.errors.enquiry)}
								{...field}
							/>
							<Small aria-live="polite" className="h-2">
								{formState.errors.enquiry?.message as string}
							</Small>
						</>
					)}
				/>
			</FormGroup>
			<FormGroup>
				<Label>{resources.form.files.label}</Label>
				<Controller
					control={control}
					name="files"
					defaultValue={[]}
					render={({ field, formState }) => {
						const maxMb = 5;
						const acceptedExtensions = [
							".pdf",
							".docx",
							".doc",
							".ppt",
							".pptx",
							".txt",
							".md",
						];
						const isFileValid = (
							file: File,
							totalSelectedFileSize: number,
						) => {
							const flags = {
								FILE_VALIDATION_INVALID_TOTAL_SIZE_FLAG: 1 << 2,
								FILE_VALIDATION_INVALID_FORMAT_FLAG: 1 << 3,
								InvalidTotalSize:
									"FILE_VALIDATION_INVALID_TOTAL_SIZE_FLAG",
								InvalidFormat:
									"FILE_VALIDATION_INVALID_FORMAT_FLAG",
							};

							const validations = [];
							const messages = [];
							if (
								totalSelectedFileSize >
								maxMb * Math.pow(10, 6)
							) {
								validations.push(flags.InvalidTotalSize);
								// TODO: resources
								messages.push(
									`Total size of selection must be less than ${maxMb} MB`,
								);
							}

							// TODO: constants
							const fileNameRegex =
								/(?<name>\w+)(?<extension>\.*\w*)/gi;
							const groups =
								fileNameRegex.exec(file.name)?.groups ??
								Object.create(null);

							if (
								!acceptedExtensions.includes(
									groups.extension?.toLowerCase() ?? "",
								)
							) {
								validations.push(flags.InvalidFormat);
								// TODO: resources
								messages.push(
									`Only ${acceptedExtensions.slice(0, -1).join(", ")} and ${acceptedExtensions.at(-1)} are accepted`,
								);
							}

							if (validations.length > 0) {
								return {
									flag: validations.reduce(
										(acc, flag) => acc | flag,
										1,
									),
									message: messages.at(0),
								};
							}

							return {
								flag: FILE_VALIDATION_SUCCESS_FLAG,
							};
						};

						return (
							<>
								<InputFile
									type="file"
									{...field}
									isError={Boolean(formState.errors.files)}
									isFileValid={isFileValid}
									accept={acceptedExtensions.join(",")}
								/>
								<Small aria-live="polite" className="h-2">
									{formState.errors.files?.message as string}
								</Small>
							</>
						);
					}}
				/>
			</FormGroup>
			<Button type="submit" tabIndex={0}>
				{resources.doSubmit}
			</Button>
		</Form>
	);
};
