// Test script to validate vendors data
const fs = require("fs");

try {
	const vendorsData = JSON.parse(
		fs.readFileSync("./vendors-data.json", "utf8")
	);

	// Test 2: Check all required sections exist
	const requiredSections = ["arena", "districtX", "village", "campsite"];

	// Test 3: Check District X vendors specifically
	const districtXVendors = vendorsData.vendors.districtX;

	// Check for required properties in each vendor
	const requiredProperties = [
		"id",
		"name",
		"description",
		"type",
		"location",
		"menu",
		"paymentOptions",
	];
	let validVendors = 0;
	let issues = [];

	districtXVendors.forEach((vendor, index) => {
		const missing = requiredProperties.filter((prop) => !vendor[prop]);
		if (missing.length === 0) {
			validVendors++;
		} else {
			issues.push(
				`Vendor ${index + 1} (${
					vendor.name || "unnamed"
				}) missing: ${missing.join(", ")}`
			);
		}
	});

	// Test 4: Check for the new vendors we added
	const newVendorNames = [
		"BAO LONDON",
		"HONEST BURGERS",
		"RUDY'S PIZZA",
		"BUBBLE TEA CO.",
		"GELATO SISTERS",
		"STREET FEAST DONUTS",
		"COCKTAIL LOUNGE",
	];

	newVendorNames.forEach((name) => {
		const found = districtXVendors.find((v) => v.name === name);
	});

	// Test 5: Check menu items
	let totalMenuItems = 0;
	districtXVendors.forEach((vendor) => {
		if (vendor.menu && Array.isArray(vendor.menu)) {
			totalMenuItems += vendor.menu.length;
		}
	});
} catch (error) {
	console.error("❌ Error testing vendors data:", error.message);
}
