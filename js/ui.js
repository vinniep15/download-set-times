/**
 * UI Module
 * Handles all user interface rendering and interactions
 */
import {state} from "./core.js";
import {formatTimeDisplay, timeToMinutes} from "./utils.js";
import {findConflictsForSet} from "./conflicts.js";
import {saveFavorites} from "./favourites.js";
import {generatePersonalizedPoster} from "./poster.js";

// Track modal state
let eventModal = null;

/**
 * Render the schedule for a specific day in the Arena
 * @param {string} day - The day to display (friday, saturday, sunday)
 */
export function showDay(day) {
	const stages = Object.keys(state.data.arena[day]);
	state.currentDay = day;

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

	// Header Row
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

	// Stage Rows
	stages.forEach((stage) => renderStageRow(container, day, stage, "arena"));

	updateDaySelection(day);
	filterStage(state.currentStage);
}

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
		? state.data[venue][day][stage].filter((set) =>
				state.favoriteArtists.includes(set.artist)
		  )
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
	const isFavorite = state.favoriteArtists.includes(set.artist);
	const hasConflict =
		isFavorite && checkForSetConflict(set, stage, day, venue);

	// Apply styling based on status
	stylizeBlock(block, isFavorite, hasConflict);

	// Add artist name
	const artistName = document.createElement("div");
	artistName.className = "text-sm font-bold";
	artistName.innerText = set.artist;
	block.appendChild(artistName);

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

	return block;
}

/**
 * Apply appropriate styling to blocks based on favorite status
 */
function stylizeBlock(block, isFavorite, hasConflict) {
	if (hasConflict) {
		block.style.backgroundColor = "#dc2626"; // Red for conflicts
	} else if (isFavorite) {
		block.style.backgroundColor = "#06b6d4"; // Cyan for favorites
		block.style.border = "3px solid white"; // White border
		block.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.7)"; // Glow
	}
}

/**
 * Check if a set has conflicts with other favorites
 */
function checkForSetConflict(set, stage, day, venue) {
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

	// Update button styling
	document.querySelectorAll(".districtx-day-btn").forEach((btn) => {
		if (btn.textContent.toLowerCase() === day) {
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

	renderDistrictXSchedule(day);

	// Apply current stage filter
	setTimeout(() => {
		filterDistrictXStage(state.districtXCurrentStage);
	}, 50);
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

	// Create rows for each stage
	stages.forEach((stage) => {
		renderStageRow(container, day, stage, "districtX");
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

	// Show/hide based on filter
	document
		.querySelectorAll("#districtx-schedule .stage-row")
		.forEach((row) => {
			row.style.display =
				stage === "all" || row.getAttribute("data-stage") === stage
					? "flex"
					: "none";
		});

	// Update button state
	document
		.querySelectorAll("#districtx-stage-buttons .stage-btn")
		.forEach((btn) => {
			if (
				btn.textContent === stage ||
				(btn.textContent === "All Stages" && stage === "all")
			) {
				btn.classList.add("active-btn");
				btn.classList.remove("bg-gray-700");
			} else {
				btn.classList.remove("active-btn");
				btn.classList.add("bg-gray-700");
			}
		});
}

/**
 * Show event details popup
 */
export function showEventDetails(event, set, stage, day, venue, isMobile) {
	// Remove any existing modal
	hideEventDetails();

	// Create modal element
	eventModal = document.createElement("div");
	eventModal.className = "event-details-modal";

	if (isMobile) {
		eventModal.classList.add("mobile");
	}

	// Get positioning
	const block = event.currentTarget;
	const rect = block.getBoundingClientRect();
	const scrollTop = window.scrollY || document.documentElement.scrollTop;
	const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

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
	if (state.favoriteArtists.includes(set.artist) && conflicts.length > 0) {
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
		console.error("Invalid stageNames format:", stageNames);
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

	console.log(`Populated ${arenaStages.length} stage buttons for Arena`);
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
	menuContainer.innerHTML = "";

	// Add "All Stages" option
	const allButton = document.createElement("button");
	allButton.className =
		"block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700";
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
 * Show the favorites selection modal
 */
export function showFavoritesModal() {
	const modal = document.getElementById("favorites-modal");

	// Clear existing content
	clearFavoritesModalContent();

	// Populate main festival days (Fri-Sun)
	populateMainFestivalDays();

	// Add Wednesday and Thursday tabs for District X
	addPreFestivalDayTabs();

	// Set up event listeners
	setupFavoritesModalEvents();

	// Show the modal
	modal.classList.remove("hidden");
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
			state.data[venue][day][stage]
		);
		venueDiv.appendChild(stageDiv);
	});

	return venueDiv;
}

/**
 * Create a stage section for the favorites modal
 */
function createStageSection(stage, sets) {
	const stageDiv = document.createElement("div");
	stageDiv.className = "mb-4";
	stageDiv.innerHTML = `<h4 class="text-md font-semibold text-gray-300 mb-1">${stage}</h4>`;

	const artistsDiv = document.createElement("div");
	artistsDiv.className = "grid grid-cols-2 gap-2";

	sets.forEach((set) => {
		if (!set.artist) return;

		const artistDiv = document.createElement("div");
		artistDiv.className = "flex items-center";
		const isFavorite = state.favoriteArtists.includes(set.artist);

		artistDiv.innerHTML = `
      <button class="heart-icon mr-2" data-artist="${set.artist}">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="${
			isFavorite ? "#06b6d4" : "none"
		}" 
          viewBox="0 0 16 16" stroke="${
				isFavorite ? "none" : "currentColor"
			}" stroke-width="1.5">
          <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
        </svg>
      </button>
      <span class="text-sm">
        ${set.artist} (${formatTimeDisplay(set.start)}-${formatTimeDisplay(
			set.end
		)})
      </span>
    `;

		artistsDiv.appendChild(artistDiv);
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
	// Heart icon click events
	document.querySelectorAll(".heart-icon").forEach((btn) => {
		btn.addEventListener("click", function () {
			const artist = this.dataset.artist;
			const svg = this.querySelector("svg");

			if (svg.getAttribute("fill") === "none") {
				// Make it a favorite
				svg.setAttribute("fill", "#06b6d4");
				svg.setAttribute("stroke", "none");
			} else {
				// Remove from favorites
				svg.setAttribute("fill", "none");
				svg.setAttribute("stroke", "currentColor");
			}
		});
	});

	// Tab switching
	document.querySelectorAll(".day-tab").forEach((tab) => {
		tab.addEventListener("click", function () {
			// Remove active class from all tabs
			document.querySelectorAll(".day-tab").forEach((t) => {
				t.classList.remove("active-tab");
			});

			// Add active class to clicked tab
			this.classList.add("active-tab");

			// Hide all content
			document.querySelectorAll(".day-content").forEach((content) => {
				content.classList.add("hidden");
			});

			// Show selected content
			const day = this.dataset.day;
			document
				.getElementById(`${day}-artists`)
				.classList.remove("hidden");
		});
	});

	// Save button
	document
		.getElementById("save-favorites")
		.addEventListener("click", saveFavorites);

	// Close button
	document.getElementById("close-favorites").addEventListener("click", () => {
		document.getElementById("favorites-modal").classList.add("hidden");
	});
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
