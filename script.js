let data = {};
let currentDay = "friday";
const allTimes = generateTimeSlots("10:30", "23:00", 15);
let currentStage = "all";
let favoriteArtists = [];
const FAVORITES_KEY = "downloadFestivalFavorites";
const VISITED_KEY = "downloadFestivalVisited";

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

// Add after loadData() function
function showFavoritesModal() {
	const modal = document.getElementById("favorites-modal");

	// Clear existing content
	document.getElementById("friday-artists").innerHTML = "";
	document.getElementById("saturday-artists").innerHTML = "";
	document.getElementById("sunday-artists").innerHTML = "";

	// Populate each day's content
	["friday", "saturday", "sunday"].forEach((day) => {
		if (!data[day] || Object.keys(data[day]).length === 0) return;

		const dayContainer = document.getElementById(`${day}-artists`);

		// Create artist entries grouped by stage
		Object.keys(data[day]).forEach((stage) => {
			const stageDiv = document.createElement("div");
			stageDiv.className = "mb-4";
			stageDiv.innerHTML = `<h4 class="text-md font-semibold text-gray-300 mb-1">${stage}</h4>`;

			const artistsDiv = document.createElement("div");
			artistsDiv.className = "grid grid-cols-2 gap-2";

			data[day][stage].forEach((set) => {
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
                        ${set.artist} (${set.start}-${set.end})
                    </span>
                `;

				artistsDiv.appendChild(artistDiv);
			});

			stageDiv.appendChild(artistsDiv);
			dayContainer.appendChild(stageDiv);
		});
	});

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

	Object.keys(data).forEach((day) => {
		const stages = Object.keys(data[day]);
		const dayConflicts = [];

		// Build an array of all favorite performances for this day
		const favoriteSets = [];
		stages.forEach((stage) => {
			data[day][stage].forEach((set) => {
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
		data = await response.json();

		// Load favorites first, then show the schedule
		loadFavorites();
		showDay("friday");
		checkFirstVisit();
	} catch (error) {
		console.error("Error loading set times:", error);
		document.getElementById(
			"schedule"
		).innerHTML = `<div class="text-red-500 p-4">Failed to load festival data. Please try again later.</div>`;
	}
}

function generateTimeSlots(start, end, intervalMinutes) {
	const slots = [];
	const [startHour, startMin] = start.split(":").map(Number);
	const [endHour, endMin] = end.split(":").map(Number);
	let current = new Date(0, 0, 0, startHour, startMin);
	const endTime = new Date(0, 0, 0, endHour, endMin);

	while (current <= endTime) {
		slots.push(current.toTimeString().slice(0, 5));
		current.setMinutes(current.getMinutes() + intervalMinutes);
	}
	return slots;
}

function timeToMinutes(time) {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

function showDay(day) {
	const stages = Object.keys(data[day]);
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
			.map(
				(t) =>
					`<div class="time-slot text-sm text-center py-2">${t}</div>`
			)
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

		data[day][stage].forEach((set) => {
			if (!set.start || !set.end) return; // Skip entries without times

			const startMin = timeToMinutes(set.start);
			const endMin = timeToMinutes(set.end);
			const dayStart = timeToMinutes(allTimes[0]);
			const left = ((startMin - dayStart) / 15) * 60;
			const width = ((endMin - startMin) / 15) * 60;

			const block = document.createElement("div");
			block.className = "set-block";

			// Check if this is a favorite artist
			const isFavorite = favoriteArtists.includes(set.artist);

			// Check for conflicts with other favorites
			let hasConflict = false;
			if (isFavorite) {
				// Loop through all favorites in this day to check for time conflicts
				for (const otherStage of stages) {
					if (otherStage === stage) continue; // Skip same stage

					for (const otherSet of data[day][otherStage]) {
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
			block.innerText = set.artist;

			row.appendChild(block);
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
