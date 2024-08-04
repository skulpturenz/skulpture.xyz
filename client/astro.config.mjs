import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import svgr from "vite-plugin-svgr";

// https://astro.build/config
export default defineConfig({
	site: "https://skulpture.xyz",
	integrations: [
		react({
			experimentalReactChildren: true,
		}),
		tailwind({
			applyBaseStyles: false,
		}),
		sitemap(),
	],
	vite: {
		plugins: [svgr()],
	},
	output: "static",
});
