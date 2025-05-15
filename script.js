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
const VISITED_KEY = "downloadFestivalVisited";
let eventModal = null;

function showEventDetails(event, set, stage, day, venue) {
	// Remove any existing modal
	hideEventDetails();

	// Create modal element
	eventModal = document.createElement("div");
	eventModal.className = "event-details-modal";

	// Calculate position based on the block's position
	const block = event.currentTarget;
	const rect = block.getBoundingClientRect();
	const scrollTop = window.scrollY || document.documentElement.scrollTop;
	const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

	// Find conflicts for this event
	const conflicts = findConflictsForSet(set, stage, day, venue);

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

	// Rest of the positioning code...
	document.body.appendChild(eventModal);

	// Position it relative to the block
	const modalRect = eventModal.getBoundingClientRect();
	let top = rect.top + scrollTop - modalRect.height - 15;
	let arrowClass = "arrow-bottom";
	if (top < scrollTop + 10) {
		top = rect.bottom + scrollTop + 15;
		arrowClass = "arrow-top";
	}
	let left = rect.left + scrollLeft + rect.width / 2 - modalRect.width / 2;
	if (left < scrollLeft + 10) {
		left = scrollLeft + 10;
	} else if (left + modalRect.width > scrollLeft + window.innerWidth - 10) {
		left = scrollLeft + window.innerWidth - modalRect.width - 10;
	}
	eventModal.style.top = `${top}px`;
	eventModal.style.left = `${left}px`;
	eventModal.classList.add(arrowClass);
}

// Add this new function to find conflicts for a specific set
// Update the findConflictsForSet function with more robust cross-venue checking

function findConflictsForSet(set, stage, day, venue) {
	const conflicts = [];
	const startMin = timeToMinutes(set.start);
	const endMin = timeToMinutes(set.end);

	// For debugging purposes
	console.log(
		`Checking conflicts for ${set.artist} at ${stage} on ${day} (${venue})`
	);
	console.log(
		`Time range: ${set.start}-${set.end} (${startMin}-${endMin} minutes)`
	);

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
						console.log(
							`Found conflict with ${otherSet.artist} (same venue)`
						);
					}
				});
			}
		});
	}

	// Check for conflicts in other venue on same day
	const otherVenue = venue === "arena" ? "districtX" : "arena";

	// Always check the other venue for the same day
	if (data[otherVenue] && data[otherVenue][day]) {
		console.log(`Checking ${otherVenue} for conflicts on ${day}`);

		Object.keys(data[otherVenue][day]).forEach((otherStage) => {
			if (Array.isArray(data[otherVenue][day][otherStage])) {
				data[otherVenue][day][otherStage].forEach((otherSet) => {
					if (!favoriteArtists.includes(otherSet.artist)) return;
					if (!otherSet.start || !otherSet.end) return;

					const otherStart = timeToMinutes(otherSet.start);
					const otherEnd = timeToMinutes(otherSet.end);

					console.log(
						`Comparing: ${set.artist} (${startMin}-${endMin}) vs ${otherSet.artist} (${otherStart}-${otherEnd})`
					);

					if (startMin < otherEnd && endMin > otherStart) {
						conflicts.push({
							artist: otherSet.artist,
							stage: otherStage,
							start: otherSet.start,
							end: otherSet.end,
							venue:
								otherVenue === "arena" ? "Arena" : "District X",
						});
						console.log(
							`Found cross-venue conflict with ${otherSet.artist}`
						);
					}
				});
			}
		});
	} else {
		console.log(`No ${otherVenue} data available for ${day}`);
	}

	console.log(`Total conflicts found: ${conflicts.length}`);
	return conflicts;
}

function hideEventDetails() {
	// Only hide if modal exists and mouse isn't over it
	const modal = eventModal;
	if (modal) {
		// Check if we should actually hide it
		const isHoveringModal = document.querySelector(
			".event-details-modal:hover"
		);
		if (!isHoveringModal) {
			modal.remove();
			eventModal = null;
		}
	}
}

// Add this to your block creation code for both arena and district X blocks
function setupBlockHoverEvents(block, set, stage, day, venue) {
	// Track if we're currently hovering the modal or block
	let isHoveringBlock = false;
	let isHoveringModal = false;

	block.addEventListener("mouseenter", (event) => {
		isHoveringBlock = true;
		showEventDetails(event, set, stage, day, venue);

		// Add mouse enter/leave handlers to the modal
		if (eventModal) {
			eventModal.addEventListener("mouseenter", () => {
				isHoveringModal = true;
			});

			eventModal.addEventListener("mouseleave", () => {
				isHoveringModal = false;
				// Only hide if we're not hovering the block either
				if (!isHoveringBlock) {
					hideEventDetails();
				}
			});
		}
	});

	block.addEventListener("mouseleave", (event) => {
		isHoveringBlock = false;
		// Short delay to allow mouse to enter modal
		setTimeout(() => {
			if (!isHoveringModal) {
				hideEventDetails();
			}
		}, 100);
	});
}

// Cookie utility functions
function setCookie(name, value, days = 30) {
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
	const alertDiv = document.createElement("div");
	alertDiv.className =
		"fixed top-20 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm";
	alertDiv.style.animation = "fadeIn 0.3s ease-out";

	let alertHtml =
		'<h3 class="text-lg font-bold mb-2">Schedule Conflicts</h3>';
	alertHtml +=
		'<p class="mb-2">You have scheduling conflicts with your favorite artists:</p>';
	alertHtml += '<ul class="list-disc pl-5 mb-3">';

	conflicts.forEach((conflict, i) => {
		if (i < 5) {
			// Limit to 5 conflicts to avoid overwhelming
			alertHtml += `<li class="mb-1 text-sm"><span class="font-bold">${conflict.artist1}</span> (${conflict.time1} at ${conflict.stage1}) 
                          and <span class="font-bold">${conflict.artist2}</span> (${conflict.time2} at ${conflict.stage2}) 
                          on <span class="capitalize">${conflict.day}</span></li>`;
		}
	});

	if (conflicts.length > 5) {
		alertHtml += `<li class="text-sm">...and ${
			conflicts.length - 5
		} more</li>`;
	}

	alertHtml += "</ul>";
	alertHtml +=
		'<div class="flex justify-end"><button id="close-alert" class="bg-white text-red-600 px-3 py-1 rounded text-sm font-bold">Close</button></div>';
	alertDiv.innerHTML = alertHtml;

	document.body.appendChild(alertDiv);

	// Add close button functionality
	document.getElementById("close-alert").addEventListener("click", () => {
		alertDiv.style.animation = "fadeOut 0.3s ease-out forwards";
		setTimeout(() => {
			document.body.removeChild(alertDiv);
		}, 300);
	});

	// Auto-close after 15 seconds
	setTimeout(() => {
		if (document.body.contains(alertDiv)) {
			alertDiv.style.animation = "fadeOut 0.3s ease-out forwards";
			setTimeout(() => {
				if (document.body.contains(alertDiv)) {
					document.body.removeChild(alertDiv);
				}
			}, 300);
		}
	}, 15000);
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

		// Reset stage filters
		currentStage = "all";
		districtXCurrentStage = "all";

		// Load favorites first, then show the schedules
		loadFavorites();
		showDay("friday");
		showDistrictXDay("wednesday"); // Start with Wednesday for District X
		checkFirstVisit();
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

		data.arena[day][stage].forEach((set) => {
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
			btn.textContent.trim() === (stage === "all" ? "All Stages" : stage)
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
		data.districtX[day][stage].forEach((set) => {
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
	});
});
