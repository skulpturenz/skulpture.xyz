import React from "react";
import {
	LogoWords,
	LogoIconDark,
	LogoIconLight,
	ArrowRight,
} from "@/components/assets";
import { cn } from "@/lib/utils";
import { constants } from "@/components/constants";
import { motion } from "framer-motion";

export interface FooterProps {
	className?: string;
	children?: React.ReactNode;
}

const resources = {
	skulpture: "Skulpture",
	subtitle: "Your problems, our specialty",
	workTogether: "Let's work together",
};

export const Footer = ({ className, children }: FooterProps) => {
	return (
		<footer
			className={cn(
				constants.contentContainer,
				className,
				"flex flex-col gap-20",
			)}>
			<div className="flex flex-col gap-10 lg:gap-0 lg:flex-row lg:items-start lg:justify-between mt-24">
				<div className="flex flex-col gap-8">
					<div>
						<LogoIconDark className="light:hidden w-10 h-10 text-primary" />
						<LogoIconLight className="dark:hidden w-10 h-10 text-primary" />
						<span className="sr-only">{resources.skulpture}</span>
					</div>
					<span className="font-medium text-regular lg:text-xl">
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

export interface ContactBlockProps {
	className?: string;
}

export const ContactBlock = ({ className }: ContactBlockProps) => (
	<>
		<a href="/contact" rel="noopener noreferrer" target="_blank">
			<div
				className={cn(
					className,
					"bg-primary text-primary-foreground w-full rounded-3xl lg:rounded-2xl h-40 xl:h-80 flex items-center justify-between px-10 xl:px-24",
				)}>
				<span className="font-bold text-4xl xl:text-7xl max-w-[15rem] xl:max-w-sm tracking-tighter">
					{resources.workTogether}
				</span>
				<motion.div
					initial={{ x: "-100%", opacity: 0 }}
					whileInView={{ x: 0, opacity: 1 }}
					viewport={{ once: true }}
					transition={{ delay: 0.1 }}>
					<ArrowRight className="xl:h-40 h-20 w-auto" />
				</motion.div>
			</div>
		</a>
	</>
);
