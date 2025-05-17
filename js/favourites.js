/**
 * Favorites Module
 * Handles favorites management, storage, and conflict detection
 */

import {state} from "./core.js";
import {saveToStorage, loadFromStorage} from "./storage.js";
import {timeToMinutes, formatTimeDisplay} from "./utils.js";
import {showDay, showDistrictXDay, showConflictAlert} from "./ui.js";

// Constants for storage
const FAVORITES_KEY = "downloadFestivalFavorites";
const FAVORITES_FILTER_KEY = "downloadFestivalFavoritesFilter";

/**
 * Save the current favorites to storage
 */
export function saveFavorites() {
	// Collect all artists marked as favorites in the UI
	const favorites = [];
	document
		.querySelectorAll('.heart-icon svg[fill="#06b6d4"]')
		.forEach((heart) => {
			favorites.push(heart.closest(".heart-icon").dataset.artist);
		});

	// Update application state
	state.favoriteArtists = favorites;

	// Save to storage
	saveToStorage(FAVORITES_KEY, favorites);

	// Close modal
	document.getElementById("favorites-modal").classList.add("hidden");

	// Refresh the schedule and check for conflicts
	showDay(state.currentDay);
	checkForConflicts();
}

/**
 * Load favorites from storage
 */
export function loadFavorites() {
	const favorites = loadFromStorage(FAVORITES_KEY);

	if (favorites) {
		state.favoriteArtists = favorites;
	}

	// ADDED: Load favorites filter state
	const filterState = loadFromStorage(FAVORITES_FILTER_KEY);
	console.log("Loading filter state from storage:", filterState);

	// Make sure we treat it as a proper boolean
	state.showFavoritesOnly = filterState === true;
	console.log("Set state.showFavoritesOnly to:", state.showFavoritesOnly);

	// Update toggle UI to match state
	const desktopToggle = document.getElementById(
		"global-favorites-toggle-desktop"
	);
	const mobileToggle = document.getElementById(
		"global-favorites-toggle-mobile"
	);

	if (desktopToggle) {
		console.log("Setting desktop toggle to:", state.showFavoritesOnly);
		desktopToggle.checked = state.showFavoritesOnly;
	}

	if (mobileToggle) {
		console.log("Setting mobile toggle to:", state.showFavoritesOnly);
		mobileToggle.checked = state.showFavoritesOnly;
	}

	// Make sure to re-render with current filter state
	showDay(state.currentDay);

	// Check for conflicts after a short delay
	setTimeout(checkForConflicts, 1000);
}

/**
 * Toggle favorite status for an artist
 * @param {string} artist - Artist name
 * @param {Element} svg - SVG heart icon element
 */
export function toggleFavorite(artist, svg) {
	const isFavorite = svg.getAttribute("fill") === "#06b6d4";

	if (isFavorite) {
		// Remove from favorites
		svg.setAttribute("fill", "none");
		svg.setAttribute("stroke", "currentColor");

		// Update state
		state.favoriteArtists = state.favoriteArtists.filter(
			(a) => a !== artist
		);
	} else {
		// Add to favorites
		svg.setAttribute("fill", "#06b6d4");
		svg.setAttribute("stroke", "none");

		// Update state
		if (!state.favoriteArtists.includes(artist)) {
			state.favoriteArtists.push(artist);
		}
	}
}

/**
 * Show or hide only favorite artists in the schedule
 */
export function showFavoritesOnly(show) {
	console.log("showFavoritesOnly called with:", show);

	// Ensure it's a boolean
	show = show === true;

	// Update application state
	state.showFavoritesOnly = show;
	console.log("Updated state.showFavoritesOnly:", state.showFavoritesOnly);

	// Force synchronize toggle UI
	const desktopToggle = document.getElementById(
		"global-favorites-toggle-desktop"
	);
	const mobileToggle = document.getElementById(
		"global-favorites-toggle-mobile"
	);

	if (desktopToggle) desktopToggle.checked = show;
	if (mobileToggle) mobileToggle.checked = show;

	// Save to storage
	saveToStorage(FAVORITES_FILTER_KEY, show);
	console.log("Saved filter state to storage:", show);

	// IMPORTANT: Force re-render of visible artist sets
	const allSetBlocks = document.querySelectorAll(".set-block");
	if (show) {
		// Show only favorites
		allSetBlocks.forEach((block) => {
			const artistName =
				block.querySelector(".text-sm.font-bold")?.innerText;
			if (artistName && !state.favoriteArtists.includes(artistName)) {
				block.style.display = "none";
			} else {
				block.style.display = "";
			}
		});
	} else {
		// Show all artists
		allSetBlocks.forEach((block) => {
			block.style.display = "";
		});
	}

	// Redraw schedules with new filter
	console.log(
		"Redrawing schedules with filter state:",
		state.showFavoritesOnly
	);
	showDay(state.currentDay);
	if (
		state.data.districtX &&
		state.data.districtX[state.districtXCurrentDay]
	) {
		showDistrictXDay(state.districtXCurrentDay);
	}
}

/**
 * Check if a user is visiting for the first time
 */
export function checkFirstVisit() {
	const VISITED_KEY = "downloadFestivalVisited";
	const visited = loadFromStorage(VISITED_KEY) || false;

	if (!visited) {
		// Mark as visited
		saveToStorage(VISITED_KEY, true);

		// Show favorites modal for first-time users
		setTimeout(() => {
			document
				.getElementById("favorites-modal")
				?.classList.remove("hidden");
		}, 1000);
	}
}

/**
 * Check for schedule conflicts between favorite artists
 */
export function checkForConflicts() {
	if (state.favoriteArtists.length < 2) return; // Need at least 2 favorites to have a conflict

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

	// Display conflicts if any are found
	if (conflicts.length > 0) {
		showConflictAlert(conflicts);
	}

	return conflicts;
}

/**
 * Find conflicts between favorite artists within a venue
 * @param {string} venue - 'arena' or 'districtX'
 * @param {string} day - Day to check
 * @param {Array} stages - Stages to check
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
		if (!state.data.arena[day] || !state.data.districtX[day]) return;

		// Get all favorite sets from Arena
		const arenaFavorites = [];
		Object.keys(state.data.arena[day]).forEach((stage) => {
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

/**
 * Find conflicts for a specific artist set
 * This is used for event detail tooltips
 */
export function findConflictsForSet(set, stage, day, venue) {
	if (
		!set ||
		!set.start ||
		!set.end ||
		!state.favoriteArtists.includes(set.artist)
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
					if (!state.favoriteArtists.includes(otherSet.artist))
						return;
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

	// Check for conflicts in other venue on same day
	const otherVenue = venue === "arena" ? "districtX" : "arena";

	if (state.data[otherVenue] && state.data[otherVenue][day]) {
		Object.keys(state.data[otherVenue][day]).forEach((otherStage) => {
			if (Array.isArray(state.data[otherVenue][day][otherStage])) {
				state.data[otherVenue][day][otherStage].forEach((otherSet) => {
					if (!state.favoriteArtists.includes(otherSet.artist))
						return;
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

	return conflicts;
}
