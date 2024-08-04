import React from "react";
import { LogoWords, LogoIconDark, LogoIconLight } from "@/components/assets";
import { cn } from "@/lib/utils";
import { constants } from "@/components/constants";

export interface FooterProps {
	children?: React.ReactNode;
}

const resources = {
	subtitle: "Your problems, our specialty",
};

export const Footer = ({ children }: FooterProps) => {
	return (
		<footer
			className={cn(constants.contentContainer, "flex flex-col gap-20 ")}>
			<div className="flex flex-col gap-10 md:gap-0 md:flex-row md:items-start md:justify-between mt-24">
				<div className="flex flex-col gap-8">
					<div>
						<LogoIconDark className="light:hidden w-10 h-10 text-primary" />
						<LogoIconLight className="dark:hidden w-10 h-10 text-primary" />
					</div>
					<span className="font-medium text-regular md:text-xl">
						{resources.subtitle}
					</span>
				</div>

				<div>
					<div className="flex flex-wrap gap-32">{children}</div>
				</div>
			</div>

			<LogoWords className="text-foreground h-auto w-full" />
		</footer>
	);
};

export interface FooterSectionProps {
	children?: React.ReactNode;
}

export const FooterSection = ({ children }: FooterSectionProps) => (
	<div className="footer flex flex-col gap-4 first:mb-2 items-start">
		{children}
	</div>
);
