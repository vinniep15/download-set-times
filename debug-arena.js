const fs = require("fs");
const data = JSON.parse(fs.readFileSync("vendors-data.json", "utf8"));

// 1. Check arena vendors
const arenaVendors = data.zones.filter(
	(vendor) =>
		Array.isArray(vendor.location) &&
		vendor.location.some((loc) => loc === "Arena")
);

// 2. Check arena vendors with different case
const arenaVendorsCaseInsensitive = data.zones.filter(
	(vendor) =>
		Array.isArray(vendor.location) &&
		vendor.location.some(
			(loc) => loc.toLowerCase() === "arena".toLowerCase()
		)
);

// 4. Show a few arena vendors as a sample
if (arenaVendors.length > 0) {
	arenaVendors.slice(0, 5).forEach((vendor) => {});
}
