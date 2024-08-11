import { Form, FormGroup } from "@/components/ui/form";
import { Input, InputFile } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Controller, useForm } from "react-hook-form";

const resources = {
	enquiryAction: "/api/enquiry",
	required: (label: string) => `${label}*`,
	placeholderFirstName: "First name",
	placeholderLastName: "Last name",
	placeholderEmail: "Email",
	placeholderPhone: "Phone",
	placeholderEnquiry: "Enquiry",
	labelUploadFiles: "Upload files",
	doSubmit: "Submit",
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
							message: "First name is required",
						},
					}}
					render={({ field }) => (
						<Input
							type="text"
							placeholder={resources.required(
								resources.placeholderFirstName,
							)}
							autoComplete="name given-name"
							autoCapitalize="on"
							autoFocus
							{...field}
						/>
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
							message: "Last name is required",
						},
					}}
					render={({ field }) => (
						<Input
							type="text"
							name="lastName"
							placeholder={resources.required(
								resources.placeholderLastName,
							)}
							autoComplete="name family-name"
							autoCapitalize="on"
							{...field}
						/>
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
							message: "Email is required",
						},
						pattern: {
							value: /.*/gi, // TODO
							message: "", // TODO
						},
					}}
					render={({ field }) => (
						<Input
							type="text"
							name="email"
							placeholder={resources.required(
								resources.placeholderEmail,
							)}
							autoComplete="email"
							autoCapitalize="off"
							{...field}
						/>
					)}
				/>
			</FormGroup>
			<FormGroup>
				<Controller
					control={control}
					name="phone"
					defaultValue=""
					rules={{
						required: {
							value: true,
							message: "Phone is required",
						},
					}}
					render={({ field }) => (
						<Input
							type="text"
							name="phone"
							placeholder={resources.required(
								resources.placeholderPhone,
							)}
							autoComplete="home work mobile"
							{...field}
						/>
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
							message: "Enquiry is required",
						},
					}}
					render={({ field }) => (
						<Textarea
							placeholder={resources.required(
								resources.placeholderEnquiry,
							)}
							autoCapitalize="on"
							{...field}
						/>
					)}
				/>
			</FormGroup>
			<FormGroup>
				<Label>{resources.labelUploadFiles}</Label>
				<Controller
					control={control}
					name="files"
					defaultValue={[]}
					render={({ field }) => <InputFile type="file" {...field} />}
				/>
			</FormGroup>
			<Button type="submit" tabIndex={0}>
				{resources.doSubmit}
			</Button>
		</Form>
	);
};
