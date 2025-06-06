// Simple script to verify that vendors-data.json is valid and accessible
// Run this in the browser console or Node.js to check the file

async function verifyVendorsData() {
	try {
		// In browser
		if (typeof window !== "undefined") {
			const response = await fetch("vendors-data.json");
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const text = await response.text();

			try {
				const data = JSON.parse(text);

				// Validate structure
				if (!data.zones) {
					console.error("Missing 'zones' property in data");
				} else {
					const zoneNames = Object.keys(data.zones);

					// Check each zone for vendors
					let totalVendors = 0;
					for (const zoneName of zoneNames) {
						const vendors = data.zones[zoneName].vendors || [];
						totalVendors += vendors.length;
					}
				}

				return {
					valid: true,
					message: "vendors-data.json is valid and accessible",
				};
			} catch (parseError) {
				console.error("JSON parsing error:", parseError);
				return {
					valid: false,
					message: `JSON parsing error: ${parseError.message}`,
				};
			}
		} else {
			// In Node.js
			const fs = require("fs");
			const path = require("path");

			const filePath = path.join(process.cwd(), "vendors-data.json");

			if (!fs.existsSync(filePath)) {
				return {
					valid: false,
					message: `File not found at ${filePath}`,
				};
			}

			const text = fs.readFileSync(filePath, "utf8");

			try {
				const data = JSON.parse(text);

				// Validate structure
				if (!data.zones) {
					console.error("Missing 'zones' property in data");
				} else {
					const zoneNames = Object.keys(data.zones);
				}

				return {
					valid: true,
					message: "vendors-data.json is valid and accessible",
				};
			} catch (parseError) {
				console.error("JSON parsing error:", parseError);
				return {
					valid: false,
					message: `JSON parsing error: ${parseError.message}`,
				};
			}
		}
	} catch (error) {
		console.error("Error accessing file:", error);
		return {
			valid: false,
			message: `Error accessing file: ${error.message}`,
		};
	}
}

// Export for Node.js
if (typeof module !== "undefined") {
	module.exports = verifyVendorsData;
}
