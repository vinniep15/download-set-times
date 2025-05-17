/**
 * Conflicts Module
 * Handles detection and management of scheduling conflicts
 */

import {state} from "./core.js";
import {timeToMinutes} from "./utils.js";

/**
 * Find conflicts for a specific set
 * Used for event tooltips to show conflicts with other favorites
 *
 * @param {Object} set - The set to check for conflicts
 * @param {string} stage - Stage name
 * @param {string} day - Day name
 * @param {string} venue - Venue name (arena or districtX)
 * @return {Array} List of conflicting sets
 */
export function findConflictsForSet(set, stage, day, venue) {
	if (
		!set ||
		!set.start ||
		!set.end ||
		!state.favoriteSets ||
		!state.favoriteSets.includes(
			`${set.artist}|${day}|${stage}|${set.start}`
		)
	) {
		return [];
	}

	const conflicts = [];
	const startMin = timeToMinutes(set.start);
	const endMin = timeToMinutes(set.end);

	// Check for conflicts in same venue (different stages)
	if (state.data[venue] && state.data[venue][day]) {
		Object.keys(state.data[venue][day]).forEach((otherStage) => {
			if (otherStage === stage) return; // Skip same stage
			if (Array.isArray(state.data[venue][day][otherStage])) {
				state.data[venue][day][otherStage].forEach((otherSet) => {
					const otherSetKey = `${otherSet.artist}|${day}|${otherStage}|${otherSet.start}`;
					if (!state.favoriteSets.includes(otherSetKey)) return;
					if (!otherSet.start || !otherSet.end) return;
					const otherStart = timeToMinutes(otherSet.start);
					const otherEnd = timeToMinutes(otherSet.end);
					if (startMin < otherEnd && endMin > otherStart) {
						conflicts.push({
							artist: otherSet.artist,
							stage: otherStage,
							start: otherSet.start,
							end: otherSet.end,
							venue: venue === "arena" ? "Arena" : "District X",
						});
					}
				});
			}
		});
	}

	// Check for conflicts in the other venue (all stages)
	const otherVenue = venue === "arena" ? "districtX" : "arena";
	if (state.data[otherVenue] && state.data[otherVenue][day]) {
		Object.keys(state.data[otherVenue][day]).forEach((otherStage) => {
			if (Array.isArray(state.data[otherVenue][day][otherStage])) {
				state.data[otherVenue][day][otherStage].forEach((otherSet) => {
					const otherSetKey = `${otherSet.artist}|${day}|${otherStage}|${otherSet.start}`;
					if (!state.favoriteSets.includes(otherSetKey)) return;
					if (!otherSet.start || !otherSet.end) return;
					const otherStart = timeToMinutes(otherSet.start);
					const otherEnd = timeToMinutes(otherSet.end);
					if (startMin < otherEnd && endMin > otherStart) {
						conflicts.push({
							artist: otherSet.artist,
							stage: otherStage,
							start: otherSet.start,
							end: otherSet.end,
							venue:
								otherVenue === "arena" ? "Arena" : "District X",
						});
					}
				});
			}
		});
	}

	// Check for conflicts in both venues (all stages, including the current set's own venue)
	["arena", "districtX"].forEach((v) => {
		if (!state.data[v] || !state.data[v][day]) return;
		Object.keys(state.data[v][day]).forEach((otherStage) => {
			if (v === venue && otherStage === stage) return; // Skip the same set
			if (Array.isArray(state.data[v][day][otherStage])) {
				state.data[v][day][otherStage].forEach((otherSet) => {
					const otherSetKey = `${otherSet.artist}|${day}|${otherStage}|${otherSet.start}`;
					if (!state.favoriteSets.includes(otherSetKey)) return;
					if (!otherSet.start || !otherSet.end) return;
					const otherStart = timeToMinutes(otherSet.start);
					const otherEnd = timeToMinutes(otherSet.end);
					if (startMin < otherEnd && endMin > otherStart) {
						conflicts.push({
							artist: otherSet.artist,
							stage: otherStage,
							start: otherSet.start,
							end: otherSet.end,
							venue: v === "arena" ? "Arena" : "District X",
						});
					}
				});
			}
		});
	});

	// Remove duplicates (by artist, stage, start, end, venue)
	const seen = new Set();
	const uniqueConflicts = conflicts.filter((c) => {
		const key = `${c.artist}|${c.stage}|${c.start}|${c.end}|${c.venue}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return uniqueConflicts;
}

/**
 * Check if a specific set has conflicts
 * Used to highlight conflicting events in the schedule
 *
 * @param {Object} set - The set to check
 * @param {string} stage - Stage name
 * @param {string} day - Day name
 * @param {string} venue - Venue name
 * @return {boolean} True if there's a conflict
 */
export function checkForSetConflict(set, stage, day, venue) {
	const startMin = timeToMinutes(set.start);
	const endMin = timeToMinutes(set.end);

	// Check conflicts within same venue
	const sameVenueStages = Object.keys(state.data[venue][day]);
	for (const otherStage of sameVenueStages) {
		if (otherStage === stage) continue;

		for (const otherSet of state.data[venue][day][otherStage]) {
			if (!state.favoriteArtists.includes(otherSet.artist)) continue;
			if (!otherSet.start || !otherSet.end) continue;

			const otherStart = timeToMinutes(otherSet.start);
			const otherEnd = timeToMinutes(otherSet.end);

			if (startMin < otherEnd && endMin > otherStart) {
				return true;
			}
		}
	}

	// Check conflicts with other venue
	const otherVenue = venue === "arena" ? "districtX" : "arena";
	if (state.data[otherVenue] && state.data[otherVenue][day]) {
		const otherVenueStages = Object.keys(state.data[otherVenue][day]);

		for (const otherStage of otherVenueStages) {
			for (const otherSet of state.data[otherVenue][day][otherStage]) {
				if (!state.favoriteArtists.includes(otherSet.artist)) continue;
				if (!otherSet.start || !otherSet.end) continue;

				const otherStart = timeToMinutes(otherSet.start);
				const otherEnd = timeToMinutes(otherSet.end);

				if (startMin < otherEnd && endMin > otherStart) {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Find all scheduling conflicts for favorite artists
 * Returns an array of conflict objects
 * @return {Array} Array of conflict objects
 */
export function findAllConflicts() {
	if (state.favoriteArtists.length < 2) return []; // Need at least 2 favorites to have conflicts

	const conflicts = [];

	// Check Arena conflicts
	Object.keys(state.data.arena).forEach((day) => {
		const stages = Object.keys(state.data.arena[day]);
		const dayConflicts = findConflictsForVenue("arena", day, stages);

		if (dayConflicts.length > 0) {
			conflicts.push(...dayConflicts);
		}
	});

	// Check District X conflicts
	if (state.data.districtX) {
		Object.keys(state.data.districtX).forEach((day) => {
			if (!state.data.districtX[day]) return;

			const stages = Object.keys(state.data.districtX[day]);
			const dayConflicts = findConflictsForVenue(
				"districtX",
				day,
				stages
			);

			if (dayConflicts.length > 0) {
				conflicts.push(...dayConflicts);
			}
		});
	}

	// Check cross-venue conflicts
	const crossVenueConflicts = findCrossVenueConflicts();
	if (crossVenueConflicts.length > 0) {
		conflicts.push(...crossVenueConflicts);
	}

	return conflicts;
}

/**
 * Find conflicts between favorite artists within a venue
 */
function findConflictsForVenue(venue, day, stages) {
	const conflicts = [];

	// Build an array of all favorite performances for this day and venue
	const favoriteSets = [];

	stages.forEach((stage) => {
		if (!Array.isArray(state.data[venue][day][stage])) return;

		state.data[venue][day][stage].forEach((set) => {
			if (
				state.favoriteArtists.includes(set.artist) &&
				set.start &&
				set.end
			) {
				favoriteSets.push({
					artist: set.artist,
					stage: stage,
					start: set.start,
					end: set.end,
					startMin: timeToMinutes(set.start),
					endMin: timeToMinutes(set.end),
					venue: venue,
				});
			}
		});
	});

	// Check each set against others for conflicts
	for (let i = 0; i < favoriteSets.length; i++) {
		for (let j = i + 1; j < favoriteSets.length; j++) {
			const set1 = favoriteSets[i];
			const set2 = favoriteSets[j];

			if (set1.startMin < set2.endMin && set1.endMin > set2.startMin) {
				conflicts.push({
					day: day,
					artist1: set1.artist,
					artist2: set2.artist,
					time1: `${set1.start}-${set1.end}`,
					time2: `${set2.start}-${set2.end}`,
					stage1: set1.stage,
					stage2: set2.stage,
				});
			}
		}
	}

	return conflicts;
}

/**
 * Find conflicts between favorite artists in different venues on the same day
 */
function findCrossVenueConflicts() {
	const conflicts = [];
	const commonDays = ["friday", "saturday", "sunday"]; // Days that both venues operate

	commonDays.forEach((day) => {
		// Skip if either venue doesn't have data for this day
		if (
			!state.data.arena[day] ||
			!state.data.districtX ||
			!state.data.districtX[day]
		)
			return;

		// Get all favorite sets from Arena
		const arenaFavorites = [];
		Object.keys(state.data.arena[day]).forEach((stage) => {
			if (!Array.isArray(state.data.arena[day][stage])) return;

			state.data.arena[day][stage].forEach((set) => {
				if (
					state.favoriteArtists.includes(set.artist) &&
					set.start &&
					set.end
				) {
					arenaFavorites.push({
						artist: set.artist,
						stage: stage,
						start: set.start,
						end: set.end,
						startMin: timeToMinutes(set.start),
						endMin: timeToMinutes(set.end),
						venue: "Arena",
					});
				}
			});
		});

		// Get all favorite sets from District X
		const districtXFavorites = [];
		Object.keys(state.data.districtX[day]).forEach((stage) => {
			if (!Array.isArray(state.data.districtX[day][stage])) return;

			state.data.districtX[day][stage].forEach((set) => {
				if (
					state.favoriteArtists.includes(set.artist) &&
					set.start &&
					set.end
				) {
					districtXFavorites.push({
						artist: set.artist,
						stage: stage,
						start: set.start,
						end: set.end,
						startMin: timeToMinutes(set.start),
						endMin: timeToMinutes(set.end),
						venue: "District X",
					});
				}
			});
		});

		// Check for overlaps between Arena and District X
		arenaFavorites.forEach((arenaSet) => {
			districtXFavorites.forEach((districtSet) => {
				if (
					arenaSet.startMin < districtSet.endMin &&
					arenaSet.endMin > districtSet.startMin
				) {
					conflicts.push({
						day: day,
						artist1: arenaSet.artist,
						artist2: districtSet.artist,
						time1: `${arenaSet.start}-${arenaSet.end}`,
						time2: `${districtSet.start}-${districtSet.end}`,
						stage1: arenaSet.stage,
						stage2: districtSet.stage,
						venue1: "Arena",
						venue2: "District X",
					});
				}
			});
		});
	});

	return conflicts;
}
