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
	showFavoritesModalPatched,
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
import {setupShareFavoritesButton, tryImportSharedFavorites} from "./js/ui.js";

// Export functions to window for backward compatibility with inline event handlers
window.showDay = showDay;
window.showDistrictXDay = showDistrictXDay;
window.filterStage = filterStage;
window.filterDistrictXStage = filterDistrictXStage;
window.saveFavorites = saveFavorites;
window.showFavoritesModal = showFavoritesModalPatched;
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
	// Only fetch weather if festival is within 16 days from today
	const today = new Date();
	const festStart = new Date("2025-06-11");
	const maxForecastDays = 16;
	const daysToStart = Math.floor((festStart - today) / (1000 * 60 * 60 * 24));
	if (daysToStart > maxForecastDays) {
		console.log(
			"Weather API: Festival is too far in the future for forecast"
		);
		return null;
	}
	const start = "2025-06-11";
	const end = "2025-06-15";
	const url = `https://api.open-meteo.com/v1/forecast?latitude=52.8306&longitude=-1.3756&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Europe%2FLondon`;
	const timeoutMs = 5000; // 5 seconds
	let timeoutId;
	let didTimeout = false;
	return await Promise.race([
		(async () => {
			try {
				const res = await fetch(url);
				if (didTimeout) return null;
				if (!res.ok) throw new Error("Weather fetch failed");
				const data = await res.json();
				if (!data.daily || !data.daily.time) {
					console.warn(
						"Weather API returned unexpected structure:",
						data
					);
					return null;
				}
				return data.daily;
			} catch (e) {
				if (didTimeout) {
					console.error("Weather fetch timed out (catch block)");
				} else {
					console.error("Weather fetch error:", e);
				}
				return null;
			}
		})(),
		new Promise((resolve) => {
			timeoutId = setTimeout(() => {
				didTimeout = true;
				console.error("Weather fetch timed out (Promise.race)");
				resolve(null);
			}, timeoutMs);
		}),
	]).then((result) => {
		clearTimeout(timeoutId);
		return result;
	});
}

function renderWeather(forecast) {
	const container = document.getElementById("weather-forecast");
	if (!container) return;
	container.innerHTML = "";
	if (!forecast || !forecast.time) {
		container.innerHTML =
			'<span class="text-sm">Weather forecast will be available closer to the event!</span>';
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
		window.state = state; // Ensure window.state is the same as the imported state

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

		tryImportSharedFavorites();
		// Ensure share button is attached after DOM is fully rendered
		setTimeout(setupShareFavoritesButton, 0);
		// Patch overlays after rendering
		setTimeout(() => {
			window.patchGridForSharedFavorites &&
				window.patchGridForSharedFavorites();
		}, 1000);

		// Show favorites modal after data is loaded, if first visit
		if (state.showFavoritesModalAfterData) {
			setTimeout(() => {
				window.showFavoritesModal();
				state.showFavoritesModalAfterData = false;
			}, 0);
		}

		runPageViewCounter();
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

// --- Simple Page View Counter (local only, unique to device) ---
function runPageViewCounter() {
	const el = document.getElementById("page-views");
	if (!el) {
		console.error("Page view counter: #page-views element not found");
		return;
	}
	const initial = 8 + 59 + 25 + 44 + 34; // 170
	// Generate or retrieve a unique device ID
	let deviceId = localStorage.getItem("pageViewsDeviceId");
	if (!deviceId) {
		deviceId = crypto.randomUUID
			? crypto.randomUUID()
			: Math.random().toString(36).slice(2) + Date.now();
		localStorage.setItem("pageViewsDeviceId", deviceId);
	}
	// Use a key unique to this device
	const key = "pageViewsLocal_" + deviceId;
	let localCount;
	try {
		const stored = localStorage.getItem(key);
		if (stored === null) {
			localCount = initial;
		} else {
			localCount = parseInt(stored, 10) + 1;
		}
		localStorage.setItem(key, localCount);
	} catch (e) {
		console.error("Page view counter localStorage error:", e);
		localCount = initial;
	}
	el.style.display = "block";
	el.style.color = "#f59e42";
	el.style.fontWeight = "bold";
	el.textContent = `Local views (this device): ${localCount}`;
}
