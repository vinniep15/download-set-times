const fs = require("fs");

// Read the vendors data
const vendorsData = JSON.parse(fs.readFileSync("vendors-data.json", "utf8"));

Object.keys(vendorsData.zones).forEach((zoneName) => {
	const vendors = vendorsData.zones[zoneName].vendors;

	// Count by type
	const typeCounts = {};
	vendors.forEach((vendor) => {
		vendor.tags.forEach((tag) => {
			if (["Food", "Drinks", "Activities", "Merchandise"].includes(tag)) {
				typeCounts[tag] = (typeCounts[tag] || 0) + 1;
			}
		});
	});
});

// Show some examples
Object.keys(vendorsData.zones).forEach((zoneName) => {
	const vendors = vendorsData.zones[zoneName].vendors;

	["Food", "Drinks", "Activities", "Merchandise"].forEach((type) => {
		const examples = vendors
			.filter((v) => v.tags.includes(type))
			.slice(0, 3);
	});
});
