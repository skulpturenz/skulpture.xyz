import React from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoonStar, Sun, SunMoon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	DEFAULT_THEME,
	DEFAULT_THEME_STORAGE_KEY,
} from "@/components/ui/theme-provider";
import { topographyLight, topographyDark } from "@/components/assets";
import { constants } from "@/components/constants";

export type Theme = "dark" | "light" | "system";

export interface ToggleThemeProps {
	defaultTheme?: Theme;
	storageKey?: string;
}

const resources = {
	toggleTheme: "Toggle theme",
};

// replicated ThemeProvider because Astro does not allow context
export const ToggleTheme = ({
	defaultTheme = DEFAULT_THEME,
	storageKey = DEFAULT_THEME_STORAGE_KEY,
}: ToggleThemeProps) => {
	const [theme, setTheme] = React.useState<Theme>(
		() => getStoredLocalTheme(storageKey) ?? defaultTheme,
	);

	const getNextTheme = (): Theme => {
		if (theme === "system") {
			const systemTheme = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches
				? "dark"
				: "light";

			return systemTheme;
		}

		return theme;
	};

	React.useEffect(() => {
		const root = window.document.documentElement;

		root.classList.remove("light", "dark");

		const nextTheme = getNextTheme();

		root.classList.add(nextTheme);
	}, [theme]);

	React.useEffect(() => {
		const nextTheme = getNextTheme();

		const landingPattern =
			nextTheme === "dark" ? topographyDark : topographyLight;
		const landingIntroSection = document.getElementById(
			constants.id.landingIntro,
		) as HTMLElement | null;

		landingIntroSection?.style.setProperty(
			"background-image",
			`url('${landingPattern.src}')`,
		);
	}, [theme]);

	const nextTheme = () => {
		const validThemes: Theme[] = ["light", "dark", "system"];

		const currentThemeIdx = validThemes.findIndex(
			validTheme => validTheme === theme,
		);

		const nextThemeIdx = (currentThemeIdx + 1) % validThemes.length;
		const nextTheme = validThemes.at(nextThemeIdx) as Theme;

		return nextTheme;
	};

	const onClickToggleTheme = () => {
		const theme = nextTheme();

		localStorage.setItem(storageKey, theme);

		setTheme(theme);
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClickToggleTheme}>
						<Sun
							className={cn(
								"h-5 w-auto aspect-square rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0",
								theme === "system" ? "hidden" : "",
							)}
						/>
						<MoonStar
							className={cn(
								"absolute h-5 w-auto aspect-square rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary",
								theme === "system" ? "hidden" : "",
							)}
						/>
						<SunMoon
							className={cn(
								"absolute h-5 w-auto aspect-square transition-all dark:text-primary light:text-foreground",
								theme !== "system" ? "scale-0" : "scale-100",
							)}
						/>
						<span className="sr-only">{resources.toggleTheme}</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<span>{resources.toggleTheme}</span>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

const getStoredLocalTheme = (storageKey: string) => {
	if (import.meta.env.SSR) {
		return null;
	}

	return localStorage.getItem(storageKey) as Theme;
};
