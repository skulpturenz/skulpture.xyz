import React from "react";
import wretch, { type WretchOptions } from "wretch";
import { dedupe, retry } from "wretch/middlewares";

interface UseUptimeProps {
	href: string;
	interval?: number;
	headers?: HeadersInit;
	options?: WretchOptions;
}

export const useUptimeMonitor = ({
	href,
	headers,
	options,
	interval = 5000,
}: UseUptimeProps) => {
	const [uptimeMonitor, setUptimeMonitor] = React.useState({
		isUp: true,
		isLoading: false,
		updated: new Date(),
	});
	const toggleLoading = () =>
		setUptimeMonitor(uptimeStatus => ({
			...uptimeStatus,
			isLoading: !uptimeStatus.isLoading,
		}));
	const isOnline = () =>
		setUptimeMonitor(uptimeStatus => ({
			...uptimeStatus,
			isUp: true,
			updated: new Date(),
		}));
	const isOffline = () =>
		setUptimeMonitor(uptimeStatus => ({
			...uptimeStatus,
			isUp: false,
			updated: new Date(),
		}));

	React.useEffect(() => {
		const getUptimeStatus = () => {
			toggleLoading();

			wretch(href)
				.options(options)
				.middlewares([retry(), dedupe()])
				.headers({
					...headers,
					"Cache-Control": "no-cache",
				})
				.get()
				.res()
				.then(isOnline)
				.catch(isOffline)
				.finally(toggleLoading);
		};

		getUptimeStatus();
		const timer = setInterval(getUptimeStatus, interval);

		return () => clearInterval(timer);
	}, []);

	return {
		isLoading: uptimeMonitor.isLoading,
		isUp: uptimeMonitor.isUp,
		updated: uptimeMonitor.updated,
	};
};
