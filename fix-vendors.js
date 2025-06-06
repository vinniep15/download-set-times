#!/usr/bin/env node
/**
 * This script checks and fixes the vendors.html file to ensure it can properly load vendors-data.json
 */

const fs = require("fs");
const path = require("path");

const VENDOR_HTML_PATH = path.join(process.cwd(), "vendors.html");
const VENDOR_DATA_PATH = path.join(process.cwd(), "vendors-data.json");

// Check if vendor data file exists and is valid JSON
function checkVendorDataFile() {
	if (!fs.existsSync(VENDOR_DATA_PATH)) {
		console.error(
			"ERROR: vendors-data.json file not found at",
			VENDOR_DATA_PATH
		);
		return false;
	}

	try {
		const content = fs.readFileSync(VENDOR_DATA_PATH, "utf8");
		const data = JSON.parse(content);

		// Check structure
		if (!data.zones) {
			console.error(
				'ERROR: vendors-data.json is missing "zones" property'
			);
			return false;
		}

		const zoneCount = Object.keys(data.zones).length;

		let vendorCount = 0;
		for (const zone in data.zones) {
			if (data.zones[zone].vendors) {
				vendorCount += data.zones[zone].vendors.length;
			}
		}

		return true;
	} catch (error) {
		console.error(
			"ERROR: vendors-data.json is not valid JSON:",
			error.message
		);
		return false;
	}
}

// Fix the vendors.html file data loading
function fixVendorsHtml() {
	if (!fs.existsSync(VENDOR_HTML_PATH)) {
		console.error(
			"ERROR: vendors.html file not found at",
			VENDOR_HTML_PATH
		);
		return false;
	}

	let content = fs.readFileSync(VENDOR_HTML_PATH, "utf8");
	let modified = false;

	// 1. Fix the loadVendorsData function
	const loadVendorsDataRegex =
		/async function loadVendorsData\(\) {[\s\S]*?try {[\s\S]*?const response = await fetch\(['"](.*?)['"]\);[\s\S]*?}[\s\S]*?}/;
	if (loadVendorsDataRegex.test(content)) {
		content = content.replace(
			loadVendorsDataRegex,
			`async function loadVendorsData() {
        try {
            const response = await fetch("vendors-data.json");
            if (!response.ok) {
                throw new Error(\`HTTP error! status: \${response.status}\`);
            }
            vendorsData = await response.json();
        } catch (error) {
            console.error("Error loading vendors data:", error);
            // Fallback to demo data if file not found
            vendorsData = createDemoData();
        }
    }`
		);
		modified = true;
	}

	// Add diagnostic logging to showVendorPopup
	const showVendorPopupRegex =
		/function showVendorPopup\(vendor\) {[\s\S]*?document\.getElementById\("popupName"\)\.textContent = vendor\.name;/;
	if (showVendorPopupRegex.test(content)) {
		content = content.replace(
			showVendorPopupRegex,
			`function showVendorPopup(vendor) {
        // Populate popup content
        document.getElementById("popupName").textContent = vendor.name;`
		);
		modified = true;
	}

	// Save the modified file
	if (modified) {
		fs.writeFileSync(VENDOR_HTML_PATH, content);
		return true;
	} else {
		return false;
	}
}

// Main function to run all checks and fixes
function main() {
	const dataValid = checkVendorDataFile();
	const htmlFixed = fixVendorsHtml();
}

// Run the main function
main();
