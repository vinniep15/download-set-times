// Test script for vendor filtering
// Run this after opening vendors-new.html in a browser

// Check for 'Arena' vendors
const arenaVendors = vendorData.zones.filter(
	(vendor) =>
		Array.isArray(vendor.location) &&
		vendor.location.some(
			(loc) => loc.trim().toLowerCase() === "arena".trim().toLowerCase()
		)
);

// Test filtering by both location and tag
// Example: Arena + Food
const arenaFoodVendors = vendorData.zones.filter(
	(vendor) =>
		Array.isArray(vendor.location) &&
		vendor.location.some(
			(loc) => loc.trim().toLowerCase() === "arena".trim().toLowerCase()
		) &&
		Array.isArray(vendor.tags) &&
		vendor.tags.includes("Food")
);

// Count total unique tags across all vendors
const allTags = new Set();
vendorData.zones.forEach((vendor) => {
	if (Array.isArray(vendor.tags)) {
		vendor.tags.forEach((tag) => allTags.add(tag));
	}
});

// Count total unique locations
const allLocations = new Set();
vendorData.zones.forEach((vendor) => {
	if (Array.isArray(vendor.location)) {
		vendor.location.forEach((loc) => {
			if (loc && loc.trim() !== "") {
				allLocations.add(loc.trim());
			}
		});
	}
});
