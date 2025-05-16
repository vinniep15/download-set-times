let data = {};
let currentDay = "friday";
let districtXCurrentDay = "friday";
const allTimes = [];
for (let hour = 10; hour <= 29; hour++) {
	// Use 29 to represent 5am next day
	for (let min = 0; min < 60; min += 15) {
		if ((hour === 10 && min >= 30) || hour > 10) {
			// Start at 10:30
			const displayHour = hour > 23 ? hour - 24 : hour;
			allTimes.push(
				`${String(displayHour).padStart(2, "0")}:${String(min).padStart(
					2,
					"0"
				)}`
			);
		}
	}
}
let currentStage = "all";
let districtXCurrentStage = "all";
let favoriteArtists = [];
const FAVORITES_KEY = "downloadFestivalFavorites";
const FAVORITES_FILTER_KEY = "downloadFestivalFavoritesFilter";
const VISITED_KEY = "downloadFestivalVisited";
let eventModal = null;
let showFavoritesOnly = false;
// const WEATHER_API_KEY = "d6edad0953eef502f6d2743dd8323123"; // Get a free key from openweathermap.org
// const DONINGTON_LAT = "52.8308"; // Donington Park coordinates
// const DONINGTON_LONG = "-1.3789";
// const FESTIVAL_DATES = {
// 	wednesday: "2025-06-11",
// 	thursday: "2025-06-12",
// 	friday: "2025-06-13",
// 	saturday: "2025-06-14",
// 	sunday: "2025-06-15",
// };

function loadFilterState() {
	// Try to load from localStorage first, then cookie
	const localFilterState = localStorage.getItem(FAVORITES_FILTER_KEY);
	const cookieFilterState = getCookie(FAVORITES_FILTER_KEY);

	// Parse the value (convert string to boolean)
	if (localFilterState !== null) {
		showFavoritesOnly = localFilterState === "true";
	} else if (cookieFilterState !== null) {
		showFavoritesOnly = cookieFilterState === true;
		// Also set localStorage for next time
		localStorage.setItem(FAVORITES_FILTER_KEY, showFavoritesOnly);
	}

	// Update checkbox state
	const globalToggle = document.getElementById("global-favorites-toggle");
	if (globalToggle) {
		globalToggle.checked = showFavoritesOnly;
	}
}

function showEventDetails(event, set, stage, day, venue, isMobile) {
	// Remove any existing modal
	hideEventDetails();

	// Create modal element
	eventModal = document.createElement("div");
	eventModal.className = "event-details-modal";

	if (isMobile) {
		eventModal.classList.add("mobile");
	}

	// Calculate position based on the block's position
	const block = event.currentTarget;
	const rect = block.getBoundingClientRect();
	const scrollTop = window.scrollY || document.documentElement.scrollTop;
	const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

	// Find conflicts for this event
	const conflicts = findConflictsForSet(set, stage, day, venue);

	// Create content (include close button for mobile)
	let closeButton = isMobile
		? `<button class="modal-close-btn">×</button>`
		: "";

	// Create conflict HTML if any
	let conflictHtml = "";
	if (favoriteArtists.includes(set.artist) && conflicts.length > 0) {
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
                        ${formatTimeDisplay(
							conflict.start
						)} - ${formatTimeDisplay(conflict.end)}
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

	// Create content
	eventModal.innerHTML = `
        ${closeButton}
        <div class="arrow"></div>
        <h3>${set.artist}</h3>
        <p><span class="time">${formatTimeDisplay(
			set.start
		)} - ${formatTimeDisplay(set.end)}</span></p>
        <p><span class="stage">${stage}</span></p>
        <p><span class="day text-sm">${
			day.charAt(0).toUpperCase() + day.slice(1)
		}</span> <span class="venue">${
		venue === "arena" ? "Arena" : "District X"
	}</span></p>
        ${conflictHtml}
    `;

	document.body.appendChild(eventModal);

	// Position it - different for mobile vs desktop
	if (isMobile) {
		// Center on screen for mobile
		eventModal.style.left = "50%";
		eventModal.style.top = "50%";
		eventModal.style.transform = "translate(-50%, -50%)";
		eventModal.style.maxWidth = "90%";
		eventModal.style.width = "320px";

		// Add backdrop
		const backdrop = document.createElement("div");
		backdrop.className = "modal-backdrop";
		document.body.appendChild(backdrop);

		// Add close button event handler
		const closeBtn = eventModal.querySelector(".modal-close-btn");
		if (closeBtn) {
			closeBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				hideEventDetails();
			});
		}
	} else {
		// Desktop positioning (unchanged)
		const modalRect = eventModal.getBoundingClientRect();
		let top = rect.top + scrollTop - modalRect.height - 15;
		let arrowClass = "arrow-bottom";
		if (top < scrollTop + 10) {
			top = rect.bottom + scrollTop + 15;
			arrowClass = "arrow-top";
		}
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
		eventModal.style.top = `${top}px`;
		eventModal.style.left = `${left}px`;
		eventModal.classList.add(arrowClass);
	}
}

function findConflictsForSet(set, stage, day, venue) {
	const conflicts = [];
	const startMin = timeToMinutes(set.start);
	const endMin = timeToMinutes(set.end);

	// Check for conflicts in same venue (different stages)
	if (data[venue] && data[venue][day]) {
		Object.keys(data[venue][day]).forEach((otherStage) => {
			if (otherStage === stage) return; // Skip same stage

			if (Array.isArray(data[venue][day][otherStage])) {
				data[venue][day][otherStage].forEach((otherSet) => {
					if (!favoriteArtists.includes(otherSet.artist)) return;
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

	// Always check the other venue for the same day
	if (data[otherVenue] && data[otherVenue][day]) {
		Object.keys(data[otherVenue][day]).forEach((otherStage) => {
			if (Array.isArray(data[otherVenue][day][otherStage])) {
				data[otherVenue][day][otherStage].forEach((otherSet) => {
					if (!favoriteArtists.includes(otherSet.artist)) return;
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
	} else {
		console.log(`No ${otherVenue} data available for ${day}`);
	}
	return conflicts;
}

function hideEventDetails() {
	// Remove any backdrop
	const backdrop = document.querySelector(".modal-backdrop");
	if (backdrop) {
		backdrop.remove();
	}

	// Remove modal
	if (eventModal) {
		eventModal.remove();
		eventModal = null;
	}
}

// Add this to your block creation code for both arena and district X blocks
function setupBlockHoverEvents(block, set, stage, day, venue) {
	// Detect if device is touch-capable
	const isTouchDevice =
		"ontouchstart" in window || navigator.maxTouchPoints > 0;

	// Track if a tooltip is currently shown
	let tooltipActive = false;

	if (isTouchDevice) {
		// Mobile device behavior - use click/tap events
		block.addEventListener("click", (event) => {
			event.stopPropagation(); // Prevent document click from firing

			if (tooltipActive) {
				hideEventDetails();
				tooltipActive = false;
				return;
			}

			showEventDetails(event, set, stage, day, venue, true);
			tooltipActive = true;
		});

		// Add document click listener to close tooltip when clicking elsewhere
		document.addEventListener("click", () => {
			if (tooltipActive) {
				hideEventDetails();
				tooltipActive = false;
			}
		});
	} else {
		// Desktop behavior - use hover
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

		block.addEventListener("mouseleave", (event) => {
			isHoveringBlock = false;
			setTimeout(() => {
				if (!isHoveringModal) {
					hideEventDetails();
				}
			}, 100);
		});
	}
}

// Cookie utility functions
https: function setCookie(name, value, days = 30) {
	const date = new Date();
	date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
	const expires = "expires=" + date.toUTCString();
	document.cookie =
		name + "=" + JSON.stringify(value) + ";" + expires + ";path=/";
}

function getCookie(name) {
	const cookieName = name + "=";
	const cookies = document.cookie.split(";");
	for (let i = 0; i < cookies.length; i++) {
		let cookie = cookies[i].trim();
		if (cookie.indexOf(cookieName) === 0) {
			try {
				return JSON.parse(
					cookie.substring(cookieName.length, cookie.length)
				);
			} catch (e) {
				return null;
			}
		}
	}
	return null;
}

function filterDistrictXStage(stage) {
	districtXCurrentStage = stage;

	// Show/hide stages based on filter
	document
		.querySelectorAll("#districtx-schedule .stage-row")
		.forEach((row) => {
			if (stage === "all" || row.getAttribute("data-stage") === stage) {
				row.style.display = "flex";
			} else {
				row.style.display = "none";
			}
		});

	// Update active button state
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

function populateMobileStageDropdown(stageNames) {
	const dropdown = document.getElementById("stage-dropdown-mobile");
	if (!dropdown) return;

	const menuContainer = dropdown.querySelector('div[role="menu"]');
	if (!menuContainer) return;

	// Clear existing options except "All Stages"
	const allStagesOption = menuContainer.querySelector(
		"button[onclick*=\"filterStage('all')\"]"
	);
	menuContainer.innerHTML = "";

	// Re-add "All Stages" option
	if (allStagesOption) {
		menuContainer.appendChild(allStagesOption);
	} else {
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
	}

	// Add options for each stage from JSON
	stageNames.forEach((stage) => {
		// Capitalize first letter but preserve "Stage" capitalization
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

function populateStageButtons(stageNames) {
	// Original functionality for desktop
	const container = document.getElementById("stage-buttons");
	if (!container) return;

	container.innerHTML = "";

	// All Stages button
	const allButton = document.createElement("button");
	allButton.innerText = "All Stages";
	allButton.className = "bg-cyan-600 px-4 py-2 rounded active-btn";
	allButton.onclick = function () {
		filterStage("all");
		updateMobileStageText("All Stages");
	};
	container.appendChild(allButton);

	// Individual stage buttons
	stageNames.forEach((stage) => {
		const stageName =
			stage.charAt(0).toUpperCase() +
			stage.slice(1).replace(/\bstage\b/i, "Stage");
		const button = document.createElement("button");
		button.innerText = stageName;
		button.className = "bg-gray-700 px-4 py-2 rounded";
		button.onclick = function () {
			filterStage(stage);
			updateMobileStageText(stageName);
		};
		container.appendChild(button);
	});

	// ALSO populate the mobile dropdown with the same stages
	populateMobileStageDropdown(stageNames);
}

function showFavoritesModal() {
	const modal = document.getElementById("favorites-modal");

	// Clear existing content
	document.getElementById("friday-artists").innerHTML = "";
	document.getElementById("saturday-artists").innerHTML = "";
	document.getElementById("sunday-artists").innerHTML = "";

	// Populate each day's content
	["friday", "saturday", "sunday"].forEach((day) => {
		if (!data.arena[day] || Object.keys(data.arena[day]).length === 0)
			return;

		const dayContainer = document.getElementById(`${day}-artists`);

		// First section: Arena bands
		const arenaDiv = document.createElement("div");
		arenaDiv.className = "mb-6";
		arenaDiv.innerHTML =
			'<h3 class="text-lg font-bold text-cyan-500 mb-2">Arena Bands</h3>';
		dayContainer.appendChild(arenaDiv);

		// Create artist entries grouped by stage for Arena bands
		Object.keys(data.arena[day]).forEach((stage) => {
			const stageDiv = document.createElement("div");
			stageDiv.className = "mb-4";
			stageDiv.innerHTML = `<h4 class="text-md font-semibold text-gray-300 mb-1">${stage}</h4>`;

			const artistsDiv = document.createElement("div");
			artistsDiv.className = "grid grid-cols-2 gap-2";

			data.arena[day][stage].forEach((set) => {
				if (!set.artist) return;

				const artistDiv = document.createElement("div");
				artistDiv.className = "flex items-center";

				const isFavorite = favoriteArtists.includes(set.artist);

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
			arenaDiv.appendChild(stageDiv);
		});

		// Second section: District X bands (if they exist for this day)
		if (
			data.districtX &&
			data.districtX[day] &&
			Object.keys(data.districtX[day]).length > 0
		) {
			const districtXDiv = document.createElement("div");
			districtXDiv.className = "mt-8";
			districtXDiv.innerHTML =
				'<h3 class="text-lg font-bold text-yellow-500 mb-2">District X Bands</h3>';
			dayContainer.appendChild(districtXDiv);

			// Create artist entries grouped by stage for District X bands
			Object.keys(data.districtX[day]).forEach((stage) => {
				// Skip if no sets in this stage
				if (
					!data.districtX[day][stage] ||
					!Array.isArray(data.districtX[day][stage]) ||
					data.districtX[day][stage].length === 0
				)
					return;

				const stageDiv = document.createElement("div");
				stageDiv.className = "mb-4";
				stageDiv.innerHTML = `<h4 class="text-md font-semibold text-gray-300 mb-1">${stage}</h4>`;

				const artistsDiv = document.createElement("div");
				artistsDiv.className = "grid grid-cols-2 gap-2";

				data.districtX[day][stage].forEach((set) => {
					if (!set.artist) return;

					const artistDiv = document.createElement("div");
					artistDiv.className = "flex items-center";

					const isFavorite = favoriteArtists.includes(set.artist);

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
				districtXDiv.appendChild(stageDiv);
			});
		}
	});

	// Add Wednesday and Thursday tabs for District X only
	const tabContainer = document.querySelector(".day-tab").parentElement;

	// Add separate tabs for Wednesday and Thursday if they don't exist
	if (!document.querySelector('[data-day="wednesday"]')) {
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

		// Create content divs for these days
		const contentContainer = document.querySelector(".space-y-4");

		const wednesdayContent = document.createElement("div");
		wednesdayContent.id = "wednesday-artists";
		wednesdayContent.className = "day-content hidden";
		contentContainer.appendChild(wednesdayContent);

		const thursdayContent = document.createElement("div");
		thursdayContent.id = "thursday-artists";
		thursdayContent.className = "day-content hidden";
		contentContainer.appendChild(thursdayContent);

		// Populate Wednesday and Thursday tabs with District X bands
		["wednesday", "thursday"].forEach((day) => {
			if (!data.districtX[day]) return;

			const dayContainer = document.getElementById(`${day}-artists`);
			dayContainer.innerHTML =
				'<h3 class="text-lg font-bold text-yellow-500 mb-2">District X Bands</h3>';

			Object.keys(data.districtX[day]).forEach((stage) => {
				// Skip if no sets in this stage
				if (
					!data.districtX[day][stage] ||
					!Array.isArray(data.districtX[day][stage]) ||
					data.districtX[day][stage].length === 0
				)
					return;

				const stageDiv = document.createElement("div");
				stageDiv.className = "mb-4";
				stageDiv.innerHTML = `<h4 class="text-md font-semibold text-gray-300 mb-1">${stage}</h4>`;

				const artistsDiv = document.createElement("div");
				artistsDiv.className = "grid grid-cols-2 gap-2";

				data.districtX[day][stage].forEach((set) => {
					if (!set.artist) return;

					const artistDiv = document.createElement("div");
					artistDiv.className = "flex items-center";

					const isFavorite = favoriteArtists.includes(set.artist);

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
				dayContainer.appendChild(stageDiv);
			});
		});
	}

	// Set up event listeners for the heart icons
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

	// Set up tab functionality
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

	modal.classList.remove("hidden");
}

function saveFavorites() {
	favoriteArtists = [];
	document
		.querySelectorAll('.heart-icon svg[fill="#06b6d4"]')
		.forEach((heart) => {
			favoriteArtists.push(heart.closest(".heart-icon").dataset.artist);
		});

	// Save to both cookie and localStorage for maximum compatibility
	setCookie(FAVORITES_KEY, favoriteArtists);
	localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteArtists));

	document.getElementById("favorites-modal").classList.add("hidden");

	// Redraw the schedule to show conflicts
	showDay(currentDay);

	// Check for conflicts after saving
	checkForConflicts();
}

function loadFavorites() {
	// Try to get from cookie first, then fallback to localStorage
	const cookieFavorites = getCookie(FAVORITES_KEY);
	const localFavorites = localStorage.getItem(FAVORITES_KEY);

	if (cookieFavorites) {
		favoriteArtists = cookieFavorites;
	} else if (localFavorites) {
		favoriteArtists = JSON.parse(localFavorites);
		// Also set the cookie for next time
		setCookie(FAVORITES_KEY, favoriteArtists);
	}

	// Check for conflicts after loading favorites
	setTimeout(checkForConflicts, 1000); // Slight delay to ensure UI is ready
}

function checkFirstVisit() {
	const visitedCookie = getCookie(VISITED_KEY);
	const visitedLocal = localStorage.getItem(VISITED_KEY);

	if (!visitedCookie && !visitedLocal) {
		setCookie(VISITED_KEY, true);
		localStorage.setItem(VISITED_KEY, "true");
		setTimeout(showFavoritesModal, 1000); // Show after 1 second
	}
}

function checkForConflicts() {
	if (favoriteArtists.length < 2) return; // Need at least 2 favorites to have a conflict

	const conflicts = [];

	Object.keys(data.arena).forEach((day) => {
		const stages = Object.keys(data.arena[day]);
		const dayConflicts = [];

		// Build an array of all favorite performances for this day
		const favoriteSets = [];
		stages.forEach((stage) => {
			data.arena[day][stage].forEach((set) => {
				if (
					favoriteArtists.includes(set.artist) &&
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
					});
				}
			});
		});

		// Check each set against others for conflicts
		for (let i = 0; i < favoriteSets.length; i++) {
			for (let j = i + 1; j < favoriteSets.length; j++) {
				const set1 = favoriteSets[i];
				const set2 = favoriteSets[j];

				if (
					set1.startMin < set2.endMin &&
					set1.endMin > set2.startMin
				) {
					dayConflicts.push({
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

		if (dayConflicts.length > 0) {
			conflicts.push(...dayConflicts);
		}
	});

	if (data.districtX) {
		Object.keys(data.districtX).forEach((day) => {
			const stages = Object.keys(data.districtX[day]);
			const dayConflicts = [];

			// Build an array of all favorite performances for this day
			const favoriteSets = [];
			stages.forEach((stage) => {
				data.districtX[day][stage].forEach((set) => {
					if (
						favoriteArtists.includes(set.artist) &&
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
						});
					}
				});
			});

			// Check each set against others for conflicts
			for (let i = 0; i < favoriteSets.length; i++) {
				for (let j = i + 1; j < favoriteSets.length; j++) {
					const set1 = favoriteSets[i];
					const set2 = favoriteSets[j];

					if (
						set1.startMin < set2.endMin &&
						set1.endMin > set2.startMin
					) {
						dayConflicts.push({
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

			if (dayConflicts.length > 0) {
				conflicts.push(...dayConflicts);
			}
		});
	}

	// Display conflicts if any are found
	if (conflicts.length > 0) {
		showConflictAlert(conflicts);
	}
}

function showConflictAlert(conflicts) {
	// Remove any existing conflict alerts first
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

	// Create close button as an X in the corner
	const closeX = document.createElement("button");
	closeX.className =
		"text-white hover:text-gray-200 font-bold text-xl leading-none -mt-1";
	closeX.textContent = "×";
	closeX.setAttribute("type", "button");

	// Add click event directly to the button
	const closeAlert = function () {
		alertDiv.style.opacity = "0";
		// Ensure we remove it after animation completes
		setTimeout(function () {
			if (document.body.contains(alertDiv)) {
				document.body.removeChild(alertDiv);
			}
		}, 300);
	};

	closeX.addEventListener("click", closeAlert, false);

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

	if (conflicts.length > 5) {
		const moreItem = document.createElement("li");
		moreItem.className = "text-sm";
		moreItem.textContent = `...and ${conflicts.length - 5} more`;
		list.appendChild(moreItem);
	}

	alertDiv.appendChild(list);

	// Add dismiss button at bottom
	const btnContainer = document.createElement("div");
	btnContainer.className = "flex justify-end";

	const dismissBtn = document.createElement("button");
	dismissBtn.className =
		"bg-white hover:bg-gray-200 active:bg-gray-300 text-red-600 px-3 py-1 rounded text-sm font-bold";
	dismissBtn.textContent = "Dismiss";
	dismissBtn.setAttribute("type", "button");
	dismissBtn.addEventListener("click", closeAlert, false);

	btnContainer.appendChild(dismissBtn);
	alertDiv.appendChild(btnContainer);

	// Add to document
	document.body.appendChild(alertDiv);

	// Make visible after a brief delay to ensure CSS transition works
	setTimeout(() => {
		alertDiv.style.opacity = "1";
	}, 10);

	// Auto-close after 15 seconds
	setTimeout(closeAlert, 15000);
}

async function loadData() {
	try {
		const response = await fetch("set-times.json");
		if (!response.ok) {
			throw new Error(`Failed to load data: ${response.status}`);
		}
		const rawData = await response.json();

		// If data is already in the new structure with arena/districtX
		if (rawData.arena && rawData.districtX) {
			data = rawData;
		} else {
			// If data is still in old format, convert it
			data = {
				arena: {
					friday: rawData.friday || {},
					saturday: rawData.saturday || {},
					sunday: rawData.sunday || {},
				},
				districtX: {
					wednesday: rawData.wednesday || {},
					thursday: rawData.thursday || {},
					friday: {}, // Empty placeholders for now
					saturday: {},
					sunday: {},
				},
			};
		}

		const stageNames = [];

		// Loop through each day in arena
		Object.keys(data.arena).forEach((day) => {
			const dayData = data.arena[day];

			// Check if dayData is an array (as originally expected)
			if (Array.isArray(dayData)) {
				// Extract stage names from array structure
				dayData.forEach((event) => {
					if (
						event.stage &&
						!stageNames.includes(event.stage.toLowerCase())
					) {
						stageNames.push(event.stage.toLowerCase());
					}
				});
			} else if (typeof dayData === "object") {
				// If it's an object with stage names as keys
				Object.keys(dayData).forEach((stage) => {
					if (!stageNames.includes(stage.toLowerCase())) {
						stageNames.push(stage.toLowerCase());
					}
				});
			}
		});

		// Populate both desktop buttons and mobile dropdown
		populateStageButtons(stageNames);

		// Reset stage filters
		currentStage = "all";
		districtXCurrentStage = "all";

		// Load favorites first, then show the schedules
		loadFavorites();
		loadFilterState();
		showDay("friday");
		showDistrictXDay("wednesday"); // Start with Wednesday for District X
		checkFirstVisit();
		// const weatherContainer = document.getElementById("weather-forecast");
		// weatherContainer.innerHTML = `
		//   <div class="loading-spinner"></div>
		//   <span class="text-sm ml-2">Loading weather...</span>
		// `;
		// const weatherData = await fetchWeatherForecast();
		// displayWeatherForecast(weatherData);

		if (!document.getElementById("generate-poster")) {
			const floatingBtn = document.createElement("button");
			floatingBtn.id = "generate-poster";
			floatingBtn.className =
				"fixed right-4 bottom-4 bg-cyan-700 hover:bg-cyan-600 text-white py-2 px-4 rounded-lg flex items-center shadow-lg z-20";
			floatingBtn.innerHTML = `
			  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
			  </svg>
			  My Poster
			`;
			document.body.appendChild(floatingBtn);
			floatingBtn.addEventListener("click", generatePersonalizedPoster);
			console.log("Added floating poster button");
		}
	} catch (error) {
		console.error("Error loading set times:", error);
		document.getElementById("schedule").innerHTML = `
            <div class="text-red-500 p-4">Failed to load festival data. Please try again later.</div>`;
		document.getElementById("districtx-schedule").innerHTML = `
            <div class="text-red-500 p-4">Failed to load festival data. Please try again later.</div>`;
	}
}

function generateTimeSlots(start, end, intervalMinutes) {
	const slots = [];
	let [startHour, startMin] = start.split(":").map(Number);
	let [endHour, endMin] = end.split(":").map(Number);

	// Adjust end time if it's early morning (next day)
	if (endHour < 12 && startHour >= 12) {
		endHour += 24; // Add 24 hours to represent next day
	}

	let current = new Date(0, 0, 0, startHour, startMin);
	const endTime = new Date(0, 0, 0, endHour, endMin);

	while (current <= endTime) {
		let hours = current.getHours();
		let minutes = current.getMinutes();

		// Format as HH:MM
		const timeStr = `${hours.toString().padStart(2, "0")}:${minutes
			.toString()
			.padStart(2, "0")}`;
		slots.push(timeStr);

		current.setMinutes(current.getMinutes() + intervalMinutes);
	}
	return slots;
}

function timeToMinutes(time) {
	// Check if time is undefined or not a string
	if (!time || typeof time !== "string") {
		console.warn("Invalid time value passed to timeToMinutes:", time);
		return 0; // Return a default value
	}

	const [hourStr, minStr] = time.split(":");
	let hour = parseInt(hourStr, 10);
	const min = parseInt(minStr, 10);

	// Convert to a standard time range (0-29 hours where 24-29 represent early morning next day)
	if (hour >= 0 && hour < 6) {
		hour += 24; // Early morning hours treated as next day
	}

	return hour * 60 + min;
}

function formatTimeDisplay(timeStr) {
	const [h, m] = timeStr.split(":").map(Number);
	if (h >= 0 && h < 6) {
		return `(+1) ${timeStr}`; // Show next day indicator
	}
	return timeStr;
}

function showDay(day) {
	const stages = Object.keys(data.arena[day]);
	currentDay = day;

	const stageButtons = document.getElementById("stage-buttons");
	stageButtons.innerHTML =
		`
        <button onclick="filterStage('all')" class="stage-btn px-4 py-2 rounded ${
			currentStage === "all" ? "active-btn" : "bg-gray-700"
		}">All Stages</button>
        ` +
		stages
			.map(
				(stage) => `
                <button onclick="filterStage('${stage}')" class="stage-btn px-4 py-2 rounded ${
					currentStage === stage ? "active-btn" : "bg-gray-700"
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
		allTimes
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
	stages.forEach((stage) => {
		const row = document.createElement("div");
		row.className = `flex items-stretch relative stage-row`;
		row.setAttribute("data-stage", stage);

		row.innerHTML =
			`<div class="w-40 text-lg font-semibold border-r border-gray-700 pr-2 flex-shrink-0 stage-name">${stage}</div>` +
			allTimes
				.map(
					() =>
						`<div class="time-slot border-r border-gray-700 h-full"></div>`
				)
				.join("");

		// Filter sets if showFavoritesOnly is true
		const setsToShow = showFavoritesOnly
			? data.arena[day][stage].filter((set) =>
					favoriteArtists.includes(set.artist)
			  )
			: data.arena[day][stage];

		setsToShow.forEach((set) => {
			if (!set.start || !set.end) return; // Skip entries without times

			// Calculate positions with fixed slot width
			const startMin = timeToMinutes(set.start);
			const endMin = timeToMinutes(set.end);
			const dayStart = timeToMinutes("10:30"); // Hardcode known start point

			// Fixed pixel values for consistent positioning
			const slotWidth = 60; // Each time slot is 60px wide
			const nameColWidth = 160; // Width of stage name column

			// Calculate position with corrected values
			let left = ((startMin - dayStart) / 15) * slotWidth;
			let width = ((endMin - startMin) / 15) * slotWidth;

			// Handle edge cases
			if (left < 0) left = 0;
			if (width < 80) width = 80; // Minimum width for readability
			if (width > 300) width = 300;

			width = width - 2;

			const block = document.createElement("div");
			block.className = "set-block";
			block.style.left = `${left + nameColWidth}px`;
			block.style.width = `${width}px`;
			setupBlockHoverEvents(block, set, stage, currentDay, "arena");

			// Check if this is a favorite artist
			const isFavorite = favoriteArtists.includes(set.artist);

			// Check for conflicts with other favorites
			let hasConflict = false;
			if (isFavorite) {
				// Loop through all favorites in this day to check for time conflicts
				for (const otherStage of stages) {
					if (otherStage === stage) continue; // Skip same stage

					for (const otherSet of data.arena[day][otherStage]) {
						if (!favoriteArtists.includes(otherSet.artist))
							continue;
						if (!otherSet.start || !otherSet.end) continue;

						// Check for time overlap
						const otherStart = timeToMinutes(otherSet.start);
						const otherEnd = timeToMinutes(otherSet.end);

						if (startMin < otherEnd && endMin > otherStart) {
							hasConflict = true;
							break;
						}
					}
					if (hasConflict) break;
				}
			}

			// Apply appropriate styling
			if (hasConflict) {
				block.style.backgroundColor = "#dc2626"; // Red for conflicts
			} else if (isFavorite) {
				block.style.backgroundColor = "#06b6d4"; // Cyan for favorites
				block.style.border = "3px solid white"; // Thicker white border
				block.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.7)"; // Add subtle glow
			}

			block.style.left = `${left + 160}px`; // Add width of stage name column
			block.style.width = `${width}px`;
			block.style.top = `10px`; // Center vertically
			block.innerText = "";

			// Add artist name
			block.innerText = "";
			const artistName = document.createElement("div");
			artistName.className = "text-sm font-bold";
			artistName.innerText = set.artist;
			block.appendChild(artistName);

			if (showFavoritesOnly) {
				// Delay appearance slightly to create a cascade effect
				setTimeout(() => {
					block.classList.add("fade-in");
				}, startMin % 50); // Vary animation timing based on start time
			} else {
				block.classList.add("fade-in");
			}

			row.appendChild(block);

			const prevEvents = document.querySelectorAll(
				`[data-stage="${stage}"]`
			);
			let verticalOffset = 0;

			prevEvents.forEach((prevBlock) => {
				const prevEnd = parseInt(prevBlock.dataset.end || "0");
				const prevLeft = parseInt(
					prevBlock.style.left.replace("px", "")
				);
				const prevWidth = parseInt(
					prevBlock.style.width.replace("px", "")
				);

				// If blocks would visually overlap or are very close
				if (
					Math.abs(left - (prevLeft + prevWidth)) < 5 ||
					Math.abs(left + width - prevLeft) < 5 ||
					(left >= prevLeft && left <= prevLeft + prevWidth) ||
					(left + width >= prevLeft &&
						left + width <= prevLeft + prevWidth)
				) {
					// Adjust vertical position for this block
					verticalOffset = 5;
				}
			});

			// Apply vertical offset if needed
			if (verticalOffset > 0) {
				block.style.top = `${15}px`;
			} else {
				block.style.top = `10px`;
			}

			// Add data attributes to help with overlap detection
			block.dataset.start = startMin;
			block.dataset.end = endMin;
			block.dataset.stage = stage;
		});

		container.appendChild(row);
	});

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

	filterStage(currentStage);
	updateActiveDayButton(day);
	updateMobileDayText(day.charAt(0).toUpperCase() + day.slice(1));
}

function updateMobileStageText(text) {
	const mobileText = document.getElementById("current-stage-mobile");
	if (mobileText) {
		// Properly capitalize "Stage" if it appears in the text
		if (text !== "All Stages") {
			// Only process non-"All Stages" text
			text = text.replace(/\bstage\b/i, "Stage"); // Preserve capital S in "Stage"
		}
		mobileText.textContent = text;
	}
}

function updateMobileDayText(day) {
	const mobileDay = document.getElementById("current-day-mobile");
	if (mobileDay) mobileDay.textContent = day;
}

function filterStage(stage) {
	currentStage = stage;

	// Reset all stage buttons to default styling
	document.querySelectorAll(".stage-btn").forEach((btn) => {
		btn.classList.remove("active-btn");
		btn.classList.add("bg-gray-700");
	});

	// Find the active stage button and apply active styling
	const activeStageBtn = Array.from(
		document.querySelectorAll(".stage-btn")
	).find(
		(btn) =>
			btn.textContent.trim() ===
			(stage === "all"
				? "All Stages"
				: stage.charAt(0).toUpperCase() + stage.slice(1)) // No need to append "Stage"
	);

	if (activeStageBtn) {
		activeStageBtn.classList.add("active-btn");
		activeStageBtn.classList.remove("bg-gray-700"); // Remove gray background
	}

	document.querySelectorAll(".stage-row").forEach((row) => {
		row.style.display =
			stage === "all" || row.getAttribute("data-stage") === stage
				? "flex"
				: "none";
	});

	updateActiveStageButton(stage);

	// Update mobile dropdown to match - no need to append "Stage"
	const stageName =
		stage === "all"
			? "All Stages"
			: stage.charAt(0).toUpperCase() +
			  stage.slice(1).replace(/\bstage\b/i, "Stage");

	updateMobileStageText(stageName);
}

function showDistrictXDay(day) {
	document.querySelectorAll(".districtx-day-btn").forEach((btn) => {
		if (btn.textContent.toLowerCase() === day) {
			btn.classList.add("active-btn");
			btn.classList.remove("bg-gray-700");
		} else {
			btn.classList.remove("active-btn");
			btn.classList.add("bg-gray-700");
		}
	});

	districtXCurrentDay = day;

	// Check if data exists
	if (
		!data.districtX ||
		!data.districtX[day] ||
		Object.keys(data.districtX[day]).length === 0
	) {
		document.getElementById("districtx-schedule").innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center">
                <p class="text-xl font-bold text-cyan-500 mb-2">Coming Soon!</p>
                <p class="text-gray-300">District X lineup for ${day} will be available closer to the event.</p>
            </div>`;
		return;
	}

	const stages = Object.keys(data.districtX[day]);
	const stageButtons = document.getElementById("districtx-stage-buttons");

	stageButtons.innerHTML =
		`<button onclick="filterDistrictXStage('all')" class="stage-btn px-4 py-2 rounded ${
			districtXCurrentStage === "all" ? "active-btn" : "bg-gray-700"
		}">All Stages</button>` +
		stages
			.map(
				(stage) => `
            <button onclick="filterDistrictXStage('${stage}')" class="stage-btn px-4 py-2 rounded ${
					districtXCurrentStage === stage
						? "active-btn"
						: "bg-gray-700"
				}">${stage}</button>
            `
			)
			.join("");

	const container = document.getElementById("districtx-schedule");
	container.innerHTML = "";

	// Header Row
	const header = document.createElement("div");
	header.className =
		"flex sticky top-0 z-10 bg-black border-b border-gray-700 time-header";
	header.innerHTML =
		`<div class="w-40 flex-shrink-0"></div>` +
		allTimes
			.map((t) => {
				const [h, m] = t.split(":").map(Number);
				const isNextDay = h >= 0 && h < 6;
				return `<div class="time-slot text-sm text-center py-2 ${
					isNextDay ? "bg-gray-900 text-yellow-400" : ""
				}">${isNextDay ? "(+1) " : ""}${t}</div>`;
			})
			.join("");
	container.appendChild(header);

	// Create rows for each stage
	stages.forEach((stage) => {
		const row = document.createElement("div");
		row.className = "flex items-stretch relative stage-row";
		row.setAttribute("data-stage", stage);

		row.innerHTML =
			`<div class="w-40 text-lg font-semibold border-r border-gray-700 pr-2 flex-shrink-0 stage-name">${stage}</div>` +
			allTimes
				.map((t) => {
					const [h, m] = t.split(":").map(Number);
					const isNextDay = h >= 0 && h < 6;
					return `<div class="time-slot border-r border-gray-700 h-full ${
						isNextDay ? "bg-gray-900 bg-opacity-40" : ""
					}""></div>`;
				})
				.join("");

		// Add set blocks
		const setsToShow = showFavoritesOnly
			? data.districtX[day][stage].filter((set) =>
					favoriteArtists.includes(set.artist)
			  )
			: data.districtX[day][stage];

		setsToShow.forEach((set) => {
			if (!set.start || !set.end) return;

			const startMin = timeToMinutes(set.start);
			const endMin = timeToMinutes(set.end);
			const dayStart = timeToMinutes("10:30"); // Hardcode known start point

			// Fixed pixel values for consistent positioning
			const slotWidth = 60; // Each time slot is 60px wide
			const nameColWidth = 160; // Width of stage name column

			// Calculate position with corrected values
			let left = ((startMin - dayStart) / 15) * slotWidth;
			let width = ((endMin - startMin) / 15) * slotWidth;

			// Handle edge cases
			if (left < 0) left = 0;
			if (width < 80) width = 80; // Minimum width for readability
			if (width > 300) width = 300;
			width = width - 2;

			const block = document.createElement("div");
			block.className = "set-block";
			block.style.left = `${left + nameColWidth}px`;
			block.style.width = `${width}px`;
			setupBlockHoverEvents(
				block,
				set,
				stage,
				districtXCurrentDay,
				"districtX"
			);

			// Check if this is a favorite artist
			const isFavorite = favoriteArtists.includes(set.artist);

			// Check for conflicts
			let hasConflict = false;
			if (isFavorite) {
				// First check conflicts with other District X favorites on the same day
				for (const otherStage of stages) {
					if (otherStage === stage) continue; // Skip same stage

					if (
						!data.districtX[day][otherStage] ||
						!Array.isArray(data.districtX[day][otherStage])
					)
						continue;

					for (const otherSet of data.districtX[day][otherStage]) {
						if (!favoriteArtists.includes(otherSet.artist))
							continue;
						if (!otherSet.start || !otherSet.end) continue;

						// Check for time overlap
						const otherStart = timeToMinutes(otherSet.start);
						const otherEnd = timeToMinutes(otherSet.end);

						if (startMin < otherEnd && endMin > otherStart) {
							hasConflict = true;
							break;
						}
					}
					if (hasConflict) break;
				}

				// If no conflict found yet, check against Arena bands on the same day
				// (only for days that have both arena and district X events)
				if (
					!hasConflict &&
					["friday", "saturday", "sunday"].includes(day) &&
					data.arena &&
					data.arena[day]
				) {
					const arenaStages = Object.keys(data.arena[day]);

					for (const arenaStage of arenaStages) {
						for (const arenaSet of data.arena[day][arenaStage]) {
							if (!favoriteArtists.includes(arenaSet.artist))
								continue;
							if (!arenaSet.start || !arenaSet.end) continue;

							// Check for time overlap
							const arenaStart = timeToMinutes(arenaSet.start);
							const arenaEnd = timeToMinutes(arenaSet.end);

							if (startMin < arenaEnd && endMin > arenaStart) {
								hasConflict = true;
								break;
							}
						}
						if (hasConflict) break;
					}
				}
			}

			// Apply styling
			if (hasConflict) {
				block.style.backgroundColor = "#dc2626"; // Red for conflicts
			} else if (isFavorite) {
				block.style.backgroundColor = "#06b6d4"; // Cyan for favorites
				block.style.border = "3px solid white";
				block.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.7)";
			}

			block.style.left = `${left + 160}px`;
			block.style.width = `${width}px`;
			block.style.top = `10px`;
			block.innerText = "";

			// Add artist name
			const artistName = document.createElement("div");
			artistName.className = "text-sm font-bold";
			artistName.innerText = set.artist;
			block.appendChild(artistName);

			const prevEvents = document.querySelectorAll(
				`[data-stage="${stage}"]`
			);
			let verticalOffset = 0;

			prevEvents.forEach((prevBlock) => {
				const prevEnd = parseInt(prevBlock.dataset.end || "0");
				const prevLeft = parseInt(
					prevBlock.style.left.replace("px", "")
				);
				const prevWidth = parseInt(
					prevBlock.style.width.replace("px", "")
				);

				// If blocks would visually overlap or are very close
				if (
					Math.abs(left - (prevLeft + prevWidth)) < 5 ||
					Math.abs(left + width - prevLeft) < 5 ||
					(left >= prevLeft && left <= prevLeft + prevWidth) ||
					(left + width >= prevLeft &&
						left + width <= prevLeft + prevWidth)
				) {
					// Adjust vertical position for this block
					verticalOffset = 5;
				}
			});

			// Apply vertical offset if needed
			if (verticalOffset > 0) {
				block.style.top = `${15}px`;
			} else {
				block.style.top = `10px`;
			}

			// Add data attributes to help with overlap detection
			block.dataset.start = startMin;
			block.dataset.end = endMin;
			block.dataset.stage = stage;

			if (showFavoritesOnly) {
				// Delay appearance slightly to create a cascade effect
				setTimeout(() => {
					block.classList.add("fade-in");
				}, startMin % 50); // Vary animation timing based on start time
			} else {
				block.classList.add("fade-in");
			}

			row.appendChild(block);
		});
		container.appendChild(row);

		setTimeout(() => {
			filterDistrictXStage(districtXCurrentStage);
		}, 50);
	});

	// Update active day button
	document.querySelectorAll(".districtx-day-btn").forEach((btn) => {
		btn.classList.remove("active-btn");
		btn.classList.add("bg-gray-700");
	});

	const activeBtn = Array.from(
		document.querySelectorAll(".districtx-day-btn")
	).find((btn) => btn.textContent.trim().toLowerCase() === day);

	if (activeBtn) {
		activeBtn.classList.add("active-btn");
		activeBtn.classList.remove("bg-gray-700");
	}
}

function calculateEventDuration(startTime, endTime) {
	let startMinutes = timeToMinutes(startTime);
	let endMinutes = timeToMinutes(endTime);

	// If end time is earlier than start time, it means event crosses midnight
	if (endMinutes < startMinutes) {
		endMinutes += 24 * 60; // Add 24 hours
	}

	return endMinutes - startMinutes;
}

document.addEventListener("DOMContentLoaded", () => {
	loadData().then(() => {
		// Add event listeners
		document
			.getElementById("open-favorites")
			.addEventListener("click", showFavoritesModal);
		document
			.getElementById("close-favorites")
			.addEventListener("click", () => {
				document
					.getElementById("favorites-modal")
					.classList.add("hidden");
			});
		document
			.getElementById("save-favorites")
			.addEventListener("click", saveFavorites);

		const globalToggle = document.getElementById("global-favorites-toggle");
		if (globalToggle) {
			globalToggle.addEventListener("change", function () {
				showFavoritesOnly = this.checked;

				// Save filter state
				localStorage.setItem("showFavoritesOnly", showFavoritesOnly);
				setCookie(FAVORITES_FILTER_KEY, showFavoritesOnly);

				if (showFavoritesOnly) {
					// Going from all artists to favorites only
					// Just animate out non-favorites
					const arenaBlocks = document.querySelectorAll(
						"#schedule .set-block"
					);
					const districtBlocks = document.querySelectorAll(
						"#districtx-schedule .set-block"
					);

					let nonFavoriteCount = 0;

					// Process arena blocks
					arenaBlocks.forEach((block) => {
						const artistName = block
							.querySelector("div")
							.textContent.trim();
						if (!favoriteArtists.includes(artistName)) {
							nonFavoriteCount++;
							block.classList.add("fade-out");
							// Remove after animation
							setTimeout(() => {
								if (block.parentNode)
									block.parentNode.removeChild(block);
							}, 400);
						}
					});

					// Process district X blocks
					districtBlocks.forEach((block) => {
						const artistName = block
							.querySelector("div")
							.textContent.trim();
						if (!favoriteArtists.includes(artistName)) {
							nonFavoriteCount++;
							block.classList.add("fade-out");
							// Remove after animation
							setTimeout(() => {
								if (block.parentNode)
									block.parentNode.removeChild(block);
							}, 400);
						}
					});
				} else {
					// Going from favorites only to all artists
					// Need to redraw everything to add the missing bands
					showDay(currentDay);
					if (data.districtX && data.districtX[districtXCurrentDay]) {
						showDistrictXDay(districtXCurrentDay);
					}
				}
			});
		}
	});
});

function animateBlocksForFiltering() {
	// Arena section
	document.querySelectorAll("#schedule .set-block").forEach((block) => {
		const artistName = block.textContent.trim();
		const shouldRemove =
			showFavoritesOnly && !favoriteArtists.includes(artistName);

		if (shouldRemove) {
			block.classList.add("fade-out");
		}
	});

	// District X section
	document
		.querySelectorAll("#districtx-schedule .set-block")
		.forEach((block) => {
			const artistName = block.textContent.trim();
			const shouldRemove =
				showFavoritesOnly && !favoriteArtists.includes(artistName);

			if (shouldRemove) {
				block.classList.add("fade-out");
			}
		});
}

// async function fetchWeatherForecast() {
// 	try {
// 		// Add logging to see request details
// 		console.log(`Fetching weather data for Donington Park...`);

// 		const response = await fetch(
// 			`https://api.openweathermap.org/data/2.5/forecast?lat=${DONINGTON_LAT}&lon=${DONINGTON_LONG}&units=metric&appid=${WEATHER_API_KEY}`
// 		);

// 		if (!response.ok) {
// 			console.warn(
// 				`Weather API error: ${response.status}. Using mock data instead.`
// 			);
// 			return generateMockWeatherData();
// 		}

// 		const data = await response.json();
// 		console.log("Weather API response:", data);

// 		// Process the data
// 		const processedData = processWeatherData(data);

// 		// Check if any days are missing
// 		const festivalDays = Object.keys(FESTIVAL_DATES);
// 		const availableDays = Object.keys(processedData);

// 		if (
// 			availableDays.length === 0 ||
// 			festivalDays.some((day) => !processedData[day])
// 		) {
// 			console.warn(
// 				"Missing weather data for some festival days. Using mock data."
// 			);
// 			return generateMockWeatherData();
// 		}

// 		return processedData;
// 	} catch (error) {
// 		console.error("Failed to fetch weather:", error);
// 		return generateMockWeatherData();
// 	}
// }

// function generateMockWeatherData() {
// 	console.log("Generating mock weather data");
// 	// Create perfect festival weather data - warm and sunny!
// 	const mockData = {};

// 	Object.keys(FESTIVAL_DATES).forEach((day) => {
// 		// Slightly random but always nice temperatures
// 		const baseTemp = 22 + Math.random() * 2; // Base temperature between 22-24°C

// 		// Create perfect weather for the festival
// 		mockData[day] = {
// 			date: FESTIVAL_DATES[day],
// 			avgTemp: Math.round(baseTemp),
// 			maxTemp: Math.round(baseTemp + 2 + Math.random() * 2), // 24-28°C
// 			minTemp: Math.round(baseTemp - 5 - Math.random() * 2), // 15-19°C
// 			rainChance: Math.round(Math.random() * 5), // 0-5% (tiny chance of rain)
// 			condition: Math.random() > 0.3 ? "Clear" : "Clouds", // Mostly clear with occasional clouds
// 			icon: Math.random() > 0.3 ? "☀️" : "⛅", // Mostly sunny icons
// 			isMock: true, // Flag to indicate mock data
// 		};
// 	});

// 	console.log("Mock weather data:", mockData);
// 	return mockData;
// }

// function processWeatherData(data) {
// 	const festivalWeather = {};

// 	// Extract relevant data for festival days
// 	Object.entries(FESTIVAL_DATES).forEach(([day, date]) => {
// 		// Find forecasts for this day
// 		const dayForecasts = data.list.filter((item) =>
// 			item.dt_txt.startsWith(date)
// 		);

// 		if (dayForecasts.length > 0) {
// 			// Get daytime forecasts (9am to 9pm)
// 			const daytimeForecasts = dayForecasts.filter((item) => {
// 				const hour = parseInt(item.dt_txt.split(" ")[1].split(":")[0]);
// 				return hour >= 9 && hour <= 21;
// 			});

// 			// Calculate averages and find most common weather condition
// 			let totalTemp = 0;
// 			let maxTemp = -100;
// 			let minTemp = 100;
// 			let totalRainChance = 0;
// 			const conditions = {};

// 			daytimeForecasts.forEach((forecast) => {
// 				const temp = forecast.main.temp;
// 				totalTemp += temp;
// 				maxTemp = Math.max(maxTemp, temp);
// 				minTemp = Math.min(minTemp, temp);

// 				// Calculate rain probability
// 				const rainProb = forecast.pop || 0; // Probability of precipitation
// 				totalRainChance += rainProb;

// 				// Track weather conditions
// 				const condition = forecast.weather[0].main;
// 				conditions[condition] = (conditions[condition] || 0) + 1;
// 			});

// 			// Find most common condition
// 			let commonCondition = "Clear";
// 			let maxCount = 0;

// 			Object.entries(conditions).forEach(([condition, count]) => {
// 				if (count > maxCount) {
// 					maxCount = count;
// 					commonCondition = condition;
// 				}
// 			});

// 			// Create summary
// 			festivalWeather[day] = {
// 				date: date,
// 				avgTemp: Math.round(totalTemp / daytimeForecasts.length),
// 				maxTemp: Math.round(maxTemp),
// 				minTemp: Math.round(minTemp),
// 				rainChance: Math.round(
// 					(totalRainChance / daytimeForecasts.length) * 100
// 				),
// 				condition: commonCondition,
// 				icon: getWeatherIcon(commonCondition),
// 			};
// 		}
// 	});

// 	return festivalWeather;
// }

// function getWeatherIcon(condition) {
// 	// Map weather conditions to appropriate icons (using emoji for simplicity)
// 	switch (condition.toLowerCase()) {
// 		case "clear":
// 			return "☀️";
// 		case "clouds":
// 			return "⛅";
// 		case "rain":
// 			return "🌧️";
// 		case "drizzle":
// 			return "🌦️";
// 		case "thunderstorm":
// 			return "⛈️";
// 		case "snow":
// 			return "❄️";
// 		case "mist":
// 			return "🌫️";
// 		case "wind":
// 		case "windy":
// 		case "squall":
// 			return "💨";
// 		case "tornado":
// 			return "🌪️";
// 		case "dust":
// 		case "sand":
// 			return "🌫️";
// 		default:
// 			return "🌤️";
// 	}
// }

// function displayWeatherForecast(weatherData) {
// 	console.log("Displaying weather data:", weatherData);
// 	const container = document.getElementById("weather-forecast");

// 	// Clear the container
// 	container.innerHTML = "";

// 	if (!weatherData || Object.keys(weatherData).length === 0) {
// 		container.innerHTML =
// 			'<p class="text-sm text-gray-400">Weather forecast unavailable</p>';
// 		console.warn("No weather data to display");
// 		return;
// 	}

// 	if (Object.values(weatherData)[0]?.isMock) {
// 		// Add a note indicating this is simulated data
// 		const mockNote = document.createElement("div");
// 		mockNote.className = "text-xs text-amber-500 mb-2";
// 		mockNote.innerHTML = "⚠️ Using simulated weather data";
// 		container.appendChild(mockNote);
// 	}

// 	// Create a weather card for each festival day
// 	Object.entries(weatherData).forEach(([day, forecast]) => {
// 		if (!forecast) return; // Skip if no forecast for this day

// 		const dayElement = document.createElement("div");
// 		dayElement.className =
// 			"weather-day p-2 bg-gray-700 rounded flex flex-col items-center";
// 		dayElement.dataset.day = day;

// 		// Add color indication for rain chance
// 		let rainClass = "bg-green-700";
// 		if (forecast.rainChance > 60) rainClass = "bg-red-700";
// 		else if (forecast.rainChance > 30) rainClass = "bg-yellow-700";

// 		dayElement.innerHTML = `
// 		<div class="capitalize font-bold text-sm mb-1">${day}</div>
// 		<div class="text-2xl mb-1">${forecast.icon || "⛅"}</div>
// 		<div class="text-sm">${forecast.minTemp || 15}°C - ${
// 			forecast.maxTemp || 25
// 		}°C</div>
// 		<div class="mt-1 px-2 py-1 rounded text-xs ${rainClass}">
// 		  ${forecast.rainChance || 0}% rain
// 		</div>
// 	  `;

// 		// Highlight current day
// 		if (day === currentDay || day === districtXCurrentDay) {
// 			dayElement.classList.add("border-2", "border-cyan-500");
// 		}

// 		container.appendChild(dayElement);
// 	});
// }

// Poster Generator
function generatePersonalizedPoster() {
	console.log("Generating poster...");

	// Check if we have favorites
	if (favoriteArtists.length === 0) {
		alert("Please add some favorite artists first!");
		return;
	}

	// Create name input popup
	showNameInputDialog().then((name) => {
		// Use the name (or default) to create the poster
		createPersonalizedPoster(name || "My");
	});
}

// New function to show a name input dialog
function showNameInputDialog() {
	return new Promise((resolve) => {
		// Create modal for the name input
		const modal = document.createElement("div");
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
		title.innerText = "Personalize Your Poster";

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
		input.placeholder = "Your name";
		input.maxLength = 30;

		inputWrapper.appendChild(label);
		inputWrapper.appendChild(input);

		// Create buttons
		const buttonGroup = document.createElement("div");
		buttonGroup.className = "flex space-x-4 justify-center";

		const skipButton = document.createElement("button");
		skipButton.className =
			"px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition";
		skipButton.innerText = "Skip";
		skipButton.onclick = () => {
			modal.remove();
			resolve("");
		};

		const confirmButton = document.createElement("button");
		confirmButton.className =
			"px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition";
		confirmButton.innerText = "Continue";
		confirmButton.onclick = () => {
			const name = input.value.trim();
			modal.remove();
			resolve(name);
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
		buttonGroup.appendChild(skipButton);
		buttonGroup.appendChild(confirmButton);

		container.appendChild(title);
		container.appendChild(inputWrapper);
		container.appendChild(buttonGroup);
		modal.appendChild(container);

		document.body.appendChild(modal);
	});
}

// Modified function to create the poster with a name
function generatePersonalizedPoster() {
	console.log("Generating poster...");

	// Check if we have favorites
	if (favoriteArtists.length === 0) {
		alert("Please add some favorite artists first!");
		return;
	}

	// Create name input popup
	showNameInputDialog().then((name) => {
		// Use the name (or default) to create the poster
		createPersonalizedPoster(name || "My");
	});
}

// New function to show a name input dialog
function showNameInputDialog() {
	return new Promise((resolve) => {
		// Create modal for the name input
		const modal = document.createElement("div");
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
		title.innerText = "Personalize Your Poster";

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
		input.placeholder = "Your name";
		input.maxLength = 30;

		inputWrapper.appendChild(label);
		inputWrapper.appendChild(input);

		// Create buttons
		const buttonGroup = document.createElement("div");
		buttonGroup.className = "flex space-x-4 justify-center";

		const skipButton = document.createElement("button");
		skipButton.className =
			"px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition";
		skipButton.innerText = "Skip";
		skipButton.onclick = () => {
			modal.remove();
			resolve("");
		};

		const confirmButton = document.createElement("button");
		confirmButton.className =
			"px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition";
		confirmButton.innerText = "Continue";
		confirmButton.onclick = () => {
			const name = input.value.trim();
			modal.remove();
			resolve(name);
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
		buttonGroup.appendChild(skipButton);
		buttonGroup.appendChild(confirmButton);

		container.appendChild(title);
		container.appendChild(inputWrapper);
		container.appendChild(buttonGroup);
		modal.appendChild(container);

		document.body.appendChild(modal);
	});
}

// Modified function to create the poster with a name
function createPersonalizedPoster(name) {
	// Create modal for the poster
	const modal = document.createElement("div");
	modal.className =
		"fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50";
	modal.id = "poster-modal";

	// Detect if we're on mobile
	const isMobile = window.innerWidth < 768;
	const isExtraSmall = window.innerWidth < 350;

	// Create poster container with height constraints
	const posterContainer = document.createElement("div");
	posterContainer.className = `relative rounded-lg overflow-auto ${
		isMobile ? "poster-container-mobile" : "max-w-3xl p-6"
	}`;

	// Create poster content with adaptive styling
	const posterContent = document.createElement("div");
	posterContent.id = "poster-content";
	posterContent.className = `text-center download-poster-style ${
		isMobile ? "poster-content-mobile" : ""
	}`;
	posterContent.style.padding = isMobile
		? isExtraSmall
			? "12px 8px"
			: "16px 10px"
		: "40px 20px";
	posterContent.style.minHeight = isMobile ? "auto" : "800px";
	posterContent.style.width = isMobile ? "100%" : "auto";
	// Format the name properly for display
	const displayName = name === "My" ? "My" : `${name}'s`;

	// Add enhanced abstract background layers
	posterContent.innerHTML = `
	  <div class="poster-bg-main"></div>
	  <div class="poster-bg-effect"></div>
	  <div class="poster-bg-bubbles"></div>
	  <div class="poster-bg-swirl"></div>
	  <div class="poster-bg-noise"></div>
	  <div class="mb-8 relative z-10">
		<h1 class="text-5xl font-extrabold text-white mb-2 download-logo-text">DOWNLOAD FESTIVAL 2025</h1>
		<div class="text-lg text-cyan-100 mt-2">DONINGTON PARK • 11-15 JUNE</div>
		<div class="mt-2 mb-6 text-sm text-cyan-500 uppercase font-bold">${displayName} Personal Lineup</div>
	  </div>
	`;

	// Create close button
	const closeBtn = document.createElement("button");
	closeBtn.innerHTML = "×";
	closeBtn.className =
		"absolute top-2 right-4 text-white text-3xl hover:text-gray-400 z-10";
	closeBtn.onclick = () => document.getElementById("poster-modal").remove();

	// Create poster content
	function showConflictAlert(conflicts) {
		// Remove any existing conflict alerts first
		document
			.querySelectorAll(".conflict-alert")
			.forEach((el) => el.remove());

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

		// Create close button as an X in the corner
		const closeX = document.createElement("button");
		closeX.className =
			"text-white hover:text-gray-200 font-bold text-xl leading-none -mt-1";
		closeX.textContent = "×";
		closeX.setAttribute("type", "button");

		// Add click event directly to the button
		const closeAlert = function () {
			alertDiv.style.opacity = "0";
			// Ensure we remove it after animation completes
			setTimeout(function () {
				if (document.body.contains(alertDiv)) {
					document.body.removeChild(alertDiv);
				}
			}, 300);
		};

		closeX.addEventListener("click", closeAlert, false);

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

		if (conflicts.length > 5) {
			const moreItem = document.createElement("li");
			moreItem.className = "text-sm";
			moreItem.textContent = `...and ${conflicts.length - 5} more`;
			list.appendChild(moreItem);
		}

		alertDiv.appendChild(list);

		// Add dismiss button at bottom
		const btnContainer = document.createElement("div");
		btnContainer.className = "flex justify-end";

		const dismissBtn = document.createElement("button");
		dismissBtn.className =
			"bg-white hover:bg-gray-200 active:bg-gray-300 text-red-600 px-3 py-1 rounded text-sm font-bold";
		dismissBtn.textContent = "Dismiss";
		dismissBtn.setAttribute("type", "button");
		dismissBtn.addEventListener("click", closeAlert, false);

		btnContainer.appendChild(dismissBtn);
		alertDiv.appendChild(btnContainer);

		// Add to document
		document.body.appendChild(alertDiv);

		// Make visible after a brief delay to ensure CSS transition works
		setTimeout(() => {
			alertDiv.style.opacity = "1";
		}, 10);

		// Auto-close after 15 seconds
		setTimeout(closeAlert, 15000);
	}

	// Sort artists by venue and headliner status
	const arenaArtists = [];
	const districtArtists = [];

	// Extract all favorited artists with their venues
	Object.keys(data.arena).forEach((day) => {
		// Same extraction code...
		Object.keys(data.arena[day]).forEach((stage) => {
			data.arena[day][stage].forEach((set) => {
				if (favoriteArtists.includes(set.artist)) {
					arenaArtists.push({
						artist: set.artist,
						stage: stage,
						day: day,
						time: set.start,
					});
				}
			});
		});
	});

	// Do the same for District X
	Object.keys(data.districtX).forEach((day) => {
		if (!data.districtX[day]) return;
		Object.keys(data.districtX[day]).forEach((stage) => {
			if (Array.isArray(data.districtX[day][stage])) {
				data.districtX[day][stage].forEach((set) => {
					if (favoriteArtists.includes(set.artist)) {
						districtArtists.push({
							artist: set.artist,
							stage: stage,
							day: day,
							time: set.start,
						});
					}
				});
			}
		});
	});

	// Sort by headliner status (using time as proxy - headliners play later)
	arenaArtists.sort((a, b) => {
		if (!a.time || !b.time) return 0;
		const aTime = timeToMinutes(a.time);
		const bTime = timeToMinutes(b.time);
		return bTime - aTime; // Later times (headliners) first
	});

	districtArtists.sort((a, b) => {
		if (!a.time || !b.time) return 0;
		const aTime = timeToMinutes(a.time);
		const bTime = timeToMinutes(b.time);
		return bTime - aTime;
	});

	// Create Arena artists section
	if (arenaArtists.length > 0) {
		const arenaSection = document.createElement("div");
		arenaSection.className = "mb-10 relative";

		// Divide artists into tiers
		let tierCount = Math.min(4, Math.ceil(arenaArtists.length / 4));

		for (let i = 0; i < tierCount; i++) {
			const startIndex = Math.floor(
				(i * arenaArtists.length) / tierCount
			);

			const endIndex = Math.floor(
				((i + 1) * arenaArtists.length) / tierCount
			);

			const tierArtists = arenaArtists.slice(startIndex, endIndex);

			const tier = document.createElement("div");
			tier.className = `poster-tier tier-${i + 1} mb-5`;

			// Size based on tier
			const fontSize = 28 - i * 5;
			const glowIntensity = 5 - i;

			tierArtists.forEach((artist) => {
				const artistSpan = document.createElement("span");
				artistSpan.className = `artist-name inline-block ${
					isMobile ? "mx-1 my-1" : "mx-3 my-2"
				}`;

				// Adjust font sizes further for mobile
				const fontSize = isMobile
					? isExtraSmall
						? Math.max(11, 18 - i * 2)
						: Math.max(13, 20 - i * 3)
					: 28 - i * 5;
				artistSpan.style.fontSize = `${fontSize}px`;
				artistSpan.style.fontWeight = "800";
				artistSpan.style.color = "#FFFFFF";

				// Reduce glow intensity on mobile
				const glowIntensity = isMobile ? Math.max(1, 3 - i) : 5 - i;
				artistSpan.style.textShadow = `0 0 ${glowIntensity}px #0ff, 0 0 ${
					glowIntensity + 2
				}px rgba(0,255,255,0.8)`;

				artistSpan.style.fontSize = `${fontSize}px`;
				artistSpan.style.fontWeight = "800";
				artistSpan.style.color = "#FFFFFF";
				artistSpan.style.textShadow = `0 0 ${glowIntensity}px #0ff, 0 0 ${
					glowIntensity + 2
				}px rgba(0,255,255,0.8)`;
				artistSpan.style.letterSpacing = isMobile ? "0.5px" : "1px";
				artistSpan.innerText = artist.artist.toUpperCase();
				tier.appendChild(artistSpan);
			});

			arenaSection.appendChild(tier);

			// Add divider lines
			if (i < tierCount - 1 && i < 2) {
				const divider = document.createElement("div");
				divider.className = "my-6 mx-auto w-3/4 opacity-60";
				divider.style.height = "2px";
				divider.style.background =
					"linear-gradient(90deg, rgba(0,255,255,0) 0%, #0ff 50%, rgba(0,255,255,0) 100%)";
				arenaSection.appendChild(divider);
			}
		}

		posterContent.appendChild(arenaSection);
	}

	// Create District X artists section
	if (districtArtists.length > 0) {
		const districtSection = document.createElement("div");
		districtSection.className = "mb-8 mt-4";

		const districtArtistDiv = document.createElement("div");
		districtArtistDiv.className = "flex flex-wrap justify-center";

		districtArtists.forEach((artist) => {
			const artistSpan = document.createElement("span");
			artistSpan.className = `artist-name inline-block mx-2 my-1`;
			artistSpan.style.fontSize = "13px";
			artistSpan.style.fontWeight = "600";
			artistSpan.style.letterSpacing = "0.5px";
			artistSpan.style.color = "#FFFFFF";
			artistSpan.style.textShadow =
				"0 0 3px #0ff, 0 0 5px rgba(0,255,255,0.6)";
			artistSpan.innerText = artist.artist.toUpperCase();
			districtArtistDiv.appendChild(artistSpan);
		});

		districtSection.appendChild(districtArtistDiv);
		posterContent.appendChild(districtSection);
	}

	// Add footer with personalized name
	const footer = document.createElement("div");
	footer.className = "text-sm text-cyan-200 mt-10";
	footer.innerHTML = `
	  <p>DONINGTON PARK 11-15 JUNE 2025</p>
	  <p class="text-xs mt-4 opacity-60">Created with Download Festival Set Times App</p>
	`;
	posterContent.appendChild(footer);

	// Add download button
	const downloadBtn = document.createElement("button");
	downloadBtn.className =
		"mt-6 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-6 rounded-lg flex items-center mx-auto";
	downloadBtn.innerHTML = `
	  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
	  </svg>
	  Download ${displayName} Poster
	`;

	downloadBtn.onclick = () => {
		if (typeof html2canvas !== "undefined") {
			const content = document.getElementById("poster-content");

			html2canvas(content, {
				backgroundColor: "#030b1f",
				scale: 2,
				logging: true,
				allowTaint: true,
				useCORS: true,
			})
				.then((canvas) => {
					console.log("Canvas generated");
					const link = document.createElement("a");
					link.download = `${
						name === "My" ? "my" : name.toLowerCase()
					}-download-festival-lineup.png`;
					link.href = canvas.toDataURL("image/png");
					link.click();
				})
				.catch((err) => {
					console.error("Error generating canvas:", err);
					alert(
						"Sorry, there was an error creating your poster: " +
							err.message
					);
				});
		} else {
			console.error("html2canvas not found");
			alert("Cannot generate download - html2canvas library not loaded.");
		}
	};

	if (isMobile) {
		downloadBtn.className =
			"mt-3 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg flex items-center mx-auto text-sm";
	}

	// Add everything to the DOM
	posterContainer.appendChild(closeBtn);
	posterContainer.appendChild(posterContent);
	posterContainer.appendChild(downloadBtn);
	modal.appendChild(posterContainer);
	document.body.appendChild(modal);
}

function updateActiveStageButton(stage) {
	// Update mobile dropdown display text
	const currentStageElement = document.getElementById("current-stage-mobile");
	if (currentStageElement) {
		currentStageElement.textContent =
			stage === "all"
				? "All Stages"
				: stage.charAt(0).toUpperCase() +
				  stage.slice(1).replace(/\bstage\b/i, "Stage");
	}
}

// Updates the active day button in the desktop UI
function updateActiveDayButton(day) {
	// Update mobile dropdown display text
	const mobileDayElement = document.getElementById("current-day-mobile");
	if (mobileDayElement) {
		mobileDayElement.textContent =
			day.charAt(0).toUpperCase() + day.slice(1);
	}
}

// Updates the mobile dropdowns when clicking desktop buttons
function updateMobileDropdowns(day) {
	// Update the mobile day dropdown text when desktop button is clicked
	document.getElementById("current-day").textContent =
		day.charAt(0).toUpperCase() + day.slice(1);
}

document.addEventListener("DOMContentLoaded", () => {
	loadData().then(() => {
		// Add event listeners
		document
			.getElementById("open-favorites")
			.addEventListener("click", showFavoritesModal);
		document
			.getElementById("close-favorites")
			.addEventListener("click", () => {
				document
					.getElementById("favorites-modal")
					.classList.add("hidden");
			});
		document
			.getElementById("save-favorites")
			.addEventListener("click", saveFavorites);

		const globalToggle = document.getElementById("global-favorites-toggle");
		if (globalToggle) {
			globalToggle.addEventListener("change", function () {
				showFavoritesOnly = this.checked;

				// Save filter state
				localStorage.setItem("showFavoritesOnly", showFavoritesOnly);
				setCookie(FAVORITES_FILTER_KEY, showFavoritesOnly);

				if (showFavoritesOnly) {
					// Going from all artists to favorites only
					// Just animate out non-favorites
					const arenaBlocks = document.querySelectorAll(
						"#schedule .set-block"
					);
					const districtBlocks = document.querySelectorAll(
						"#districtx-schedule .set-block"
					);

					let nonFavoriteCount = 0;

					// Process arena blocks
					arenaBlocks.forEach((block) => {
						const artistName = block
							.querySelector("div")
							.textContent.trim();
						if (!favoriteArtists.includes(artistName)) {
							nonFavoriteCount++;
							block.classList.add("fade-out");
							// Remove after animation
							setTimeout(() => {
								if (block.parentNode)
									block.parentNode.removeChild(block);
							}, 400);
						}
					});

					// Process district X blocks
					districtBlocks.forEach((block) => {
						const artistName = block
							.querySelector("div")
							.textContent.trim();
						if (!favoriteArtists.includes(artistName)) {
							nonFavoriteCount++;
							block.classList.add("fade-out");
							// Remove after animation
							setTimeout(() => {
								if (block.parentNode)
									block.parentNode.removeChild(block);
							}, 400);
						}
					});
				} else {
					// Going from favorites only to all artists
					// Need to redraw everything to add the missing bands
					showDay(currentDay);
					if (data.districtX && data.districtX[districtXCurrentDay]) {
						showDistrictXDay(districtXCurrentDay);
					}
				}
			});
		}

		// Add poster button event listener
		console.log("Looking for poster button");
		const posterButton = document.getElementById("generate-poster");
		if (posterButton) {
			console.log("Poster button found, attaching event listener");
			posterButton.addEventListener("click", generatePersonalizedPoster);
		} else {
			console.warn("Poster button not found in the DOM");
		}
	});
});

document.addEventListener("DOMContentLoaded", function () {
	// Stage dropdown
	const stageDropdownBtn = document.getElementById("stage-dropdown-btn");
	const stageDropdown = document.getElementById("stage-dropdown");
	const currentStage = document.getElementById("current-stage");

	// Day dropdown
	const dayDropdownBtn = document.getElementById("day-dropdown-btn");
	const dayDropdown = document.getElementById("day-dropdown");
	const currentDay = document.getElementById("current-day");

	// Only add event listeners if elements exist
	if (stageDropdownBtn && stageDropdown) {
		stageDropdownBtn.addEventListener("click", function () {
			stageDropdown.classList.toggle("hidden");
			if (dayDropdown) dayDropdown.classList.add("hidden"); // Close other dropdown
		});
	}

	if (dayDropdownBtn && dayDropdown) {
		dayDropdownBtn.addEventListener("click", function () {
			dayDropdown.classList.toggle("hidden");
			if (stageDropdown) stageDropdown.classList.add("hidden"); // Close other dropdown
		});
	}

	// Close dropdowns when clicking outside (only if elements exist)
	document.addEventListener("click", function (event) {
		if (
			stageDropdownBtn &&
			stageDropdown &&
			!stageDropdownBtn.contains(event.target) &&
			!stageDropdown.contains(event.target)
		) {
			stageDropdown.classList.add("hidden");
		}
		if (
			dayDropdownBtn &&
			dayDropdown &&
			!dayDropdownBtn.contains(event.target) &&
			!dayDropdown.contains(event.target)
		) {
			dayDropdown.classList.add("hidden");
		}
	});

	// Sync checkbox state between mobile and desktop (if elements exist)
	const mobileToggle = document.getElementById(
		"global-favorites-toggle-mobile"
	);
	const desktopToggle = document.getElementById(
		"global-favorites-toggle-desktop"
	);

	if (mobileToggle && desktopToggle) {
		mobileToggle.addEventListener("change", () => {
			desktopToggle.checked = mobileToggle.checked;
		});

		desktopToggle.addEventListener("change", () => {
			mobileToggle.checked = desktopToggle.checked;
		});
	}
});

// Do the same for the mobile dropdown handler
document.addEventListener("DOMContentLoaded", function () {
	// Mobile stage dropdown
	const stageDropdownBtnMobile = document.getElementById(
		"stage-dropdown-btn-mobile"
	);
	const stageDropdownMobile = document.getElementById(
		"stage-dropdown-mobile"
	);

	if (stageDropdownBtnMobile && stageDropdownMobile) {
		stageDropdownBtnMobile.addEventListener("click", function () {
			stageDropdownMobile.classList.toggle("hidden");
			const dayDropdownMobile = document.getElementById(
				"day-dropdown-mobile"
			);
			if (dayDropdownMobile) dayDropdownMobile.classList.add("hidden");
		});
	}

	// Mobile day dropdown (with null checks)
	const dayDropdownBtnMobile = document.getElementById(
		"day-dropdown-btn-mobile"
	);
	const dayDropdownMobile = document.getElementById("day-dropdown-mobile");

	if (dayDropdownBtnMobile && dayDropdownMobile) {
		dayDropdownBtnMobile.addEventListener("click", function () {
			dayDropdownMobile.classList.toggle("hidden");
			const stageDropdownMobile = document.getElementById(
				"stage-dropdown-mobile"
			);
			if (stageDropdownMobile)
				stageDropdownMobile.classList.add("hidden");
		});
	}
});

document.addEventListener("DOMContentLoaded", function () {
	// Mobile stage dropdown
	const stageDropdownBtnMobile = document.getElementById(
		"stage-dropdown-btn-mobile"
	);
	const stageDropdownMobile = document.getElementById(
		"stage-dropdown-mobile"
	);
	const stageChevron = stageDropdownBtnMobile?.querySelector("svg");

	// Mobile day dropdown
	const dayDropdownBtnMobile = document.getElementById(
		"day-dropdown-btn-mobile"
	);
	const dayDropdownMobile = document.getElementById("day-dropdown-mobile");
	const dayChevron = dayDropdownBtnMobile?.querySelector("svg");

	// Track open state
	let stageDropdownOpen = false;
	let dayDropdownOpen = false;

	// Stage dropdown toggle
	if (stageDropdownBtnMobile && stageDropdownMobile) {
		stageDropdownBtnMobile.addEventListener("click", function (e) {
			e.stopPropagation(); // Prevent document click

			// Close day dropdown if open
			if (dayDropdownOpen && dayDropdownMobile) {
				closeDropdown(dayDropdownMobile, dayChevron);
				dayDropdownOpen = false;
			}

			// Toggle stage dropdown
			if (stageDropdownOpen) {
				closeDropdown(stageDropdownMobile, stageChevron);
			} else {
				openDropdown(stageDropdownMobile, stageChevron);
			}
			stageDropdownOpen = !stageDropdownOpen;
		});

		// Close when clicking on an option
		stageDropdownMobile
			.querySelectorAll("button[role='menuitem']")
			.forEach((button) => {
				button.addEventListener("click", () => {
					closeDropdown(stageDropdownMobile, stageChevron);
					stageDropdownOpen = false;
				});
			});
	}

	// Day dropdown toggle
	if (dayDropdownBtnMobile && dayDropdownMobile) {
		dayDropdownBtnMobile.addEventListener("click", function (e) {
			e.stopPropagation(); // Prevent document click

			// Close stage dropdown if open
			if (stageDropdownOpen && stageDropdownMobile) {
				closeDropdown(stageDropdownMobile, stageChevron);
				stageDropdownOpen = false;
			}

			// Toggle day dropdown
			if (dayDropdownOpen) {
				closeDropdown(dayDropdownMobile, dayChevron);
			} else {
				openDropdown(dayDropdownMobile, dayChevron);
			}
			dayDropdownOpen = !dayDropdownOpen;
		});

		// Close when clicking on an option
		dayDropdownMobile
			.querySelectorAll("button[role='menuitem']")
			.forEach((button) => {
				button.addEventListener("click", () => {
					closeDropdown(dayDropdownMobile, dayChevron);
					dayDropdownOpen = false;
				});
			});
	}

	// Close dropdowns when clicking outside
	document.addEventListener("click", function () {
		if (stageDropdownOpen && stageDropdownMobile) {
			closeDropdown(stageDropdownMobile, stageChevron);
			stageDropdownOpen = false;
		}
		if (dayDropdownOpen && dayDropdownMobile) {
			closeDropdown(dayDropdownMobile, dayChevron);
			dayDropdownOpen = false;
		}
	});

	// Helper functions for animations
	function openDropdown(dropdown, chevron) {
		dropdown.classList.remove("hidden");
		dropdown.classList.add("dropdown-open");
		if (chevron) {
			chevron.style.transform = "rotate(180deg)";
			chevron.style.transition = "transform 0.3s ease";
		}
	}

	function closeDropdown(dropdown, chevron) {
		dropdown.classList.remove("dropdown-open");
		dropdown.classList.add("dropdown-close");

		if (chevron) {
			chevron.style.transform = "rotate(0deg)";
			chevron.style.transition = "transform 0.3s ease";
		}

		// Add the hidden class after animation completes
		setTimeout(() => {
			dropdown.classList.add("hidden");
			dropdown.classList.remove("dropdown-close");
		}, 300);
	}
});
