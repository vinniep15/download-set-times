// core.js - Core application state

import {generateTimeArray} from "./utils.js";
import {loadFromStorage} from "./storage.js";

// Constants
export const FAVORITES_KEY = "downloadFestivalFavorites";
export const FAVORITES_FILTER_KEY = "downloadFestivalFavoritesFilter";
export const VISITED_KEY = "downloadFestivalVisited";

// Application state
export const state = {
	data: {},
	currentDay: "friday",
	districtXCurrentDay: "friday",
	currentStage: "all",
	districtXCurrentStage: "all",
	favoriteArtists: [],
	favoriteSets: [], // <-- ADD THIS LINE
	eventModal: null,
	showFavoritesOnly: false,
	allTimes: generateTimeArray(10, 29),
};

/**
 * Initialize application state from storage
 */
export function initState() {
	// Load favorites from storage
	const storedFavorites = loadFromStorage(FAVORITES_KEY);
	if (storedFavorites) {
		try {
			state.favoriteSets = JSON.parse(storedFavorites);
		} catch {
			state.favoriteSets = [];
		}
		state.favoriteArtists = storedFavorites;
	} else {
		state.favoriteSets = [];
	}

	// Load filter state
	const filterState = loadFromStorage(FAVORITES_FILTER_KEY);
	if (filterState !== null) {
		state.showFavoritesOnly =
			filterState === true || filterState === "true";
	}
}
