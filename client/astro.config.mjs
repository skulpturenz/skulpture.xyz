import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import { brotli } from "@zokki/astro-brotli";
import robotsTxt from "astro-robots-txt";
import { defineConfig } from "astro/config";
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
		robotsTxt(),
		brotli(),
	],
	vite: {
		plugins: [svgr()],
	},
	output: "static",
});
