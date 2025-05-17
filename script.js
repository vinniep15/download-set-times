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

// --- Download Festival Weather Forecast ---
async function fetchWeather() {
	// Download Festival 2025: 11-15 June 2025 (Wed-Sun)
	const start = "2025-06-11";
	const end = "2025-06-15";
	const url = `https://api.open-meteo.com/v1/forecast?latitude=52.8306&longitude=-1.3756&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe%2FLondon`;
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error("Weather fetch failed");
		const data = await res.json();
		return data.daily;
	} catch (e) {
		return null;
	}
}

function renderWeather(forecast) {
	const container = document.getElementById("weather-forecast");
	if (!container) return;
	container.innerHTML = "";
	if (!forecast || !forecast.time) {
		container.innerHTML =
			'<span class="text-sm">Weather unavailable - this will auto update closer to Download!</span>';
		return;
	}
	const dayLabels = ["Wed", "Thu", "Fri", "Sat", "Sun"];
	for (let i = 0; i < forecast.time.length; i++) {
		const day = dayLabels[i] || forecast.time[i];
		const max = forecast.temperature_2m_max[i];
		const min = forecast.temperature_2m_min[i];
		const rain = forecast.precipitation_sum[i];
		const code = forecast.weathercode[i];
		const icon = getWeatherIcon(code);
		const div = document.createElement("div");
		div.className =
			"flex flex-col items-center bg-gray-900 rounded p-2 min-w-[60px]";
		div.innerHTML = `
			<span class="font-bold text-cyan-400">${day}</span>
			<span class="text-2xl">${icon}</span>
			<span class="text-xs">${max}° / ${min}°C</span>
			<span class="text-xs text-blue-300">${rain}mm</span>
		`;
		container.appendChild(div);
	}
}

function getWeatherIcon(code) {
	// Simple mapping for demo
	if (code === 0) return "☀️";
	if (code < 3) return "🌤️";
	if (code < 45) return "☁️";
	if (code < 60) return "🌦️";
	if (code < 70) return "🌧️";
	if (code < 80) return "⛈️";
	return "❓";
}

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

		const forecast = await fetchWeather();
		renderWeather(forecast);

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
