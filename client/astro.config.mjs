import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { brotli } from "@zokki/astro-brotli";
import robotsTxt from "astro-robots-txt";
import { defineConfig } from "astro/config";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
	site: "https://skulpture.xyz",
	integrations: [
		react({
			experimentalReactChildren: true,
		}),
		sitemap(),
		robotsTxt(),
		brotli(),
	],
	vite: {
		plugins: [svgr(), tailwindcss()],
	},
	output: "static",
});
