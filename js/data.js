// data.js - Data loading and processing

import {state} from "./core.js";

/**
 * Load festival data from JSON
 */
export async function loadData() {
	try {
		const response = await fetch("set-times.json");
		if (!response.ok) {
			throw new Error(`Failed to load data: ${response.status}`);
		}
		const rawData = await response.json();

		// If data is already in the new structure with arena/districtX
		if (rawData.arena && rawData.districtX) {
			state.data = rawData;
		} else {
			// If data is still in old format, convert it
			state.data = {
				arena: {
					friday: rawData.friday || {},
					saturday: rawData.saturday || {},
					sunday: rawData.sunday || {},
				},
				districtX: {
					wednesday: rawData.wednesday || {},
					thursday: rawData.thursday || {},
					friday: {},
					saturday: {},
					sunday: {},
				},
			};
		}

		// Check for status of state.data before enabling timetable generation
		if (typeof checkAndEnableDownloadButton === 'function') {
            setTimeout(() => {
                checkAndEnableDownloadButton('menu-timetable-generate');
            }, 50); // Small delay to allow other DOM processing to finish
        }

		return state.data;
	} catch (error) {
		console.error("Error loading set times:", error);
		throw error;
	}
}

/**
 * Extract stage names from the data
 */
export function extractStageNames() {
	// Create sets to collect unique stage names
	const arenaStages = new Set();
	const districtXStages = new Set();

	// Extract arena stages
	if (state.data && state.data.arena) {
		for (const day in state.data.arena) {
			for (const stage in state.data.arena[day]) {
				arenaStages.add(stage);
			}
		}
	}

	// Extract District X stages
	if (state.data && state.data.districtX) {
		for (const day in state.data.districtX) {
			for (const stage in state.data.districtX[day]) {
				districtXStages.add(stage);
			}
		}
	}

	// Convert sets to arrays
	const result = {
		arena: Array.from(arenaStages),
		districtX: Array.from(districtXStages),
	};

	return result;
}
