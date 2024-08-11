import { Form, FormGroup } from "@/components/ui/form";
import { Input, InputFile } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
	return (
		<Form method="POST" action={resources.enquiryAction}>
			<FormGroup>
				<Input
					type="text"
					name="firstName"
					placeholder={resources.required(
						resources.placeholderFirstName,
					)}
					autoComplete="name given-name"
					autoCapitalize="on"
					autoFocus
				/>
			</FormGroup>
			<FormGroup>
				<Input
					type="text"
					name="lastName"
					placeholder={resources.required(
						resources.placeholderLastName,
					)}
					autoComplete="name family-name"
					autoCapitalize="on"
				/>
			</FormGroup>
			<FormGroup>
				<Input
					type="text"
					name="email"
					placeholder={resources.required(resources.placeholderEmail)}
					autoComplete="email"
					autoCapitalize="off"
				/>
			</FormGroup>
			<FormGroup>
				<Input
					type="text"
					name="phone"
					placeholder={resources.required(resources.placeholderPhone)}
					autoComplete="home work mobile"
				/>
			</FormGroup>
			<FormGroup>
				<Textarea
					placeholder={resources.required(
						resources.placeholderEnquiry,
					)}
					autoCapitalize="on"
				/>
			</FormGroup>
			<FormGroup>
				<Label>{resources.labelUploadFiles}</Label>
				<InputFile name="files" type="file" />
			</FormGroup>
			<Button type="submit" tabIndex={0}>
				{resources.doSubmit}
			</Button>
		</Form>
	);
};
