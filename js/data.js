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
	console.log("Extracting stage names from data");

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

	console.log("Extracted stage names:", result);
	return result;
}
