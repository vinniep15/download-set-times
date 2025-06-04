/**
 * UI Module
 * Handles all user interface rendering and interactions
 */
import {state} from "./core.js";
import {formatTimeDisplay, timeToMinutes} from "./utils.js";
import {findConflictsForSet} from "./conflicts.js";
import {saveFavorites} from "./favourites.js";
import {generatePersonalizedPoster} from "./poster.js";
import {loadData, extractStageNames} from "./data.js";
import {initState} from "./core.js";
import {setupEventListeners} from "./events.js";
// Import URL shortener functions
import * as urlShortener from "./url-shortener.js";
const {shortenUrl, expandUrl} = urlShortener;

// Track modal state
let eventModal = null;

// --- View Mode Logic ---
const VIEW_MODE_KEY = "view-mode";
function getViewMode() {
	return sessionStorage.getItem(VIEW_MODE_KEY) || "timeline";
}
function setViewMode(mode) {
	sessionStorage.setItem(VIEW_MODE_KEY, mode);
}

// Helper to generate a unique key for a set
function getSetKey(artist, day, stage, start) {
	return `${artist}|${day}|${stage}|${start}`;
}

// Helper: get all people for a setKey
function getPeopleForSet(setKey) {
	return state.favoriteSets
		.filter((fav) => fav.setKey === setKey)
		.map((fav) => fav.person);
}

// Download Festival inspired color palette for person colors
// Use #06b6d4 (cyan-400) instead of the very light blue
const personColors = [
	"#06b6d4", // Cyan (Download/cyan-400)
	"#00bfae", // Teal
	"#2563eb", // Download blue (matches day button)
	"#a259ff", // Purple
	"#ff2d7e", // Magenta
	"#baff00", // Acid Green
	"#ffe600", // Yellow
	"#ffffff", // White
	"#ff7f50", // Coral (for extra contrast)
];

// Assign each person a unique color from the palette, cycling only if needed
const personColorMap = {};
function getColorForPerson(person) {
	if (!personColorMap[person]) {
		// Assign next unused color
		const usedColors = Object.values(personColorMap);
		const available = personColors.find((c) => !usedColors.includes(c));
		personColorMap[person] =
			available || personColors[usedColors.length % personColors.length];
	}
	return personColorMap[person];
}

// --- Store and load current user name ---
const CURRENT_PERSON_ID = "__current__";

function getCurrentPerson() {
	if (state.currentPersonId) return state.currentPersonId;
	const stored = localStorage.getItem("downloadFestivalCurrentPersonId");
	if (stored) {
		state.currentPersonId = stored;
		return stored;
	}
	// Fallback to special id
	return CURRENT_PERSON_ID;
}
function setCurrentPersonId() {
	state.currentPersonId = CURRENT_PERSON_ID;
	localStorage.setItem("downloadFestivalCurrentPersonId", CURRENT_PERSON_ID);
}
function setCurrentPersonName(name) {
	state.currentPersonName = name;
	localStorage.setItem("downloadFestivalCurrentPersonName", name);
}
function getCurrentPersonName() {
	if (state.currentPersonName) return state.currentPersonName;
	const stored = localStorage.getItem("downloadFestivalCurrentPersonName");
	if (stored) {
		state.currentPersonName = stored;
		return stored;
	}
	return "You";
}

// Helper to get the current user's person id
function getCurrentPersonId() {
	if (state.currentPersonId) return state.currentPersonId;
	const stored = localStorage.getItem("downloadFestivalCurrentPersonId");
	if (stored) {
		state.currentPersonId = stored;
		return stored;
	}
	return "__current__";
}

// --- FIX: Move createArtistRow to module scope so it is accessible everywhere ---
function createArtistRow(set, day, stage) {
	const artistDiv = document.createElement("div");
	artistDiv.className = "flex flex-shrink-0 mb-2";
	const setKey = getSetKey(set.artist, day, stage, set.start);
	// Heart icon button
	const heartBtn = document.createElement("button");
	heartBtn.className = "heart-icon mr-2";
	heartBtn.dataset.setkey = setKey;
	const isFavorite = getPeopleForSetDisplay(setKey).includes("You");
	heartBtn.innerHTML = `
		<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" fill=\"${
			isFavorite ? "#06b6d4" : "none"
		}\" viewBox=\"0 0 24 24\" stroke=\"${
		isFavorite ? "none" : "currentColor"
	}\" stroke-width=\"1.5\">
			<path d=\"M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>
		</svg>
	`;
	heartBtn.addEventListener("click", function (e) {
		e.stopPropagation();
		// Toggle favorite for 'You'
		const idx = state.favoriteSets.findIndex(
			(fav) => fav.setKey === setKey && fav.person === "You"
		);
		if (idx === -1) {
			state.favoriteSets.push({setKey, person: "You"});
		} else {
			state.favoriteSets.splice(idx, 1);
		}
		saveFavorites();
		showFavoritesModalWithActiveDay(day);
	});
	artistDiv.appendChild(heartBtn);
	// Artist name
	const nameSpan = document.createElement("span");
	nameSpan.className = "text-sm flex-grow";
	nameSpan.textContent = set.artist;
	artistDiv.appendChild(nameSpan);
	return artistDiv;
}

// Update: Use state.favoriteSets instead of state.favoriteArtists
if (!state.favoriteSets) state.favoriteSets = [];

/**
 * Render the schedule for a specific day in the Arena
 * @param {string} day - The day to display (friday, saturday, sunday)
 */
function showDayPatched(day) {
	if (
		!state.data.arena[day] ||
		Object.keys(state.data.arena[day]).length === 0
	) {
		console.warn(`showDay called for non-arena day: ${day}`);
		return;
	}
	state.currentDay = day;
	const stages = Object.keys(state.data.arena[day]);
	const stageButtons = document.getElementById("stage-buttons");
	stageButtons.innerHTML =
		`<button onclick="filterStage('all')" class="stage-btn px-4 py-2 rounded ${
			state.currentStage === "all" ? "active-btn" : "bg-gray-700"
		}">All Stages</button>` +
		stages
			.map(
				(stage) => `
			<button onclick="filterStage('${stage}')" class="stage-btn px-4 py-2 rounded ${
					state.currentStage === stage ? "active-btn" : "bg-gray-700"
				}">${stage}</button>
		`
			)
			.join("");
	const container = document.getElementById("schedule");
	container.innerHTML = "";
	const viewMode = getViewMode();
	if (viewMode === "timeline") {
		// Timeline view (original)
		const header = document.createElement("div");
		header.className =
			"flex sticky top-0 z-10 bg-black border-b border-gray-700 time-header";
		header.innerHTML =
			`<div class="w-40 flex-shrink-0"></div>` +
			state.allTimes
				.map((t) => {
					const [h, m] = t.split(":").map(Number);
					const isNextDay = h >= 0 && h < 6;
					return `<div class="time-slot text-sm text-center py-2 ${
						isNextDay ? "bg-gray-900 text-yellow-400" : ""
					}">${isNextDay ? "(+1) " : ""}${t}</div>`;
				})
				.join("");
		container.appendChild(header);
		stages.forEach((stage) =>
			renderStageRow(container, day, stage, "arena")
		);
		updateDaySelection(day);
		filterStage(state.currentStage);
	} else {
		// List view
		renderArenaListView(day);
	}
}
export {showDayPatched as showDay};

/**
 * Render a single stage row with all its events
 */
function renderStageRow(container, day, stage, venue) {
	const row = document.createElement("div");
	row.className = "flex items-stretch relative stage-row";
	row.setAttribute("data-stage", stage);

	row.innerHTML =
		`<div class="w-40 text-lg font-semibold border-r border-gray-700 pr-2 flex-shrink-0 stage-name">${stage}</div>` +
		state.allTimes
			.map(
				() =>
					`<div class="time-slot border-r border-gray-700 h-full"></div>`
			)
			.join("");

	// Filter sets if necessary
	const setsToShow = state.showFavoritesOnly
		? state.data[venue][day][stage].filter((set) => {
				const setKey = getSetKey(set.artist, day, stage, set.start);
				return state.favoriteSets.some((fav) => fav.setKey === setKey);
		  })
		: state.data[venue][day][stage];

	// Render each set
	setsToShow.forEach((set) => {
		if (!set.start || !set.end) return; // Skip entries without times
		const block = createEventBlock(set, stage, day, venue);
		row.appendChild(block);
	});

	container.appendChild(row);
}

/**
 * Create an event block element for the schedule
 */
function createEventBlock(set, stage, day, venue) {
	// Calculate positions
	const startMin = timeToMinutes(set.start);
	const endMin = timeToMinutes(set.end);
	const dayStart = timeToMinutes("10:30");

	// Fixed pixel values
	const slotWidth = 60;
	const nameColWidth = 160;

	// Calculate position
	let left = ((startMin - dayStart) / 15) * slotWidth;
	let width = ((endMin - startMin) / 15) * slotWidth;

	// Handle edge cases
	if (left < 0) left = 0;
	if (width < 80) width = 80;
	if (width > 300) width = 300;
	width = width - 2;

	// Create block
	const block = document.createElement("div");
	block.className = "set-block";
	block.style.left = `${left + nameColWidth}px`;
	block.style.width = `${width}px`;
	block.style.top = `10px`;

	setupBlockHoverEvents(block, set, stage, day, venue);

	// Check for favorite status and conflicts
	const setKey = getSetKey(set.artist, day, stage, set.start);
	const isFavorite = state.favoriteSets.some(
		(fav) => fav.setKey === setKey && fav.person === "You"
	);
	const hasConflict =
		isFavorite && checkForSetConflict(set, stage, day, venue);

	// Apply styling based on status
	stylizeBlock(block, isFavorite, hasConflict, setKey);

	// Add artist name
	const artistName = document.createElement("div");
	artistName.className = "text-sm font-bold";
	artistName.innerText = set.artist;
	block.appendChild(artistName);

	// Add heart icon for favoriting
	const heartBtn = document.createElement("button");
	heartBtn.className = "heart-icon mr-2 absolute top-1 left-1 z-10";
	heartBtn.dataset.setkey = setKey;
	heartBtn.style.background = "none";
	heartBtn.style.border = "none";
	heartBtn.style.padding = "0";
	heartBtn.innerHTML = `
		<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" fill=\"${
			isFavorite ? "#06b6d4" : "none"
		}\" viewBox=\"0 0 24 24\" stroke=\"${
		isFavorite ? "none" : "currentColor"
	}\" stroke-width=\"1.5\">
			<path d=\"M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>
		</svg>
	`;
	heartBtn.addEventListener("click", function (e) {
		e.stopPropagation();
		e.preventDefault(); // Prevent triggering parent click/hover
		if (typeof window.toggleFavoriteSet === "function") {
			window.toggleFavoriteSet(setKey, heartBtn.querySelector("svg"));
		} else {
			// Fallback: legacy inline logic
			const idx = state.favoriteSets.findIndex(
				(fav) => fav.setKey === setKey && fav.person === "You"
			);
			if (idx === -1) {
				state.favoriteSets.push({setKey, person: "You"});
			} else {
				state.favoriteSets.splice(idx, 1);
			}
			saveFavorites();
			// Re-render both main grid and modal if open
			if (
				document.getElementById("favorites-modal") &&
				!document
					.getElementById("favorites-modal")
					.classList.contains("hidden")
			) {
				const activeTab = document.querySelector(".day-tab.active-tab");
				const activeDay = activeTab ? activeTab.dataset.day : day;
				showFavoritesModalWithActiveDay(activeDay);
			}
			// Always re-render the main grid
			if (venue === "arena") {
				showDay(day);
			} else {
				showDistrictXDay(day);
			}
		}
	});

	let heartTouchStartX = 0;
	let heartTouchStartY= 0;
	const TOUCH_MOVE_THRESHOLD = 15;

	// Remove heartBtn from pointer/touch event bubbling for mobile
	heartBtn.addEventListener(
		"touchstart",
		function (e) {
			heartTouchStartX = e.touches[0].clientX;
			heartTouchStartY = e.touches[0].clientY;
		},
		{passive: true}
	);
	heartBtn.addEventListener(
		"touchend",
		function (e) {
			const moveX = Math.abs(e.changedTouches[0].clientX - hearTouchStartX);
			const moveY = Math.abs(e.changedTouches[0].clientY - hearTouchStartY);
			if (moveX < TOUCH_MOVE_THRESHOLD && moveY < TOUCH_MOVE_THRESHOLD) {
				e.preventDefault();
				e.stopPropagation();
				if (typeof window.toggleFavoriteSet === "function") {
					window.toggleFavoriteSet(setKey, heartBtn.querySelector("svg"));
				} else {
					// Fallback: legacy inline logic
					const idx = state.favoriteSets.findIndex(
						(fav) => fav.setKey === setKey && fav.person === "You"
					);
					if (idx === -1) {
						state.favoriteSets.push({setKey, person: "You"});
					} else {
						state.favoriteSets.splice(idx, 1);
					}
					saveFavorites();
					// Re-render both main grid and modal if open
					if (
						document.getElementById("favorites-modal") &&
						!document
							.getElementById("favorites-modal")
							.classList.contains("hidden")
					) {
						const activeTab = document.querySelector(
							".day-tab.active-tab"
						);
						const activeDay = activeTab ? activeTab.dataset.day : day;
						showFavoritesModalWithActiveDay(activeDay);
					}
					// Always re-render the main grid
					if (venue === "arena") {
						showDay(day);
					} else {
						showDistrictXDay(day);
					}
				}
			}
		},
		{passive: false}
	);
	block.appendChild(heartBtn);

	// Apply animation
	if (state.showFavoritesOnly) {
		setTimeout(() => block.classList.add("fade-in"), startMin % 50);
	} else {
		block.classList.add("fade-in");
	}

	// Add data attributes for positioning
	block.dataset.start = startMin;
	block.dataset.end = endMin;
	block.dataset.stage = stage;

	// Add tooltip for people
	const people = getPeopleForSetDisplay(setKey);
	if (people.length > 0) {
		block.addEventListener("mouseenter", function () {
			showPeopleTooltip(block, people);
		});
		block.addEventListener("mouseleave", function () {
			hidePeopleTooltip();
		});
		// Touch/tap for mobile
		block.addEventListener(
			"touchstart",
			function (e) {
				showPeopleTooltip(block, people);
			},
			{passive: true}
		);
		block.addEventListener("touchend", function (e) {
			setTimeout(hidePeopleTooltip, 500);
		});
	}

	return block;
}

// Tooltip helpers
let peopleTooltip = null;
function showPeopleTooltip(block, people) {
	hidePeopleTooltip();
	peopleTooltip = document.createElement("div");
	peopleTooltip.className = "people-tooltip";
	peopleTooltip.style.position = "absolute";
	peopleTooltip.style.zIndex = 9999;
	peopleTooltip.style.background = "#222";
	peopleTooltip.style.color = "#fff";
	peopleTooltip.style.padding = "6px 12px";
	peopleTooltip.style.borderRadius = "6px";
	peopleTooltip.style.fontSize = "13px";
	peopleTooltip.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
	peopleTooltip.innerHTML =
		'<div class="mb-1 font-semibold">Who\'s going:</div>' +
		people
			.map(
				(p) =>
					`<span style="display:inline-block;margin-right:8px;padding:2px 8px;border-radius:4px;background:${getColorForPerson(
						p
					)};color:#fff;">${p}</span>`
			)
			.join("");
	document.body.appendChild(peopleTooltip);
	const rect = block.getBoundingClientRect();
	peopleTooltip.style.left = rect.left + window.scrollX + "px";
	peopleTooltip.style.top =
		rect.top + window.scrollY - peopleTooltip.offsetHeight - 8 + "px";
}
function hidePeopleTooltip() {
	if (peopleTooltip && peopleTooltip.parentNode)
		peopleTooltip.parentNode.removeChild(peopleTooltip);
	peopleTooltip = null;
}

/**
 * Apply appropriate styling to blocks based on favorite status
 */
function stylizeBlock(block, isFavorite, hasConflict, setKey) {
	const people = getPeopleForSetDisplay(setKey);
	if (people.length === 0) {
		block.style.backgroundColor = "";
		block.style.border = "";
	} else if (people.length === 1) {
		block.style.backgroundColor = getColorForPerson(people[0]) + "22"; // light background
		block.style.border = `2px solid ${getColorForPerson(people[0])}`;
	} else {
		// Multiple people: use a gradient border
		const colors = people.map(getColorForPerson);
		block.style.background = `linear-gradient(90deg, ${colors
			.map((c, i) => `${c} ${(i / colors.length) * 100}%`)
			.join(", ")})`;
		block.style.border = `2px solid transparent`;
	}
	if (hasConflict) {
		block.style.backgroundColor = "#dc2626"; // Red for conflicts
		block.style.border = "3px solid #fff";
		block.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.7)";
	} else if (isFavorite) {
		block.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.7)";
	}
}

/**
 * Check if a set has conflicts with other favorites
 */
function checkForSetConflict(set, stage, day, venue) {
	const startMin = timeToMinutes(set.start);
	const endMin = timeToMinutes(set.end);
	const setKey = getSetKey(set.artist, day, stage, set.start);

	// Check conflicts within same venue
	const sameVenueStages = Object.keys(state.data[venue][day]);
	for (const otherStage of sameVenueStages) {
		if (otherStage === stage) continue;

		for (const otherSet of state.data[venue][day][otherStage]) {
			const otherSetKey = getSetKey(
				otherSet.artist,
				day,
				otherStage,
				otherSet.start
			);
			if (!state.favoriteSets.some((fav) => fav.setKey === otherSetKey))
				continue;
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
				const otherSetKey = getSetKey(
					otherSet.artist,
					day,
					otherStage,
					otherSet.start
				);
				if (
					!state.favoriteSets.some(
						(fav) => fav.setKey === otherSetKey
					)
				)
					continue;
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
 * Update the selected day in the UI
 */
function updateDaySelection(day) {
	// Update day buttons
	document.querySelectorAll(".day-btn").forEach((btn) => {
		btn.classList.remove("active-btn");
		btn.classList.add("bg-gray-700");
	});

	const activeBtn = Array.from(document.querySelectorAll(".day-btn")).find(
		(btn) => btn.textContent.trim().toLowerCase() === day
	);

	if (activeBtn) {
		activeBtn.classList.add("active-btn");
		activeBtn.classList.remove("bg-gray-700");
	}

	// Update mobile day display
	updateMobileDayText(day.charAt(0).toUpperCase() + day.slice(1));
}

/**
 * Update the stage filter display
 */
export function filterStage(stage) {
	state.currentStage = stage;

	// Reset styling for all buttons
	document.querySelectorAll(".stage-btn").forEach((btn) => {
		btn.classList.remove("active-btn");
		btn.classList.add("bg-gray-700");
	});

	// Find and activate the correct button
	const activeStageBtn = Array.from(
		document.querySelectorAll(".stage-btn")
	).find(
		(btn) =>
			btn.textContent.trim() ===
			(stage === "all"
				? "All Stages"
				: stage.charAt(0).toUpperCase() + stage.slice(1))
	);

	if (activeStageBtn) {
		activeStageBtn.classList.add("active-btn");
		activeStageBtn.classList.remove("bg-gray-700");
	}

	// Show/hide rows based on filter
	document.querySelectorAll(".stage-row").forEach((row) => {
		row.style.display =
			stage === "all" || row.getAttribute("data-stage") === stage
				? "flex"
				: "none";
	});

	// Update mobile UI
	const stageName =
		stage === "all"
			? "All Stages"
			: stage.charAt(0).toUpperCase() +
			  stage.slice(1).replace(/\bstage\b/i, "Stage");

	updateMobileStageText(stageName);
}

/**
 * Show District X schedule for a specific day
 */
export function showDistrictXDay(day) {
	state.districtXCurrentDay = day;

	// Update button styling using data-day attribute for reliable matching
	document.querySelectorAll(".districtx-day-btn").forEach((btn) => {
		if ((btn.dataset.day || btn.textContent.trim().toLowerCase()) === day) {
			btn.classList.add("active-btn");
			btn.classList.remove("bg-gray-700");
		} else {
			btn.classList.remove("active-btn");
			btn.classList.add("bg-gray-700");
		}
	});

	// Show "coming soon" if no data
	if (
		!state.data.districtX ||
		!state.data.districtX[day] ||
		Object.keys(state.data.districtX[day]).length === 0
	) {
		showComingSoonMessage(day);
		return;
	}

	// Always reset stage filter to 'all' when changing day
	state.districtXCurrentStage = "all";

	renderDistrictXSchedule(day);

	// After rendering, ensure the 'All Stages' button gets the active class
	setTimeout(() => {
		document
			.querySelectorAll("#districtx-stage-buttons .stage-btn")
			.forEach((btn) => {
				if (btn.textContent.trim().toLowerCase() === "all stages") {
					btn.classList.add("active-btn");
					btn.classList.remove("bg-gray-700");
				} else {
					btn.classList.remove("active-btn");
					btn.classList.add("bg-gray-700");
				}
			});
		filterDistrictXStage(state.districtXCurrentStage);
	}, 0);
}

/**
 * Display a "coming soon" message when no data is available
 */
function showComingSoonMessage(day) {
	document.getElementById("districtx-schedule").innerHTML = `
    <div class="bg-gray-800 rounded-lg p-8 text-center">
      <p class="text-xl font-bold text-cyan-500 mb-2">Coming Soon!</p>
      <p class="text-gray-300">District X lineup for ${day} will be available closer to the event.</p>
    </div>`;
}

/**
 * Render the District X schedule for a day
 */
function renderDistrictXSchedule(day) {
	const stages = Object.keys(state.data.districtX[day]);

	// Create stage filter buttons
	renderDistrictXStageButtons(stages);

	// Render the schedule
	const container = document.getElementById("districtx-schedule");
	container.innerHTML = "";

	// Add header row
	const header = createTimeHeaderRow();
	container.appendChild(header);

	// Determine view mode
	const viewMode = getViewMode();
	if (viewMode === "list") {
		// List view
		renderDistrictXListView(day);
	} else {
		// Timeline view (original)
		stages.forEach((stage) =>
			renderStageRow(container, day, stage, "districtX")
		);
	}
}

/**
 * --- District X List View Renderer ---
 */
function renderDistrictXListView(day) {
	const container = document.getElementById("districtx-schedule");
	container.innerHTML = "";
	const stages = Object.keys(state.data.districtX[day]);
	let allSets = [];
	stages.forEach((stage) => {
		const sets = state.data.districtX[day][stage].map((set) => ({
			...set,
			stage,
		}));
		allSets = allSets.concat(sets);
	});
	if (state.showFavoritesOnly) {
		allSets = allSets.filter((set) => {
			const setKey = getSetKey(set.artist, day, set.stage, set.start);
			return state.favoriteSets.some((fav) => fav.setKey === setKey);
		});
	}
	const setsByHour = {};
	allSets.forEach((set) => {
		if (!set.start) return;
		const hour = set.start.split(":")[0];
		if (!setsByHour[hour]) setsByHour[hour] = [];
		setsByHour[hour].push(set);
	});
	const sortedHours = Object.keys(setsByHour).sort((a, b) => a - b);
	sortedHours.forEach((hour) => {
		const hourBlock = document.createElement("div");
		hourBlock.className = "mb-4";
		hourBlock.innerHTML = `<div class=\"font-bold text-cyan-400 text-lg mb-2\">${hour}:00</div>`;
		setsByHour[hour].forEach((set) => {
			const setKey = getSetKey(set.artist, day, set.stage, set.start);
			const isFavorite = state.favoriteSets.some(
				(fav) => fav.setKey === setKey
			);
			const hasConflict = checkForSetConflict(
				set,
				set.stage,
				day,
				"districtX"
			);
			const div = document.createElement("div");
			div.className =
				"flex items-center gap-3 bg-gray-900 rounded p-2 mb-1 relative";
			if (isFavorite) {
				div.classList.add("favorite-list-item");
			}
			if (hasConflict) {
				div.classList.add("conflict-list-item");
			}
			div.innerHTML = `
				<span class=\"font-semibold text-white\">${set.artist}</span>
				<span class=\"text-xs text-gray-400\">${set.stage}</span>
				<span class=\"text-xs text-cyan-300\">${set.start} - ${set.end}</span>
				${
					isFavorite
						? `<span class=\"ml-2 text-cyan-400\" title=\"Favorite\">` +
						  `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" viewBox=\"0 0 16 16\">` +
						  `<path d=\"m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z\"/>` +
						  `</svg></span>`
						: ""
				}
				${
					hasConflict
						? '<span class="ml-2 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded" title="Schedule Clash">CLASH</span>'
						: ""
				}
			`;
			hourBlock.appendChild(div);
		});
		container.appendChild(hourBlock);
	});
}

/**
 * Create the time header row for schedules
 */
function createTimeHeaderRow() {
	const header = document.createElement("div");
	header.className =
		"flex sticky top-0 z-10 bg-black border-b border-gray-700 time-header";
	header.innerHTML =
		`<div class="w-40 flex-shrink-0"></div>` +
		state.allTimes
			.map((t) => {
				const [h, m] = t.split(":").map(Number);
				const isNextDay = h >= 0 && h < 6;
				return `<div class="time-slot text-sm text-center py-2 ${
					isNextDay ? "bg-gray-900 text-yellow-400" : ""
				}">${isNextDay ? "(+1) " : ""}${t}</div>`;
			})
			.join("");
	return header;
}

/**
 * Create District X stage filter buttons
 */
function renderDistrictXStageButtons(stages) {
	const stageButtons = document.getElementById("districtx-stage-buttons");

	stageButtons.innerHTML =
		`<button onclick="filterDistrictXStage('all')" class="stage-btn px-4 py-2 rounded ${
			state.districtXCurrentStage === "all" ? "active-btn" : "bg-gray-700"
		}">All Stages</button>` +
		stages
			.map(
				(stage) => `
      <button onclick="filterDistrictXStage('${stage}')" class="stage-btn px-4 py-2 rounded ${
					state.districtXCurrentStage === stage
						? "active-btn"
						: "bg-gray-700"
				}">${stage}</button>
    `
			)
			.join("");
}

/**
 * Filter the District X stages
 */
export function filterDistrictXStage(stage) {
	state.districtXCurrentStage = stage;

	// Update stage button active state
	document
		.querySelectorAll("#districtx-stage-buttons .stage-btn")
		.forEach((btn) => {
			if (
				btn.textContent.trim().toLowerCase() ===
				(stage === "all" ? "all stages" : stage.toLowerCase())
			) {
				btn.classList.add("active-btn");
				btn.classList.remove("bg-gray-700");
			} else {
				btn.classList.remove("active-btn");
				btn.classList.add("bg-gray-700");
			}
		});

	// Show/hide based on filter
	document
		.querySelectorAll("#districtx-schedule .stage-row")
		.forEach((row) => {
			row.style.display =
				stage === "all" || row.getAttribute("data-stage") === stage
					? "flex"
					: "none";
		});
}

/**
 * Show event details in a modal
 */
export function showEventDetails(event, set, stage, day, venue, isMobile) {
	// Hide any existing modal
	hideEventDetails();

	// Create modal element
	eventModal = document.createElement("div");
	eventModal.className = "event-details-modal";

	if (isMobile) {
		eventModal.classList.add("mobile");
	}

	// Defensive: if event or event.currentTarget is null, do not try to get bounding rect
	let rect = {top: 0, left: 0, width: 0, height: 0};
	let scrollTop = window.scrollY || document.documentElement.scrollTop;
	let scrollLeft = window.scrollX || document.documentElement.scrollLeft;
	if (event && event.currentTarget) {
		rect = event.currentTarget.getBoundingClientRect();
	}

	// Find conflicts
	const conflicts = findConflictsForSet(set, stage, day, venue);

	// Create modal content
	eventModal.innerHTML = createEventModalContent(
		set,
		stage,
		day,
		venue,
		conflicts,
		isMobile
	);
	document.body.appendChild(eventModal);

	// Position the modal
	positionEventModal(eventModal, rect, isMobile, scrollTop, scrollLeft);

	// Add backdrop and close handlers for mobile
	if (isMobile) {
		addMobileModalBackdrop();
	}
}

/**
 * Create the HTML content for event modal
 */
function createEventModalContent(set, stage, day, venue, conflicts, isMobile) {
	// Close button for mobile
	let closeButton = isMobile
		? `<button class="modal-close-btn">×</button>`
		: "";

	// Create conflict HTML if needed
	let conflictHtml = "";
	const setKey = getSetKey(set.artist, day, stage, set.start);
	if (state.favoriteSets.includes(setKey) && conflicts.length > 0) {
		conflictHtml = `
      <div class="conflict-section">
        <h4>Conflicts with ${conflicts.length} favorite${
			conflicts.length > 1 ? "s" : ""
		}:</h4>
        <ul class="conflict-list">
    `;

		conflicts.forEach((conflict) => {
			conflictHtml += `
        <li>
          <span class="conflict-artist">${conflict.artist}</span>
          <div class="conflict-info">
            ${formatTimeDisplay(conflict.start)} - ${formatTimeDisplay(
				conflict.end
			)}
            <span class="conflict-stage">${conflict.stage}</span>
            <span class="conflict-venue">${conflict.venue}</span>
          </div>
        </li>
      `;
		});

		conflictHtml += `
        </ul>
      </div>
    `;
	}

	// Combine all content
	return `
    ${closeButton}
    <div class="arrow"></div>
    <h3>${set.artist}</h3>
    <p><span class="time">${formatTimeDisplay(set.start)} - ${formatTimeDisplay(
		set.end
	)}</span></p>
    <p><span class="stage">${stage}</span></p>
    <p><span class="day text-sm">${
		day.charAt(0).toUpperCase() + day.slice(1)
	}</span> 
       <span class="venue">${
			venue === "arena" ? "Arena" : "District X"
		}</span></p>
    ${conflictHtml}
  `;
}

/**
 * Position the event modal properly
 */
function positionEventModal(modal, rect, isMobile, scrollTop, scrollLeft) {
	if (isMobile) {
		// Center on screen for mobile
		modal.style.left = "50%";
		modal.style.top = "50%";
		modal.style.transform = "translate(-50%, -50%)";
		modal.style.maxWidth = "90%";
		modal.style.width = "320px";
	} else {
		// Desktop positioning
		const modalRect = modal.getBoundingClientRect();

		// Position vertically
		let top = rect.top + scrollTop - modalRect.height - 15;
		let arrowClass = "arrow-bottom";

		if (top < scrollTop + 10) {
			top = rect.bottom + scrollTop + 15;
			arrowClass = "arrow-top";
		}

		// Position horizontally
		let left =
			rect.left + scrollLeft + rect.width / 2 - modalRect.width / 2;

		if (left < scrollLeft + 10) {
			left = scrollLeft + 10;
		} else if (
			left + modalRect.width >
			scrollLeft + window.innerWidth - 10
		) {
			left = scrollLeft + window.innerWidth - modalRect.width - 10;
		}

		modal.style.top = `${top}px`;
		modal.style.left = `${left}px`;
		modal.classList.add(arrowClass);
	}
}

/**
 * Add backdrop and close button handler for mobile modals
 */
function addMobileModalBackdrop() {
	const backdrop = document.createElement("div");
	backdrop.className = "modal-backdrop";
	document.body.appendChild(backdrop);

	// Add close button handler
	const closeBtn = eventModal.querySelector(".modal-close-btn");
	if (closeBtn) {
		closeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			hideEventDetails();
		});
	}
}

/**
 * Hide event details modal
 */
export function hideEventDetails() {
	// Remove backdrop
	const backdrop = document.querySelector(".modal-backdrop");
	if (backdrop) backdrop.remove();

	// Remove modal
	if (eventModal) {
		eventModal.remove();
		eventModal = null;
	}
}

/**
 * Set up hover/click events for schedule blocks
 * @param {HTMLElement} block - The schedule block element
 * @param {Object} set - The event/artist set data
 * @param {string} stage - The stage name
 * @param {string} day - The day name
 * @param {string} venue - The venue name
 */
export function setupBlockHoverEvents(block, set, stage, day, venue) {
	// Check if device is touch-capable
	const isTouchDevice =
		"ontouchstart" in window || navigator.maxTouchPoints > 0;
	let tooltipActive = false;
	let touchStarted = false;

	if (isTouchDevice) {
		// Mobile device - use touch events with proper handling
		block.addEventListener(
			"touchstart",
			(event) => {
				// Mark that touch started on this element to distinguish from scrolling
				touchStarted = true;

				// Don't prevent default immediately as it would stop scrolling
				// but store the initial touch position
				const touchY = event.touches[0].clientY;
				const touchX = event.touches[0].clientX;

				// Store initial position to detect if it's a tap vs scroll
				block.dataset.touchStartY = touchY;
				block.dataset.touchStartX = touchX;
			},
			{passive: true}
		);

		block.addEventListener("touchend", (event) => {
			// Only process if the touch started on this element
			if (!touchStarted) return;
			touchStarted = false;

			// Check if this was a tap vs a scroll
			const touchEndY = event.changedTouches[0].clientY;
			const touchEndX = event.changedTouches[0].clientX;
			const moveY = Math.abs(
				touchEndY - parseFloat(block.dataset.touchStartY)
			);
			const moveX = Math.abs(
				touchEndX - parseFloat(block.dataset.touchStartX)
			);

			// If moved more than 10px, treat as scroll not tap
			if (moveY > 10 || moveX > 10) return;

			event.preventDefault();
			event.stopPropagation();

			// Toggle tooltip
			if (tooltipActive) {
				hideEventDetails();
				tooltipActive = false;
			} else {
				setTimeout(() => {
					showEventDetails(event, set, stage, day, venue, true);
					tooltipActive = true;

					// Add event listener to close when tapping outside
					setTimeout(() => {
						document.addEventListener(
							"touchstart",
							handleOutsideTouch,
							{once: true}
						);
						document.addEventListener("click", handleOutsideTouch, {
							once: true,
						});
					}, 50);
				}, 10);
			}
		});

		// Function to handle touches outside the tooltip
		function handleOutsideTouch(event) {
			if (
				tooltipActive &&
				eventModal &&
				!eventModal.contains(event.target) &&
				!block.contains(event.target)
			) {
				hideEventDetails();
				tooltipActive = false;
			} else if (tooltipActive) {
				// Re-add the listener if we're still showing the tooltip
				setTimeout(() => {
					document.addEventListener(
						"touchstart",
						handleOutsideTouch,
						{once: true}
					);
					document.addEventListener("click", handleOutsideTouch, {
						once: true,
					});
				}, 50);
			}
		}
	} else {
		// Desktop - use hover behavior
		let isHoveringBlock = false;
		let isHoveringModal = false;

		block.addEventListener("mouseenter", (event) => {
			isHoveringBlock = true;
			showEventDetails(event, set, stage, day, venue, false);

			if (eventModal) {
				eventModal.addEventListener("mouseenter", () => {
					isHoveringModal = true;
				});

				eventModal.addEventListener("mouseleave", () => {
					isHoveringModal = false;
					if (!isHoveringBlock) {
						hideEventDetails();
					}
				});
			}
		});

		block.addEventListener("mouseleave", () => {
			isHoveringBlock = false;
			setTimeout(() => {
				if (!isHoveringModal) {
					hideEventDetails();
				}
			}, 100);
		});

		// Add click handler for desktop too (accessibility)
		block.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			showEventDetails(event, set, stage, day, venue, false);
		});
	}

	// Make block focusable for accessibility
	block.setAttribute("tabindex", "0");
	block.setAttribute("role", "button");
	block.setAttribute(
		"aria-label",
		`${set.artist} from ${set.start} to ${set.end} at ${stage}`
	);

	// Keyboard accessibility
	block.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			showEventDetails(event, set, stage, day, venue, false);
		}
	});
}

// --- Arena List View Renderer ---
function renderArenaListView(day) {
	const container = document.getElementById("schedule");
	container.innerHTML = "";
	const stages = Object.keys(state.data.arena[day]);
	// Gather all sets for the day
	let allSets = [];
	stages.forEach((stage) => {
		const sets = state.data.arena[day][stage].map((set) => ({
			...set,
			stage,
		}));
		allSets = allSets.concat(sets);
	});
	// Filter favorites if needed
	if (state.showFavoritesOnly) {
		allSets = allSets.filter((set) => {
			const setKey = getSetKey(set.artist, day, set.stage, set.start);
			return state.favoriteSets.some((fav) => fav.setKey === setKey);
		});
	}
	// Group by hour
	const setsByHour = {};
	allSets.forEach((set) => {
		if (!set.start) return;
		const hour = set.start.split(":")[0];
		if (!setsByHour[hour]) setsByHour[hour] = [];
		setsByHour[hour].push(set);
	});
	const sortedHours = Object.keys(setsByHour).sort((a, b) => a - b);
	// Render
	sortedHours.forEach((hour) => {
		const hourBlock = document.createElement("div");
		hourBlock.className = "mb-4";
		hourBlock.innerHTML = `<div class=\"font-bold text-cyan-400 text-lg mb-2\">${hour}:00</div>`;
		setsByHour[hour].forEach((set) => {
			const setKey = getSetKey(set.artist, day, set.stage, set.start);
			const isFavorite = state.favoriteSets.some(
				(fav) => fav.setKey === setKey
			);
			const hasConflict = checkForSetConflict(
				set,
				set.stage,
				day,
				"arena"
			);
			const div = document.createElement("div");
			div.className =
				"flex items-center gap-3 bg-gray-900 rounded p-2 mb-1 relative";
			if (isFavorite) {
				div.classList.add("favorite-list-item");
			}
			if (hasConflict) {
				div.classList.add("conflict-list-item");
			}
			div.innerHTML = `
				<span class=\"font-semibold text-white\">${set.artist}</span>
				<span class=\"text-xs text-gray-400\">${set.stage}</span>
				<span class=\"text-xs text-cyan-300\">${set.start} - ${set.end}</span>
				${
					isFavorite
						? `<span class=\"ml-2 text-cyan-400\" title=\"Favorite\">` +
						  `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" viewBox=\"0 0 16 16\">` +
						  `<path d=\"m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z\"/>` +
						  `</svg></span>`
						: ""
				}
				${
					hasConflict
						? '<span class="ml-2 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded" title="Schedule Clash">CLASH</span>'
						: ""
				}
			`;
			hourBlock.appendChild(div);
		});
		container.appendChild(hourBlock);
	});
}

/**
 * Update mobile stage display text
 */
export function updateMobileStageText(text) {
	const mobileText = document.getElementById("current-stage-mobile");
	if (mobileText) {
		if (text !== "All Stages") {
			text = text.replace(/\bstage\b/i, "Stage");
		}
		mobileText.textContent = text;
	}
}

/**
 * Update mobile day display text
 */
export function updateMobileDayText(day) {
	const mobileDay = document.getElementById("current-day-mobile");
	if (mobileDay) mobileDay.textContent = day;
}

/**
 * Populate stage buttons based on available stages
 * @param {Object} stageNames - Object containing arena and districtX stage names
 */
export function populateStageButtons(stageNames) {
	if (!stageNames || typeof stageNames !== "object") {
		return;
	}

	// Get arena stages array from the object
	const arenaStages = stageNames.arena || [];

	// Get the container element
	const stageButtonsContainer = document.getElementById("stage-buttons");
	if (!stageButtonsContainer) return;

	// Clear existing buttons
	stageButtonsContainer.innerHTML = "";

	// Add "All Stages" button
	const allStagesBtn = document.createElement("button");
	allStagesBtn.className =
		"bg-gray-700 px-4 py-2 rounded active-btn stage-btn";
	allStagesBtn.textContent = "All Stages";
	allStagesBtn.onclick = () => filterStage("all");
	stageButtonsContainer.appendChild(allStagesBtn);

	// Add individual stage buttons
	arenaStages.forEach((stage) => {
		// Format stage name for display
		const displayName =
			stage.charAt(0).toUpperCase() +
			stage.slice(1).replace(/\bstage\b/i, "Stage");

		// Create button
		const stageBtn = document.createElement("button");
		stageBtn.className = "bg-gray-700 px-4 py-2 rounded stage-btn";
		stageBtn.textContent = displayName;
		stageBtn.onclick = () => filterStage(stage);

		stageButtonsContainer.appendChild(stageBtn);
	});
}

/**
 * Populate mobile stage dropdown menu
 */
export function populateMobileStageDropdown(stageNames) {
	const dropdown = document.getElementById("stage-dropdown-mobile");
	if (!dropdown) return;

	const menuContainer = dropdown.querySelector('div[role="menu"]');
	if (!menuContainer) return;

	// Clear existing options
	("block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700");
	allButton.setAttribute("role", "menuitem");
	allButton.onclick = function () {
		filterStage("all");
		updateMobileStageText("All Stages");
	};
	allButton.textContent = "All Stages";
	menuContainer.appendChild(allButton);

	// Add stage options
	stageNames.forEach((stage) => {
		const stageName =
			stage.charAt(0).toUpperCase() +
			stage.slice(1).replace(/\bstage\b/i, "Stage");

		const stageButton = document.createElement("button");
		stageButton.className =
			"block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700";
		stageButton.setAttribute("role", "menuitem");
		stageButton.onclick = function () {
			filterStage(stage);
			updateMobileStageText(stageName);
		};
		stageButton.textContent = stageName;
		menuContainer.appendChild(stageButton);
	});
}

/**
 * Show favorites modal with proper event handlers
 */
export function showFavoritesModal() {
	const favoritesModal = document.getElementById("favorites-modal");
	if (!favoritesModal) return;

	favoritesModal.classList.remove("hidden");

	// --- Ensure .space-y-4 content container exists ---
	let contentContainer = favoritesModal.querySelector(".space-y-4");
	if (!contentContainer) {
		contentContainer = document.createElement("div");
		contentContainer.className = "space-y-4";
		// Insert before the Save button row
		const saveRow =
			favoritesModal.querySelector("#save-favorites").parentElement;
		favoritesModal.insertBefore(contentContainer, saveRow);
	}

	// --- Ensure all day content containers exist ---
	["wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day) => {
		if (!document.getElementById(`${day}-artists`)) {
			const dayContent = document.createElement("div");
			dayContent.id = `${day}-artists`;
			dayContent.className = "day-content hidden";
			contentContainer.appendChild(dayContent);
		}
	});

	// --- Capture the currently active day tab before re-render ---
	let activeDay = "friday";
	const prevActiveTab = document.querySelector(".day-tab.active-tab");
	if (prevActiveTab && prevActiveTab.dataset.day) {
		activeDay = prevActiveTab.dataset.day;
	}

	// Clear all day containers
	["wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day) => {
		const dayContainer = document.getElementById(`${day}-artists`);
		if (dayContainer) dayContainer.innerHTML = "";
	});

	// Ensure Wednesday and Thursday tabs are present in the favorites modal if there is District X data for those days
	function ensurePreFestivalDayTabs() {
		const tabScroll = document.getElementById("favorites-day-tabs");
		const contentContainer = document.querySelector(".space-y-4");
		const allDays = [
			"wednesday",
			"thursday",
			"friday",
			"saturday",
			"sunday",
		];

		// Remove all existing .day-tab elements from the scrollable wrapper
		Array.from(tabScroll.querySelectorAll(".day-tab")).forEach((tab) =>
			tab.remove()
		);

		// Ensure content containers exist for all days
		allDays.forEach((day) => {
			if (!document.getElementById(`${day}-artists`)) {
				const dayContent = document.createElement("div");
				dayContent.id = `${day}-artists`;
				dayContent.className = "day-content hidden";
				contentContainer.appendChild(dayContent);
			}
		});

		// Re-create and append tabs in correct order, only if data exists for that day
		allDays.forEach((day) => {
			// Only show Wednesday/Thursday if District X data exists for that day
			if (
				(day === "wednesday" || day === "thursday") &&
				(!state.data.districtX ||
					!state.data.districtX[day] ||
					Object.keys(state.data.districtX[day]).length === 0)
			) {
				return;
			}
			// Only show Friday/Saturday/Sunday if Arena or District X data exists
			if (
				["friday", "saturday", "sunday"].includes(day) &&
				!(
					(state.data.arena &&
						state.data.arena[day] &&
						Object.keys(state.data.arena[day]).length > 0) ||
					(state.data.districtX &&
						state.data.districtX[day] &&
						Object.keys(state.data.districtX[day]).length > 0)
				)
			) {
				return;
			}
			const tab = document.createElement("button");
			tab.className = "day-tab py-2 px-4";
			tab.dataset.day = day;
			tab.textContent =
				day.charAt(0).toUpperCase() +
				day.slice(1) +
				(day === "wednesday" || day === "thursday"
					? " (District X)"
					: "");
			tabScroll.appendChild(tab);
		});
	}

	// Call this before rendering modal content
	ensurePreFestivalDayTabs();

	// Render each day tab content (now including wednesday and thursday if present)
	["wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day) => {
		const dayContainer = document.getElementById(`${day}-artists`);
		if (!dayContainer) return;
		// Arena (only for fri/sat/sun)
		if (
			["friday", "saturday", "sunday"].includes(day) &&
			state.data.arena[day] &&
			Object.keys(state.data.arena[day]).length > 0
		) {
			dayContainer.appendChild(
				createVenueSection(day, "arena", "Arena Bands", "cyan-500")
			);
		}
		// District X (for any day, including wednesday/thursday)
		if (
			state.data.districtX &&
			state.data.districtX[day] &&
			Object.keys(state.data.districtX[day]).length > 0
		) {
			// Always render District X for wednesday/thursday if data exists
			dayContainer.appendChild(
				createVenueSection(
					day,
					"districtX",
					"District X Bands",
					"yellow-500"
				)
			);
		}
	});

	// --- Fix: Set up tab events after rendering ---
	setupFavoritesModalTabEvents();

	// --- Attach heart and Save button event listeners after rendering ---
	setupFavoritesModalEvents();

	// --- Restore the previously active tab and content ---
	const allTabs = document.querySelectorAll(".day-tab");
	let foundActive = false;
	allTabs.forEach((tab) => {
		if (tab.dataset.day === activeDay) {
			tab.classList.add("active-tab");
			foundActive = true;
		} else {
			tab.classList.remove("active-tab");
		}
	});
	["wednesday", "thursday", "friday", "saturday", "sunday"].forEach((day) => {
		const dayContent = document.getElementById(`${day}-artists`);
		if (dayContent) {
			dayContent.classList.toggle("hidden", day !== activeDay);
		}
	});
	// If the previously active tab is not present, default to the first available tab
	if (!foundActive && allTabs.length > 0) {
		allTabs[0].classList.add("active-tab");
		const firstDay = allTabs[0].dataset.day;
		["wednesday", "thursday", "friday", "saturday", "sunday"].forEach(
			(day) => {
				const dayContent = document.getElementById(`${day}-artists`);
				if (dayContent) {
					dayContent.classList.toggle("hidden", day !== firstDay);
				}
			}
		);
	}

	// In showFavoritesModal, after rendering the modal content:
	setupFavoritesModalEvents();
}

// Helper to re-render modal and preserve active day
function showFavoritesModalWithActiveDay(day) {
	// Set the active tab before rendering
	setTimeout(() => {
		const allTabs = document.querySelectorAll(".day-tab");
		allTabs.forEach((tab) => {
			tab.classList.remove("active-tab");
			if (tab.dataset.day === day) {
				tab.classList.add("active-tab");
			}
		});
		["wednesday", "thursday", "friday", "saturday", "sunday"].forEach(
			(d) => {
				const dayContent = document.getElementById(`${d}-artists`);
				if (dayContent) {
					dayContent.classList.toggle("hidden", d !== day);
				}
			}
		);
	}, 0);
	showFavoritesModal();
}

/**
 * Clear the favorites modal content
 */
function clearFavoritesModalContent() {
	document.getElementById("friday-artists").innerHTML = "";
	document.getElementById("saturday-artists").innerHTML = "";
	document.getElementById("sunday-artists").innerHTML = "";
}

/**
 * Populate the main festival days content
 */
function populateMainFestivalDays() {
	["friday", "saturday", "sunday"].forEach((day) => {
		if (
			!state.data.arena[day] ||
			Object.keys(state.data.arena[day]).length === 0
		)
			return;

		const dayContainer = document.getElementById(`${day}-artists`);

		// Arena bands
		const arenaDiv = createVenueSection(
			day,
			"arena",
			"Arena Bands",
			"cyan-500"
		);
		dayContainer.appendChild(arenaDiv);

		// District X bands (if they exist for this day)
		if (
			state.data.districtX &&
			state.data.districtX[day] &&
			Object.keys(state.data.districtX[day]).length > 0
		) {
			const districtXDiv = createVenueSection(
				day,
				"districtX",
				"District X Bands",
				"yellow-500"
			);
			dayContainer.appendChild(districtXDiv);
		}
	});
}

/**
 * Create a venue section for the favorites modal
 */
function createVenueSection(day, venue, title, colorClass) {
	const venueDiv = document.createElement("div");
	venueDiv.className = venue === "arena" ? "mb-6" : "mt-8";
	venueDiv.innerHTML = `<h3 class="text-lg font-bold text-${colorClass} mb-2">${title}</h3>`;

	// Add stages for this venue
	Object.keys(state.data[venue][day]).forEach((stage) => {
		// Skip if no sets in this stage
		if (
			!Array.isArray(state.data[venue][day][stage]) ||
			state.data[venue][day][stage].length === 0
		)
			return;

		const stageDiv = createStageSection(
			stage,
			state.data[venue][day][stage],
			day
		);
		venueDiv.appendChild(stageDiv);
	});

	return venueDiv;
}

/**
 * Create a stage section for the favorites modal
 */
function createStageSection(stage, sets, day) {
	const stageDiv = document.createElement("div");
	stageDiv.className = "mb-4";
	stageDiv.innerHTML = `<h4 class="text-md font-semibold text-gray-300 mb-1">${stage}</h4>`;
	const artistsDiv = document.createElement("div");
	artistsDiv.className = "grid grid-cols-2 gap-2";
	sets.forEach((set) => {
		if (!set.artist) return;
		artistsDiv.appendChild(createArtistRow(set, day, stage));
	});
	stageDiv.appendChild(artistsDiv);
	return stageDiv;
}

/**
 * Add Wednesday and Thursday tabs for District X
 */
function addPreFestivalDayTabs() {
	const tabContainer = document.querySelector(".day-tab").parentElement;

	// Only add tabs if they don't exist yet
	if (!document.querySelector('[data-day="wednesday"]')) {
		// Create tabs
		const wednesdayTab = document.createElement("button");
		wednesdayTab.className = "day-tab py-2 px-4";
		wednesdayTab.dataset.day = "wednesday";
		wednesdayTab.textContent = "Wednesday (District X)";
		tabContainer.appendChild(wednesdayTab);

		const thursdayTab = document.createElement("button");
		thursdayTab.className = "day-tab py-2 px-4";
		thursdayTab.dataset.day = "thursday";
		thursdayTab.textContent = "Thursday (District X)";
		tabContainer.appendChild(thursdayTab);

		// Create content containers
		const contentContainer = document.querySelector(".space-y-4");

		const wednesdayContent = document.createElement("div");
		wednesdayContent.id = "wednesday-artists";
		wednesdayContent.className = "day-content hidden";
		contentContainer.appendChild(wednesdayContent);

		const thursdayContent = document.createElement("div");
		thursdayContent.id = "thursday-artists";
		thursdayContent.className = "day-content hidden";
		contentContainer.appendChild(thursdayContent);

		// Populate content
		["wednesday", "thursday"].forEach((day) => {
			if (!state.data.districtX || !state.data.districtX[day]) return;

			const dayContainer = document.getElementById(`${day}-artists`);
			const venueDiv = createVenueSection(
				day,
				"districtX",
				"District X Bands",
				"yellow-500"
			);
			dayContainer.appendChild(venueDiv);
		});
	}
}

/**
 * Set up event listeners for the favorites modal
 */
function setupFavoritesModalEvents() {
	document.querySelectorAll(".heart-icon").forEach((heartBtn) => {
		heartBtn.addEventListener("click", function (e) {
			e.stopPropagation();
			const setKey = this.dataset.setkey;
			const idx = state.favoriteSets.findIndex(
				(fav) => fav.setKey === setKey && fav.person === "You"
			);
			if (idx === -1) {
				state.favoriteSets.push({setKey, person: "You"});
			} else {
				state.favoriteSets.splice(idx, 1);
			}
			// Find the active day
			const activeTab = document.querySelector(".day-tab.active-tab");
			const activeDay = activeTab ? activeTab.dataset.day : "friday";
			showFavoritesModalWithActiveDay(activeDay);
		});
	});

	// Save button
	const saveBtn = document.getElementById("save-favorites");
	if (saveBtn) {
		const newSaveBtn = saveBtn.cloneNode(true);
		saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
		newSaveBtn.addEventListener("click", () => {
			saveFavorites();
			location.reload();
		});
	}
}

/**
 * Show conflicts alert when schedule conflicts are detected
 */
export function showConflictAlert(conflicts) {
	// Remove any existing alerts
	document.querySelectorAll(".conflict-alert").forEach((el) => el.remove());

	// Create alert container
	const alertDiv = document.createElement("div");
	alertDiv.className =
		"fixed top-20 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm conflict-alert";
	alertDiv.style.opacity = "0";
	alertDiv.style.transition = "opacity 0.3s ease-out";

	// Create header
	const header = document.createElement("div");
	header.className = "flex justify-between items-start mb-2";

	const title = document.createElement("h3");
	title.className = "text-lg font-bold";
	title.textContent = "Schedule Conflicts";

	// Close button
	const closeX = document.createElement("button");
	closeX.className =
		"text-white hover:text-gray-200 font-bold text-xl leading-none -mt-1";
	closeX.textContent = "×";

	const closeAlert = function () {
		alertDiv.style.opacity = "0";
		setTimeout(() => {
			if (document.body.contains(alertDiv)) {
				document.body.removeChild(alertDiv);
			}
		}, 300);
	};

	closeX.addEventListener("click", closeAlert);

	// Assemble header
	header.appendChild(title);
	header.appendChild(closeX);
	alertDiv.appendChild(header);

	// Add description
	const desc = document.createElement("p");
	desc.className = "mb-2";
	desc.textContent =
		"You have scheduling conflicts with your favorite artists:";
	alertDiv.appendChild(desc);

	// Create conflict list
	const list = document.createElement("ul");
	list.className = "list-disc pl-5 mb-3";

	// Add conflicts (up to 5)
	conflicts.forEach((conflict, i) => {
		if (i < 5) {
			const item = document.createElement("li");
			item.className = "mb-1 text-sm";
			item.innerHTML = `<span class="font-bold">${conflict.artist1}</span> (${conflict.time1} at ${conflict.stage1}) 
        and <span class="font-bold">${conflict.artist2}</span> (${conflict.time2} at ${conflict.stage2}) 
        on <span class="capitalize">${conflict.day}</span>`;
			list.appendChild(item);
		}
	});

	// Add "more" indicator if needed
	if (conflicts.length > 5) {
		const moreItem = document.createElement("li");
		moreItem.className = "text-sm";
		moreItem.textContent = `...and ${conflicts.length - 5} more`;
		list.appendChild(moreItem);
	}

	alertDiv.appendChild(list);

	// Add dismiss button
	const btnContainer = document.createElement("div");
	btnContainer.className = "flex justify-end";

	const dismissBtn = document.createElement("button");
	dismissBtn.className =
		"bg-white hover:bg-gray-200 active:bg-gray-300 text-red-600 px-3 py-1 rounded text-sm font-bold";
	dismissBtn.textContent = "Dismiss";
	dismissBtn.addEventListener("click", closeAlert);

	btnContainer.appendChild(dismissBtn);
	alertDiv.appendChild(btnContainer);

	// Add to document and animate in
	document.body.appendChild(alertDiv);

	setTimeout(() => {
		alertDiv.style.opacity = "1";
	}, 10);

	// Auto-close after 15 seconds
	setTimeout(closeAlert, 15000);
}

// --- View selector button event listeners ---
function syncViewModeToggles() {
	const mode = getViewMode();
	const isTimeline = mode === "timeline";

	// Update the hidden checkbox state (keeping for backward compatibility)
	const desktopCheckbox = document.getElementById("view-mode-toggle-desktop");
	const mobileCheckbox = document.getElementById("view-mode-toggle-mobile");
	if (desktopCheckbox) desktopCheckbox.checked = isTimeline;
	if (mobileCheckbox) mobileCheckbox.checked = isTimeline;

	// Update button styling
	const desktopListBtn = document.getElementById("list-view-btn-desktop");
	const desktopTimelineBtn = document.getElementById(
		"timeline-view-btn-desktop"
	);
	const mobileListBtn = document.getElementById("list-view-btn-mobile");
	const mobileTimelineBtn = document.getElementById(
		"timeline-view-btn-mobile"
	);

	if (isTimeline) {
		// Timeline view is active
		if (desktopListBtn) desktopListBtn.classList.remove("bg-cyan-600");
		if (desktopTimelineBtn) desktopTimelineBtn.classList.add("bg-cyan-600");
		if (mobileListBtn) mobileListBtn.classList.remove("bg-cyan-600");
		if (mobileTimelineBtn) mobileTimelineBtn.classList.add("bg-cyan-600");
	} else {
		// List view is active
		if (desktopListBtn) desktopListBtn.classList.add("bg-cyan-600");
		if (desktopTimelineBtn)
			desktopTimelineBtn.classList.remove("bg-cyan-600");
		if (mobileListBtn) mobileListBtn.classList.add("bg-cyan-600");
		if (mobileTimelineBtn)
			mobileTimelineBtn.classList.remove("bg-cyan-600");
	}
}

document.addEventListener("DOMContentLoaded", () => {
	syncViewModeToggles();

	// Set up click handlers for view toggle buttons
	const desktopListBtn = document.getElementById("list-view-btn-desktop");
	const desktopTimelineBtn = document.getElementById(
		"timeline-view-btn-desktop"
	);
	const mobileListBtn = document.getElementById("list-view-btn-mobile");
	const mobileTimelineBtn = document.getElementById(
		"timeline-view-btn-mobile"
	);

	function setToListView() {
		setViewMode("list");
		syncViewModeToggles();
		showDay(state.currentDay || "friday");
		if (
			state.data.districtX &&
			state.data.districtX[state.districtXCurrentDay]
		) {
			showDistrictXDay(state.districtXCurrentDay);
		}
	}

	function setToTimelineView() {
		setViewMode("timeline");
		syncViewModeToggles();
		showDay(state.currentDay || "friday");
		if (
			state.data.districtX &&
			state.data.districtX[state.districtXCurrentDay]
		) {
			showDistrictXDay(state.districtXCurrentDay);
		}
	}

	if (desktopListBtn) desktopListBtn.addEventListener("click", setToListView);
	if (desktopTimelineBtn)
		desktopTimelineBtn.addEventListener("click", setToTimelineView);
	if (mobileListBtn) mobileListBtn.addEventListener("click", setToListView);
	if (mobileTimelineBtn)
		mobileTimelineBtn.addEventListener("click", setToTimelineView);
});

/**
 * Initialize dropdown menu behaviors
 */
export function setupDropdowns() {
	const dropdowns = [
		{
			btnId: "stage-dropdown-btn-mobile",
			menuId: "stage-dropdown-mobile",
		},
		{
			btnId: "day-dropdown-btn-mobile",
			menuId: "day-dropdown-mobile",
		},
	];

	// Track open states
	let openDropdown = null;

	dropdowns.forEach(({btnId, menuId}) => {
		const btn = document.getElementById(btnId);
		const menu = document.getElementById(menuId);
		const chevron = btn?.querySelector("svg");

		if (btn && menu) {
			// Toggle dropdown
			btn.addEventListener("click", (e) => {
				e.stopPropagation();

				// Close any open dropdown
				if (openDropdown && openDropdown !== menu) {
					const openChevron = document
						.getElementById(
							openDropdown.id.replace("dropdown", "dropdown-btn")
						)
						?.querySelector("svg");
					closeDropdown(openDropdown, openChevron);
					openDropdown = null;
				}

				// Toggle this dropdown
				if (menu.classList.contains("hidden")) {
					openDropdown = menu;
					openDropdownMenu(menu, chevron);
				} else {
					closeDropdown(menu, chevron);
					openDropdown = null;
				}
			});

			// Close when option clicked
			menu.querySelectorAll("button[role='menuitem']").forEach(
				(button) => {
					button.addEventListener("click", () => {
						closeDropdown(menu, chevron);
						openDropdown = null;
					});
				}
			);
		}
	});

	// Close dropdowns when clicking outside
	document.addEventListener("click", () => {
		if (openDropdown) {
			const openChevron = document
				.getElementById(
					openDropdown.id.replace("dropdown", "dropdown-btn")
				)
				?.querySelector("svg");
			closeDropdown(openDropdown, openChevron);
			openDropdown = null;
		}
	});
}

/**
 * Open dropdown with animation
 */
function openDropdownMenu(dropdown, chevron) {
	dropdown.classList.remove("hidden");
	dropdown.classList.add("dropdown-open");

	if (chevron) {
		chevron.style.transform = "rotate(180deg)";
		chevron.style.transition = "transform 0.3s ease";
	}
}

/**
 * Close dropdown with animation
 */
function closeDropdown(dropdown, chevron) {
	dropdown.classList.remove("dropdown-open");
	dropdown.classList.add("dropdown-close");

	if (chevron) {
		chevron.style.transform = "rotate(0deg)";
		chevron.style.transition = "transform 0.3s ease";
	}

	// Hide after animation completes
	setTimeout(() => {
		dropdown.classList.add("hidden");
		dropdown.classList.remove("dropdown-close");
	}, 300);
}

/**
 * Update District X mobile stage text display
 */
export function updateDistrictXMobileStageText(text) {
	const stageText = document.getElementById("districtx-current-stage-mobile");
	if (stageText) stageText.textContent = text;
}

/**
 * Update District X mobile day text display
 */
export function updateDistrictXMobileDayText(text) {
	const dayText = document.getElementById("districtx-current-day-mobile");
	if (dayText) dayText.textContent = text;
}

// --- Make day tab header scrollable and fix tab order ---
// Always wrap the #favorites-day-tabs in a .day-tab-scroll container
const origTabContainer = document.getElementById("favorites-day-tabs");
if (
	origTabContainer &&
	!origTabContainer.classList.contains("day-tab-scroll")
) {
	const wrapper = document.createElement("div");
	wrapper.className =
		"day-tab-scroll w-full overflow-x-auto flex flex-nowrap border-b border-gray-600";
	// Move all tab buttons into the wrapper
	while (origTabContainer.firstChild) {
		wrapper.appendChild(origTabContainer.firstChild);
	}
	origTabContainer.parentNode.replaceChild(wrapper, origTabContainer);
	// IMPORTANT: Set id on wrapper so future code can always find it by id
	wrapper.id = "favorites-day-tabs";
	// Ensure Wednesday and Thursday tabs are present in the correct order
	function ensurePreFestivalDayTabs() {
		// Always use the scrollable wrapper for tab operations
		const tabScroll = document.getElementById("favorites-day-tabs");
		const contentContainer = document.querySelector(".space-y-4");
		const allDays = [
			"wednesday",
			"thursday",
			"friday",
			"saturday",
			"sunday",
		];

		// Remove all existing .day-tab elements from the scrollable wrapper
		Array.from(tabScroll.querySelectorAll(".day-tab")).forEach((tab) =>
			tab.remove()
		);

		// Ensure content containers exist for all days
		allDays.forEach((day) => {
			if (!document.getElementById(`${day}-artists`)) {
				const dayContent = document.createElement("div");
				dayContent.id = `${day}-artists`;
				dayContent.className = "day-content hidden";
				contentContainer.appendChild(dayContent);
			}
		});

		// Re-create and append tabs in correct order, only if data exists for that day
		allDays.forEach((day) => {
			// Only show Wednesday/Thursday if District X data exists for that day
			if (
				(day === "wednesday" || day === "thursday") &&
				(!state.data.districtX ||
					!state.data.districtX[day] ||
					Object.keys(state.data.districtX[day]).length === 0)
			) {
				return;
			}
			// Only show Friday/Saturday/Sunday if Arena or District X data exists
			if (
				["friday", "saturday", "sunday"].includes(day) &&
				!(
					(state.data.arena &&
						state.data.arena[day] &&
						Object.keys(state.data.arena[day]).length > 0) ||
					(state.data.districtX &&
						state.data.districtX[day] &&
						Object.keys(state.data.districtX[day]).length > 0)
				)
			) {
				return;
			}
			const tab = document.createElement("button");
			tab.className = "day-tab py-2 px-4";
			tab.dataset.day = day;
			tab.textContent =
				day.charAt(0).toUpperCase() +
				day.slice(1) +
				(day === "wednesday" || day === "thursday"
					? " (District X)"
					: "");
			tabScroll.appendChild(tab);
		});
	}
}

// --- Fix: Ensure correct tab activation and content display in favorites modal ---
// This must be called after ensurePreFestivalDayTabs() and after tabs are created
function setupFavoritesModalTabEvents() {
	// Remove any previous listeners to avoid duplicates
	document.querySelectorAll(".day-tab").forEach((tab) => {
		const newTab = tab.cloneNode(true);
		tab.parentNode.replaceChild(newTab, tab);
	});
	// Add click event to each tab
	document.querySelectorAll(".day-tab").forEach((tab) => {
		tab.addEventListener("click", function () {
			// Remove active class from all tabs
			document
				.querySelectorAll(".day-tab")
				.forEach((t) => t.classList.remove("active-tab"));
			// Add active class to clicked tab
			this.classList.add("active-tab");
			// Hide all content
			document
				.querySelectorAll(".day-content")
				.forEach((content) => content.classList.add("hidden"));
			// Show selected content
			const day = this.dataset.day;
			const content = document.getElementById(`${day}-artists`);
			if (content) content.classList.remove("hidden");
		});
	});
}

// Show a warning if storage is unavailable (e.g. in incognito/private mode)
function showStorageWarning() {
	if (!state.storageWarning) return;
	let existing = document.getElementById("storage-warning");
	if (existing) return;
	const warning = document.createElement("div");
	warning.id = "storage-warning";
	warning.className =
		"fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-700 text-white px-4 py-2 rounded shadow-lg z-50";
	warning.innerHTML =
		"⚠️ Unable to save favorites: browser storage is unavailable (private/incognito mode or browser settings). Your selections will not be saved after you close this tab.";
	document.body.appendChild(warning);
	setTimeout(() => {
		if (warning.parentNode) warning.parentNode.removeChild(warning);
	}, 15000);
}

// Patch showFavoritesModal to show the warning if needed
const origShowFavoritesModal = showFavoritesModal;
export function showFavoritesModalPatched() {
	origShowFavoritesModal();
	showStorageWarning();
}

// --- Shared Favorites: Clean Implementation ---

// 1. Share button setup
export function setupShareFavoritesButton() {
	const btn = document.getElementById("share-favorites-btn");
	if (!btn) return;
	// Remove previous handlers
	const newBtn = btn.cloneNode(true);
	btn.parentNode.replaceChild(newBtn, btn);
	newBtn.addEventListener("click", function (e) {
		if (
			!window.state ||
			!Array.isArray(window.state.favoriteSets) ||
			!window.state.favoriteSets.length
		) {
			customAlert.alert("You have not selected any favorites to share!");
			return;
		}
		return new Promise((resolve) => {
			// Create modal for the name input
			const modal = document.createElement("div");
			const currentName = getCurrentPersonName();
			modal.className =
				"fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50";
			modal.id = "name-input-modal";

			// Create input container
			const container = document.createElement("div");
			container.className =
				"bg-gray-800 rounded-lg p-6 max-w-md mx-auto text-center border-2 border-cyan-500 shadow-lg";

			// Add title
			const title = document.createElement("h2");
			title.className = "text-xl font-bold text-cyan-400 mb-4";
			title.innerText = "Enter Your Name";

			// Create input field
			const inputWrapper = document.createElement("div");
			inputWrapper.className = "mb-6";

			const label = document.createElement("label");
			label.className =
				"block text-left text-sm font-medium text-gray-300 mb-2";
			label.htmlFor = "name-input";
			label.innerText = "Enter your name:";

			const input = document.createElement("input");
			input.type = "text";
			input.id = "name-input";
			input.className =
				"w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-cyan-500";
			input.value = currentName;
			input.maxLength = 30;

			inputWrapper.appendChild(label);
			inputWrapper.appendChild(input);

			// Create button
			const buttonGroup = document.createElement("div");
			buttonGroup.className = "flex space-x-4 justify-center";

			const confirmButton = document.createElement("button");
			confirmButton.className =
				"px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition";
			confirmButton.innerText = "Continue";
			confirmButton.onclick = () => {
				if (input.value === null) return;
				name = input.value.trim();
				if (!name) return;
				setCurrentPersonId();
				setCurrentPersonName(name);
				modal.remove();
				// Update all favorites from 'You' to the entered name
				window.state.favoriteSets = window.state.favoriteSets.map(
					(fav) =>
						fav.person === "You"
							? {
									...fav,
									person: name,
							  }
							: fav
				);
				// 3. Copy favorites (name + favorites)
				const userFavorites = window.state.favoriteSets
					.filter((fav) => fav.person === getCurrentPersonName())
					.map((fav) => fav.setKey);

				const payload = {
					name,
					favorites: userFavorites,
				};
				let encoded;
				try {
					encoded = encodeURIComponent(JSON.stringify(payload));
				} catch {
					alert("Failed to encode favorites for sharing.");
					return;
				}

				// Show loading state
				showShareTooltip(newBtn, "Generating link...");

				// Create URL with encoded data in hash fragment
				shortenUrl(encoded)
					.then((hashFragment) => {
						console.log("Successfully encoded data for URL");
						const shortUrl = `${window.location.origin}${window.location.pathname}#${hashFragment}`;

						// Copy to clipboard
						if (
							navigator.clipboard &&
							navigator.clipboard.writeText
						) {
							navigator.clipboard.writeText(shortUrl).then(
								() => {
									showShareTooltip(newBtn, "Link copied!");
								},
								() => {
									fallbackCopyTextToClipboard(
										shortUrl,
										newBtn
									);
								}
							);
						} else {
							fallbackCopyTextToClipboard(shortUrl, newBtn);
						}
					})
					.catch((error) => {
						console.error("Error shortening URL:", error);
						// Fallback to using the long URL if shortening fails
						const longUrl = `${window.location.origin}${window.location.pathname}?shared=${encoded}`;
						if (
							navigator.clipboard &&
							navigator.clipboard.writeText
						) {
							navigator.clipboard.writeText(longUrl).then(
								() => {
									showShareTooltip(
										newBtn,
										"Link copied (long)!"
									);
								},
								() => {
									fallbackCopyTextToClipboard(
										longUrl,
										newBtn
									);
								}
							);
						} else {
							fallbackCopyTextToClipboard(longUrl, newBtn);
						}
					});
			};

			// Add keyboard event listener
			input.addEventListener("keyup", (event) => {
				if (event.key === "Enter") {
					confirmButton.click();
				}
			});

			// Set focus on input

			setTimeout(() => input.focus(), 100);

			// Assemble the modal
			buttonGroup.appendChild(confirmButton);

			container.appendChild(title);
			container.appendChild(inputWrapper);
			container.appendChild(buttonGroup);
			modal.appendChild(container);

			document.body.appendChild(modal);
		});
	});
}

function showShareTooltip(btn, message) {
	let tooltip = document.createElement("div");
	tooltip.textContent = message;
	tooltip.style.position = "absolute";
	tooltip.style.bottom = "110%";
	tooltip.style.left = "50%";
	tooltip.style.transform = "translateX(-50%)";
	tooltip.style.background = "#06b6d4";
	tooltip.style.color = "#fff";
	tooltip.style.padding = "4px 12px";
	tooltip.style.borderRadius = "6px";
	tooltip.style.fontSize = "13px";
	tooltip.style.zIndex = "9999";
	btn.appendChild(tooltip);
	setTimeout(() => {
		if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
	}, 1500);
}

function fallbackCopyTextToClipboard(text, btn) {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();
	try {
		const successful = document.execCommand("copy");
		showShareTooltip(btn, successful ? "Link copied!" : "Copy failed");
	} catch {
		showShareTooltip(btn, "Copy failed");
	}
	document.body.removeChild(textArea);
}

// 5. On page load: check for shared favorites in URL and show overlay
export async function tryImportSharedFavorites() {
	// Check for hash fragment first (new approach)
	const hashFragment = window.location.hash.substring(1); // Remove the #

	// Also support legacy URL parameters
	const params = new URLSearchParams(window.location.search);
	const shared = params.get("shared");
	const shortId = params.get("s"); // Check for shortened URL parameter

	// Return if we have nothing to import
	if (!shared && !shortId && !hashFragment) return;

	let encodedData = shared;

	// If we have a hash fragment, use that first (new approach)
	if (hashFragment) {
		try {
			console.log("Attempting to decode hash fragment");
			const expanded = await expandUrl(hashFragment);
			console.log(
				"Expanded data received:",
				expanded ? "Success" : "Not found"
			);
			if (expanded) {
				encodedData = expanded;
			} else {
				alert("This shared link has expired or is invalid.");
				return;
			}
		} catch (error) {
			console.error("Error decoding hash fragment:", error);
			alert(
				"Failed to load the shared favorites. The link may be invalid."
			);
			return;
		}
	}
	// If no hash fragment but we have a short ID, use legacy approach
	else if (shortId) {
		try {
			console.log("Attempting to expand short ID:", shortId);
			const expanded = await expandUrl(shortId);
			console.log(
				"Expanded data received:",
				expanded ? "Success" : "Not found"
			);
			if (expanded) {
				encodedData = expanded;
			} else {
				alert("This shared link has expired or is invalid.");
				return;
			}
		} catch (error) {
			console.error("Error expanding shortened URL:", error);
			alert(
				"Failed to load the shared favorites. The link may be invalid."
			);
			return;
		}
	}

	// Now process the encoded data
	let payload = null;
	try {
		payload = JSON.parse(decodeURIComponent(encodedData));
		if (
			!payload ||
			typeof payload !== "object" ||
			!Array.isArray(payload.favorites) ||
			typeof payload.name !== "string"
		) {
			throw new Error("Malformed shared favorites payload");
		}
	} catch {
		payload = null;
	}
	if (
		payload &&
		Array.isArray(payload.favorites) &&
		payload.favorites.length === 0
	) {
		alert("This shared link does not contain any favorites to import.");
		return;
	}
	window._sharedFavoritesPayload = payload;
	renderSharedFavoritesOverlay();
}

// Patch import overlay to store name
function renderSharedFavoritesOverlay() {
	const legend = document.getElementById("shared-favorites-legend");
	const list = document.getElementById("shared-favorites-list");
	const overlay = legend ? legend.closest("#shared-favorites-overlay") : null;
	if (!legend || !list) return;
	const payload = window._sharedFavoritesPayload;
	if (
		!payload ||
		!Array.isArray(payload.favorites) ||
		typeof payload.name !== "string"
	) {
		legend.classList.add("hidden");
		if (overlay) overlay.classList.add("hidden");
		return;
	}
	// Show sender's name
	let html = `<div class="mb-2 text-cyan-400 font-semibold">Shared by: ${
		payload.name || "Someone"
	}</div>`;
	// Map set keys to readable artist names
	html += payload.favorites
		.map((fav) => {
			// Support both old (string) and new ({setKey, person}) formats
			const setKey = typeof fav === "string" ? fav : fav.setKey;
			let found = null;
			["arena", "districtX"].forEach((venue) => {
				if (found) return;
				Object.keys(state.data[venue] || {}).forEach((day) => {
					if (found) return;
					Object.keys(state.data[venue][day] || {}).forEach(
						(stage) => {
							if (found) return;
							const set = (
								state.data[venue][day][stage] || []
							).find(
								(s) =>
									getSetKey(s.artist, day, stage, s.start) ===
									setKey
							);
							if (set) {
								found = {
									artist: set.artist,
									day,
									stage,
									venue,
									time: `${set.start}–${set.end}`,
								};
							}
						}
					);
				});
			});
			if (found) {
				return `<div class="mb-1"><span class="font-bold">${found.artist}</span> <span class="text-xs text-gray-400">(${found.day}, ${found.stage}, ${found.venue}, ${found.time})</span></div>`;
			} else {
				return `<div class="mb-1 text-red-400">Unknown set: ${setKey}</div>`;
			}
		})
		.join("");
	list.innerHTML = html;
	legend.classList.remove("hidden");
	if (overlay) overlay.classList.remove("hidden");
	// Import button
	const importBtn = document.getElementById("import-shared-favorites");
	if (importBtn) {
		// Remove previous handlers to avoid duplicates
		const newImportBtn = importBtn.cloneNode(true);
		importBtn.parentNode.replaceChild(newImportBtn, importBtn);
		newImportBtn.onclick = function () {
			if (!payload || !Array.isArray(payload.favorites)) return;
			if (!window.state) return;
			const currentName = getCurrentPersonName
				? getCurrentPersonName()
				: "You";
			// Add imported favorites for both sender and current user
			const importedSender = payload.favorites.map((setKey) => ({
				setKey: typeof setKey === "string" ? setKey : setKey.setKey,
				person: payload.name,
			}));
			const importedYou = payload.favorites.map((setKey) => ({
				setKey: typeof setKey === "string" ? setKey : setKey.setKey,
				person: currentName,
			}));
			// Avoid duplicates (must check both setKey and person)
			const all = [
				...window.state.favoriteSets,
				...importedSender.filter(
					(fav) =>
						!window.state.favoriteSets.some(
							(f) =>
								f.setKey === fav.setKey &&
								f.person === fav.person
						)
				),
				...importedYou.filter(
					(fav) =>
						!window.state.favoriteSets.some(
							(f) =>
								f.setKey === fav.setKey &&
								f.person === fav.person
						)
				),
			];
			window.state.favoriteSets = all;
			if (typeof window.saveFavorites === "function")
				window.saveFavorites();
			// Force all UI re-renders
			if (window.showDay && window.state.currentDay)
				window.showDay(window.state.currentDay);
			if (window.showDistrictXDay && window.state.districtXCurrentDay)
				window.showDistrictXDay(window.state.districtXCurrentDay);
			if (window.showFavoritesModalWithActiveDay)
				window.showFavoritesModalWithActiveDay(window.state.currentDay);
			window.location.search = "";
		};
	}
	// Hide button
	const hideBtn = document.getElementById("hide-shared-favorites");
	if (hideBtn) {
		hideBtn.onclick = function () {
			legend.classList.add("hidden");
			if (overlay) overlay.classList.add("hidden");
		};
	}
}

// Patch getPeopleForSet to return both 'You' and all other people (no deduplication by label)
function getPeopleForSetDisplay(setKey) {
	const currentId = getCurrentPersonId
		? getCurrentPersonId()
		: CURRENT_PERSON_ID;
	const currentName = getCurrentPersonName();
	const people = state.favoriteSets
		.filter((fav) => fav.setKey === setKey)
		.map((fav) => (fav.person === currentId ? "You" : fav.person))
		.filter((v, i, arr) => arr.indexOf(v) === i);
	return people;
}

// 6. Initialize share button and import overlay on DOM ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		setupShareFavoritesButton();
		tryImportSharedFavorites();
	});
} else {
	setupShareFavoritesButton();
	tryImportSharedFavorites();
}

import {
	loadFavorites,
	checkFirstVisit,
	checkForConflicts,
	showFavoritesOnly,
} from "./favourites.js";
import {setupOutsideClickListeners} from "./events.js";
import {setupPosterButton, loadPosterStyles} from "./poster.js";
import {
	populateDistrictXStageDropdown,
	populateArenaStageDropdown,
} from "./dropdowns.js";

async function main() {
	initState();
	window.state = state;

	await loadData();

	const stageNames = extractStageNames();
	populateStageButtons(stageNames);
	populateArenaStageDropdown(stageNames.arena);
	populateDistrictXStageDropdown(stageNames.districtX);

	showDay("friday");
	showDistrictXDay("wednesday");

	checkFirstVisit();
	loadFavorites();
	checkForConflicts();
	loadPosterStyles();
	setupPosterButton();
	setupEventListeners();
	setupOutsideClickListeners();
	setupDropdowns();

	// If you have weather:
	// const forecast = await fetchWeather();
	// renderWeather(forecast);

	tryImportSharedFavorites();
}

//7. Initialize Custom Alert Styling
export function CustomAlert() {
	this.alert = function (message, title) {
		return new Promise((resolve) => {
			// Create modal for the name input
			const modal = document.createElement("div");
			modal.className =
				"fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50";
			modal.id = "alert-modal";

			// Create input container
			const container = document.createElement("div");
			container.className =
				"bg-gray-800 rounded-lg p-6 max-w-md mx-auto text-center border-2 border-cyan-500 shadow-lg";

			// Add message
			const title = document.createElement("h2");
			title.className = "text-xl font-bold text-cyan-400 mb-4";
			title.innerText = message;

			// Create button
			const buttonGroup = document.createElement("div");
			buttonGroup.className = "flex space-x-4 justify-center";

			const confirmButton = document.createElement("button");
			confirmButton.className =
				"px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition";
			confirmButton.innerText = "Ok";
			confirmButton.onclick = () => {
				modal.remove();
				resolve(name);
			};

			// Assemble the modal
			buttonGroup.appendChild(confirmButton);

			container.appendChild(title);
			container.appendChild(buttonGroup);
			modal.appendChild(container);

			document.body.appendChild(modal);
		});
	};
}

let customAlert = new CustomAlert();

// --- Initialization logic ---
let isCallbackPage = window.location.pathname.endsWith("callback.html");

if (isCallbackPage) {
	import("./core.js").then(({state}) => {
		window.state = state;
		handleSpotifyAuthCallback();
	});
} else {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", main);
	} else {
		main();
	}
}
