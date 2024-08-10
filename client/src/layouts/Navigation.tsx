import {
	Disclosure,
	DisclosureButton,
	DisclosurePanel,
} from "@headlessui/react";
import { Bars, LogoLight, LogoDark } from "@/components/assets";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { constants } from "@/components/constants";
import { ToggleTheme } from "./ThemeToggle";

export interface NavigationProps {
	items?: NavigationItem[];
}

export interface NavigationItem {
	label: string;
	pathname?: string;
}

const resources = {
	skulpture: "Skulpture",
	doOpenMobileMenu: "Open main menu",
	doContactUs: "Contact us",
};

export const Navigation = ({ items }: NavigationProps) => {
	return (
		<Disclosure as="nav" className="bg-background">
			<div className={cn(constants.contentContainer)}>
				<div className="flex h-24 justify-between">
					<div className="flex">
						<div className="-ml-2 mr-1 flex items-center lg:hidden">
							<DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-foreground/70 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
								<span className="absolute -inset-0.5" />
								<span className="sr-only">
									{resources.doOpenMobileMenu}
								</span>
								<Bars
									aria-hidden="true"
									className="block h-6 w-auto group-data-[open]:hidden"
								/>
								<X
									aria-hidden="true"
									className="hidden h-6 w-auto group-data-[open]:block"
								/>
							</DisclosureButton>
						</div>
						<div className="flex flex-shrink-0 items-center">
							<a href="/">
								<LogoLight className="h-6 w-auto dark:hidden" />
								<LogoDark className="hidden h-6 w-auto dark:block" />
								<span className="sr-only">
									{resources.skulpture}
								</span>
							</a>
						</div>
					</div>
					<div className="flex items-center">
						<div className="hidden lg:mr-11 lg:flex lg:flex-shrink-0 lg:items-center">
							{items?.map(item => {
								return (
									<Button
										key={item.pathname}
										variant="link"
										asChild>
										<a href={item.pathname}>{item.label}</a>
									</Button>
								);
							})}
						</div>
						<div className="flex items-center gap-2">
							<ToggleTheme
								storageKey={`skulpture-theme-${import.meta.env.MODE}`}
							/>

							<Button asChild>
								<a href="/contact">{resources.doContactUs}</a>
							</Button>
						</div>
					</div>
				</div>
			</div>

			<DisclosurePanel className="rounded-b-sm border-b-2 lg:hidden">
				<div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
					{items?.map(item => {
						return (
							<DisclosureButton
								key={item.pathname}
								as="a"
								href={item.pathname}
								aria-current={
									isCurrent(item) ? "page" : undefined
								}
								className={cn(
									isCurrent(item)
										? "bg-secondary text-white"
										: "text-foreground hover:bg-secondary hover:text-secondary-foreground",
									"block rounded-md px-5 py-2 text-base font-medium",
								)}>
								{item.label}
							</DisclosureButton>
						);
					})}
				</div>
			</DisclosurePanel>
		</Disclosure>
	);
};

const isCurrent = (item: NavigationItem) => {
	if (import.meta.env.SSR) {
		return false;
	}

	return window.location.pathname === item.pathname;
};
