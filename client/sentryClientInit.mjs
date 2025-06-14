import * as Sentry from "@sentry/astro";

Sentry.init({
	dsn: "https://65a710ff87654698887fc9dd07c43085@triage.skulpture.xyz/2",
	sendDefaultPii: true,
	integrations: [],
});
