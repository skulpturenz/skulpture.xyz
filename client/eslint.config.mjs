import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import path from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname, // optional; default: process.cwd()
	resolvePluginsRelativeTo: __dirname, // optional
	recommendedConfig: js.configs.recommended, // optional unless you're using "eslint:recommended"
	allConfig: js.configs.all, // optional unless you're using "eslint:all"
});

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	...compat.env({
		browser: true,
		es2020: true,
	}),
	...compat.config({
		overrides: [
			{
				plugins: ["react-hooks"],
				extends: ["plugin:react-hooks/recommended"],
				files: ["**/*.{jsx,mjsx,tsx,mtsx}"],
				settings: {
					react: {
						version: "detect",
					},
				},
			},
		],
	}),
	{
		languageOptions: {
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		rules: {
			eqeqeq: ["error", "always"],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-empty-object-type": "warn",
		},
	},
	eslintPluginPrettierRecommended,
];
