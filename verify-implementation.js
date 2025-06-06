const fs = require("fs");

// Read the vendors data
const vendorsData = JSON.parse(fs.readFileSync("vendors-data.json", "utf8"));

let totalVendors = 0;
let typeCounts = {Food: 0, Drinks: 0, Activities: 0, Merchandise: 0};

// Count vendors across all zones
Object.keys(vendorsData.zones).forEach((zoneName) => {
	const vendors = vendorsData.zones[zoneName].vendors;
	totalVendors += vendors.length;

	const zoneTypeCounts = {Food: 0, Drinks: 0, Activities: 0, Merchandise: 0};

	vendors.forEach((vendor) => {
		vendor.tags.forEach((tag) => {
			if (typeCounts.hasOwnProperty(tag)) {
				typeCounts[tag]++;
				zoneTypeCounts[tag]++;
			}
		});
	});
});

// Show examples of each type
Object.keys(vendorsData.zones).forEach((zoneName) => {
	const vendors = vendorsData.zones[zoneName].vendors;

	["Food", "Drinks", "Activities", "Merchandise"].forEach((type) => {
		const examples = vendors.filter((v) => v.tags.includes(type));
	});
});
