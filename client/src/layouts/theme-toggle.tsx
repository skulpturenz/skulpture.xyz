import { Button } from "@/components/ui/button";
import {
	DEFAULT_THEME,
	DEFAULT_THEME_STORAGE_KEY,
} from "@/components/ui/theme-provider";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MoonStar, Sun, SunMoon } from "lucide-react";
import React from "react";

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
	}, [theme, getNextTheme]);

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
						onClick={onClickToggleTheme}
						tabIndex={0}>
						<Sun
							className={cn(
								"aspect-square h-5 w-auto rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0",
								theme === "system" ? "hidden" : "",
							)}
						/>
						<MoonStar
							className={cn(
								"absolute aspect-square h-5 w-auto rotate-90 scale-0 text-primary transition-all dark:rotate-0 dark:scale-100",
								theme === "system" ? "hidden" : "",
							)}
						/>
						<SunMoon
							className={cn(
								"light:text-foreground absolute aspect-square h-5 w-auto transition-all dark:text-primary",
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
