/**
 * Download Festival Set Times - Legacy Script File
 * This file now serves as a compatibility layer for the new modular structure
 */

// Import all modules
import {state, initState} from "./js/core.js";
import {loadData, extractStageNames} from "./js/data.js";
import {
	showDay,
	showDistrictXDay,
	filterStage,
	filterDistrictXStage,
	updateMobileStageText,
	updateMobileDayText,
	populateStageButtons,
	showFavoritesModal,
	updateDistrictXMobileDayText,
	updateDistrictXMobileStageText,
} from "./js/ui.js";
import {
	saveFavorites,
	loadFavorites,
	checkFirstVisit,
	checkForConflicts,
	showFavoritesOnly,
} from "./js/favourites.js";
import {setupEventListeners, setupOutsideClickListeners} from "./js/events.js";
import {
	setupPosterButton,
	generatePersonalizedPoster,
	loadPosterStyles,
} from "./js/poster.js";
import {
	setupDropdowns,
	setupDistrictXDropdownsDirectly,
	populateDistrictXStageDropdown,
	populateArenaStageDropdown,
} from "./js/dropdowns.js";

// Export functions to window for backward compatibility with inline event handlers
window.showDay = showDay;
window.showDistrictXDay = showDistrictXDay;
window.filterStage = filterStage;
window.filterDistrictXStage = filterDistrictXStage;
window.saveFavorites = saveFavorites;
window.showFavoritesModal = showFavoritesModal;
window.generatePersonalizedPoster = generatePersonalizedPoster;
window.updateMobileStageText = updateMobileStageText;
window.updateMobileDayText = updateMobileDayText;
window.updateDistrictXMobileDayText = updateDistrictXMobileDayText;
window.updateDistrictXMobileStageText = updateDistrictXMobileStageText;
window.setupDistrictXDropdownsDirectly = setupDistrictXDropdownsDirectly;
window.populateDistrictXStageDropdown = populateDistrictXStageDropdown;
window.populateArenaStageDropdown = populateArenaStageDropdown;
window.showFavoritesOnly = showFavoritesOnly;

// Initialize application
document.addEventListener("DOMContentLoaded", async function () {
	try {
		// Initialize state
		initState();

		// Load data
		await loadData();

		// Extract stage names for filters
		const stageNames = extractStageNames();

		// Populate UI components
		populateStageButtons(stageNames);
		populateArenaStageDropdown(stageNames);
		populateDistrictXStageDropdown(stageNames);

		// Show initial schedules
		showDay("friday");
		showDistrictXDay("wednesday");

		// Check if this is a first visit
		checkFirstVisit();

		// Load user preferences
		loadFavorites();

		// Check for schedule conflicts
		checkForConflicts();

		// Setup additional UI components
		loadPosterStyles();

		// Set up all event listeners
		setupEventListeners();
		setupOutsideClickListeners();
		setupDropdowns();

		console.log("Download Festival Set Times App initialized successfully");
	} catch (error) {
		console.error("Initialization error:", error);
		document.getElementById(
			"schedule"
		).innerHTML = `<div class="text-red-500 p-4">Failed to load festival data. Please try again later.</div>`;
		document.getElementById(
			"districtx-schedule"
		).innerHTML = `<div class="text-red-500 p-4">Failed to load festival data. Please try again later.</div>`;
	}
});

// For backward compatibility with any code that directly accesses these properties
window.data = state.data;
window.currentDay = state.currentDay;
window.districtXCurrentDay = state.districtXCurrentDay;
window.currentStage = state.currentStage;
window.districtXCurrentStage = state.districtXCurrentStage;
window.favoriteArtists = state.favoriteArtists;
window.showFavoritesOnly = state.showFavoritesOnly;
