import { ArrowRight, LogoIconAnimated, LogoWords } from "@/components/assets";
import { constants } from "@/components/constants";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

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
			<div className="mt-24 flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-0">
				<div className="flex flex-col gap-8">
					<a href="/">
						<LogoIconAnimated
							delay={0.5}
							className="h-10 w-auto text-primary"
						/>
						<span className="sr-only">{resources.skulpture}</span>
					</a>
					<span className="text-regular font-medium lg:text-xl">
						{resources.subtitle}
					</span>
				</div>

				<div>
					<div className="flex flex-wrap gap-x-20 gap-y-10">
						{children}
					</div>
				</div>
			</div>

			<a href="/">
				<LogoWords className="h-auto w-full text-foreground" />
			</a>
		</footer>
	);
};

export interface FooterSectionProps {
	children?: React.ReactNode;
}

export const FooterSection = ({ children }: FooterSectionProps) => (
	<div className="footer flex flex-col items-start gap-4 first:mb-2">
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
					"flex h-40 w-full items-center justify-between rounded-3xl bg-primary px-10 text-primary-foreground lg:rounded-2xl xl:h-80 xl:px-24",
				)}>
				<span className="max-w-[15rem] text-4xl font-bold tracking-tighter xl:max-w-sm xl:text-7xl">
					{resources.workTogether}
				</span>
				<motion.div
					initial={{ x: "-100%", opacity: 0 }}
					whileInView={{ x: 0, opacity: 1 }}
					viewport={{ once: true }}
					transition={{ delay: 0.25 }}>
					<ArrowRight className="h-20 w-auto xl:h-40" />
				</motion.div>
			</div>
		</a>
	</>
);
