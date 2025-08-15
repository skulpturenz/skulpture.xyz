import Snowfall from "react-snowfall";

export const Christmas = () => {
	const currentMonth = new Date().getMonth();

	// November, December, January
	// `getMonth` is zero based
	if (![10, 11, 0].includes(currentMonth)) {
		return null;
	}

	return <Snowfall style={{ position: "fixed" }} />;
};
