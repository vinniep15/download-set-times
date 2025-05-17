/**
 * Dropdowns Module
 * Handles all dropdown menu functionality including animations and state management
 */

import {state} from "./core.js";
import {
	filterStage,
	filterDistrictXStage,
	showDay,
	showDistrictXDay,
	updateMobileStageText,
	updateMobileDayText,
} from "./ui.js";

/**
 * Set up all dropdowns
 */
export function setupDropdowns() {
	console.log("Setting up all dropdowns with simplified approach");

	// MOBILE DROPDOWNS - Direct approach
	setupSimpleDropdown("stage-dropdown-btn-mobile", "stage-dropdown-mobile");
	setupSimpleDropdown("day-dropdown-btn-mobile", "day-dropdown-mobile");
	setupSimpleDropdown(
		"districtx-stage-dropdown-btn-mobile",
		"districtx-stage-dropdown-mobile"
	);
	setupSimpleDropdown(
		"districtx-day-dropdown-btn-mobile",
		"districtx-day-dropdown-mobile"
	);

	// DESKTOP DROPDOWNS
	setupDesktopDropdowns();

	// OUTSIDE CLICK HANDLER
	setupOutsideClickHandler();

	fixArenaDropdowns();
}

/**
 * Set up a simple dropdown with direct DOM manipulation
 */
function setupSimpleDropdown(btnId, menuId) {
	const btn = document.getElementById(btnId);
	const menu = document.getElementById(menuId);

	if (!btn || !menu) {
		console.warn(`Dropdown elements not found for ${btnId} / ${menuId}`);
		return;
	}

	// Create a clean button to avoid stale event listeners
	const newBtn = btn.cloneNode(true);
	btn.parentNode.replaceChild(newBtn, btn);

	newBtn.addEventListener("click", function (e) {
		e.preventDefault();
		e.stopPropagation();

		// Close all other dropdowns
		document
			.querySelectorAll("[id$='-dropdown-mobile']")
			.forEach((dropdown) => {
				if (dropdown.id !== menuId) {
					dropdown.classList.add("hidden");
					dropdown.style.display = "none";
				}
			});

		// Reset all other arrows
		document
			.querySelectorAll("[id$='-dropdown-btn-mobile'] svg")
			.forEach((arrow) => {
				if (!arrow.closest(`#${btnId}`)) {
					arrow.style.transform = "";
				}
			});

		// Toggle this dropdown
		const isHidden = menu.classList.contains("hidden");
		if (isHidden) {
			// Show dropdown
			menu.classList.remove("hidden");
			menu.style.display = "block";

			// Rotate arrow
			const arrow = this.querySelector("svg");
			if (arrow) arrow.style.transform = "rotate(180deg)";
		} else {
			// Hide dropdown
			menu.classList.add("hidden");
			menu.style.display = "none";

			// Reset arrow
			const arrow = this.querySelector("svg");
			if (arrow) arrow.style.transform = "";
		}
	});

	// Add click handlers to menu items
	const menuContainer = menu.querySelector('div[role="menu"]');
	if (menuContainer) {
		menuContainer.querySelectorAll("button").forEach((button) => {
			button.addEventListener("click", () => {
				// Hide the dropdown after selection
				menu.classList.add("hidden");
				menu.style.display = "none";

				// Reset arrow
				const arrow = newBtn.querySelector("svg");
				if (arrow) arrow.style.transform = "";
			});
		});
	}
}

/**
 * Set up desktop dropdowns
 */
function setupDesktopDropdowns() {
	const dropdowns = [
		{
			btnId: "stage-dropdown-btn",
			menuId: "stage-dropdown",
			currentTextId: "current-stage",
		},
		{
			btnId: "day-dropdown-btn",
			menuId: "day-dropdown",
			currentTextId: "current-day",
		},
		{
			btnId: "districtx-stage-dropdown-btn",
			menuId: "districtx-stage-dropdown",
			currentTextId: "districtx-current-stage",
		},
		{
			btnId: "districtx-day-dropdown-btn",
			menuId: "districtx-day-dropdown",
			currentTextId: "districtx-current-day",
		},
	];

	dropdowns.forEach((dropdown) => {
		const btn = document.getElementById(dropdown.btnId);
		const menu = document.getElementById(dropdown.menuId);

		if (!btn || !menu) return;

		btn.addEventListener("click", (e) => {
			e.stopPropagation();

			// Close other desktop dropdowns
			dropdowns.forEach((other) => {
				if (other.menuId !== dropdown.menuId) {
					const otherMenu = document.getElementById(other.menuId);
					if (otherMenu && !otherMenu.classList.contains("hidden")) {
						otherMenu.classList.add("hidden");
					}
				}
			});

			// Toggle this dropdown
			menu.classList.toggle("hidden");
		});

		// Set up menu item handlers
		setupMenuItemClickHandlers(menu, dropdown.currentTextId);
	});
}

/**
 * Set up click handlers for menu items
 */
function setupMenuItemClickHandlers(menu, currentTextId) {
	if (!menu) return;

	const menuItems = menu.querySelectorAll(
		"button[role='menuitem'], button[data-day]"
	);
	menuItems.forEach((item) => {
		item.addEventListener("click", () => {
			// Handle selection
			if (item.dataset.day) {
				// Day selection
				const day = item.dataset.day;
				showDay(day);
				updateMobileDayText(day.charAt(0).toUpperCase() + day.slice(1));
			} else {
				// Other menu items - update display text
				const currentTextElement =
					document.getElementById(currentTextId);
				if (currentTextElement) {
					currentTextElement.textContent = item.textContent;
				}
			}

			// Close the dropdown
			menu.classList.add("hidden");
		});
	});
}

/**
 * Handle clicks outside dropdowns to close them
 */
function setupOutsideClickHandler() {
	document.addEventListener("click", (e) => {
		// If click is outside any dropdown button or menu
		if (
			!e.target.closest("[id$='-dropdown-btn']") &&
			!e.target.closest("[id$='-dropdown']")
		) {
			// Close all dropdowns
			document
				.querySelectorAll("[id$='-dropdown']")
				.forEach((dropdown) => {
					dropdown.classList.add("hidden");
				});

			// Reset all mobile dropdowns
			document
				.querySelectorAll("[id$='-dropdown-mobile']")
				.forEach((dropdown) => {
					dropdown.classList.add("hidden");
					dropdown.style.display = "none";
				});

			// Reset all arrows
			document
				.querySelectorAll("[id$='-dropdown-btn-mobile'] svg")
				.forEach((arrow) => {
					arrow.style.transform = "";
				});
		}
	});
}

/**
 * Populate the District X stage filter dropdown
 */
export function populateDistrictXStageDropdown(stageNames) {
	console.log("Populating District X dropdown with stage names:", stageNames);

	const dropdown = document.getElementById("districtx-stage-dropdown-mobile");
	if (!dropdown) {
		console.error("District X stage dropdown not found");
		return;
	}

	const menuContainer = dropdown.querySelector('div[role="menu"]');
	if (!menuContainer) {
		console.error("District X stage dropdown menu container not found");
		return;
	}

	// Clear existing menu items
	menuContainer.innerHTML = "";

	// Add "All Stages" option
	const allStagesBtn = document.createElement("button");
	allStagesBtn.className =
		"block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700";
	allStagesBtn.setAttribute("role", "menuitem");
	allStagesBtn.textContent = "All Stages";
	allStagesBtn.onclick = function () {
		filterDistrictXStage("all");
		updateDistrictXMobileStageText("All Stages");
	};
	menuContainer.appendChild(allStagesBtn);

	// Add individual stage options with error handling
	try {
		// Check if we have districtX stages or use arena stages as fallback
		const stages =
			stageNames &&
			stageNames.districtX &&
			stageNames.districtX.length > 0
				? stageNames.districtX
				: stageNames && stageNames.arena && stageNames.arena.length > 0
				? stageNames.arena
				: ["tent", "doghouse"];

		console.log("Using District X stages:", stages);

		stages.forEach((stage) => {
			const stageBtn = document.createElement("button");
			stageBtn.className =
				"block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700";
			stageBtn.setAttribute("role", "menuitem");

			// Format stage name for display
			const displayName =
				stage.charAt(0).toUpperCase() +
				stage.slice(1).replace(/\bstage\b/i, "Stage");
			stageBtn.textContent = displayName;

			stageBtn.onclick = function () {
				filterDistrictXStage(stage);
				updateDistrictXMobileStageText(displayName);
			};

			menuContainer.appendChild(stageBtn);
		});
	} catch (error) {
		console.error("Error populating District X stage dropdown:", error);

		// Add a fallback option if the loop fails
		const errorBtn = document.createElement("button");
		errorBtn.className =
			"block w-full text-left px-4 py-2 text-sm text-red-500";
		errorBtn.textContent = "Error loading stages";
		menuContainer.appendChild(errorBtn);
	}

	console.log("District X stage dropdown populated successfully");
}

/**
 * Populate day dropdown options
 */
export function populateDayDropdown(days) {
	const dropdown = document.getElementById("day-dropdown-mobile");
	if (!dropdown) return;

	const menuContainer = dropdown.querySelector('div[role="menu"]');
	if (!menuContainer) return;

	// Clear existing options
	menuContainer.innerHTML = "";

	// Add day options
	days.forEach((day) => {
		const dayButton = document.createElement("button");
		dayButton.className =
			"block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700";
		dayButton.setAttribute("role", "menuitem");
		dayButton.setAttribute("data-day", day.toLowerCase());

		// Format day name
		const dayName = day.charAt(0).toUpperCase() + day.slice(1);
		dayButton.textContent = dayName;

		menuContainer.appendChild(dayButton);
	});
}

/**
 * Set the active day in both dropdowns
 */
export function setActiveDay(day) {
	// Update mobile dropdown text
	const mobileText = document.getElementById("current-day-mobile");
	if (mobileText) {
		mobileText.textContent = day.charAt(0).toUpperCase() + day.slice(1);
	}

	// Update desktop dropdown text
	const desktopText = document.getElementById("current-day");
	if (desktopText) {
		desktopText.textContent = day.charAt(0).toUpperCase() + day.slice(1);
	}
}

/**
 * Set the active stage in both dropdowns
 */
export function setActiveStage(stage) {
	const displayText =
		stage === "all"
			? "All Stages"
			: stage.charAt(0).toUpperCase() +
			  stage.slice(1).replace(/\bstage\b/i, "Stage");

	// Update mobile dropdown text
	const mobileText = document.getElementById("current-stage-mobile");
	if (mobileText) {
		mobileText.textContent = displayText;
	}

	// Update desktop dropdown text
	const desktopText = document.getElementById("current-stage");
	if (desktopText) {
		desktopText.textContent = displayText;
	}
}

/**
 * Set the active day for District X in both dropdowns
 */
export function setDistrictXActiveDay(day) {
	// Update mobile dropdown text
	const mobileText = document.getElementById("districtx-current-day-mobile");
	if (mobileText) {
		mobileText.textContent = day.charAt(0).toUpperCase() + day.slice(1);
	}

	// Update desktop dropdown text
	const desktopText = document.getElementById("districtx-current-day");
	if (desktopText) {
		desktopText.textContent = day.charAt(0).toUpperCase() + day.slice(1);
	}
}

/**
 * Set the active stage for District X in both dropdowns
 */
export function setDistrictXActiveStage(stage) {
	const displayText =
		stage === "all"
			? "All Stages"
			: stage.charAt(0).toUpperCase() +
			  stage.slice(1).replace(/\bstage\b/i, "Stage");

	// Update mobile dropdown text
	const mobileText = document.getElementById(
		"districtx-current-stage-mobile"
	);
	if (mobileText) {
		mobileText.textContent = displayText;
	}

	// Update desktop dropdown text
	const desktopText = document.getElementById("districtx-current-stage");
	if (desktopText) {
		desktopText.textContent = displayText;
	}
}

/**
 * Update District X mobile day text display
 */
export function updateDistrictXMobileDayText(text) {
	const dayText = document.getElementById("districtx-current-day-mobile");
	if (dayText) dayText.textContent = text;
}

/**
 * Update District X mobile stage text display
 */
export function updateDistrictXMobileStageText(text) {
	const stageText = document.getElementById("districtx-current-stage-mobile");
	if (stageText) stageText.textContent = text;
}

// For backward compatibility
export function setupDistrictXDropdownsDirectly() {
	// This is now handled by setupDropdowns
	console.log("setupDistrictXDropdownsDirectly is deprecated");
}

export function setupMobileDropdownsExceptDistrictX() {
	// This is now handled by setupDropdowns
	console.log("setupMobileDropdownsExceptDistrictX is deprecated");
}

/**
 * Direct fix for Arena dropdowns not showing
 */
export function fixArenaDropdowns() {
	console.log("Applying direct fix to Arena dropdowns");

	// Stage dropdown fix
	const stageBtn = document.getElementById("stage-dropdown-btn-mobile");
	const stageMenu = document.getElementById("stage-dropdown-mobile");

	if (stageBtn && stageMenu) {
		// Remove old listeners by replacing with fresh clone
		const newStageBtn = stageBtn.cloneNode(true);
		stageBtn.parentNode.replaceChild(newStageBtn, stageBtn);

		// Extra-strength click handler
		newStageBtn.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			console.log("Arena stage dropdown clicked");

			// Force close any open dropdowns
			document
				.querySelectorAll("div[id$='-dropdown-mobile']")
				.forEach((menu) => {
					if (menu.id !== "stage-dropdown-mobile") {
						menu.classList.add("hidden");
						menu.style.display = "none";
					}
				});

			// Toggle with maximum force
			if (stageMenu.classList.contains("hidden")) {
				// Show dropdown with priority styling
				stageMenu.classList.remove("hidden");
				stageMenu.style.cssText =
					"display: block !important; z-index: 9999 !important; position: absolute !important;";
				console.log("SHOWING Arena stage dropdown");

				// Rotate arrow
				const arrow = this.querySelector("svg");
				if (arrow) arrow.style.transform = "rotate(180deg)";
			} else {
				// Hide dropdown
				stageMenu.classList.add("hidden");
				stageMenu.style.display = "none";
				console.log("HIDING Arena stage dropdown");

				// Reset arrow
				const arrow = this.querySelector("svg");
				if (arrow) arrow.style.transform = "";
			}
		});
	}

	// Day dropdown (same approach)
	const dayBtn = document.getElementById("day-dropdown-btn-mobile");
	const dayMenu = document.getElementById("day-dropdown-mobile");

	if (dayBtn && dayMenu) {
		// Remove old listeners
		const newDayBtn = dayBtn.cloneNode(true);
		dayBtn.parentNode.replaceChild(newDayBtn, dayBtn);

		// Extra-strength click handler
		newDayBtn.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			console.log("Arena day dropdown clicked");

			// Force close any open dropdowns
			document
				.querySelectorAll("div[id$='-dropdown-mobile']")
				.forEach((menu) => {
					if (menu.id !== "day-dropdown-mobile") {
						menu.classList.add("hidden");
						menu.style.display = "none";
					}
				});

			// Toggle with maximum force
			if (dayMenu.classList.contains("hidden")) {
				// Show dropdown with priority styling
				dayMenu.classList.remove("hidden");
				dayMenu.style.cssText =
					"display: block !important; z-index: 9999 !important; position: absolute !important;";
				console.log("SHOWING Arena day dropdown");

				// Rotate arrow
				const arrow = this.querySelector("svg");
				if (arrow) arrow.style.transform = "rotate(180deg)";
			} else {
				// Hide dropdown
				dayMenu.classList.add("hidden");
				dayMenu.style.display = "none";
				console.log("HIDING Arena day dropdown");

				// Reset arrow
				const arrow = this.querySelector("svg");
				if (arrow) arrow.style.transform = "";
			}
		});
	}
}

/**
 * Populate the Arena stage filter dropdown
 */
export function populateArenaStageDropdown(stageNames) {
	console.log("Populating Arena dropdown with stage names:", stageNames);

	const dropdown = document.getElementById("stage-dropdown-mobile");
	if (!dropdown) {
		console.error("Arena stage dropdown not found");
		return;
	}

	const menuContainer = dropdown.querySelector('div[role="menu"]');
	if (!menuContainer) {
		console.error("Arena stage dropdown menu container not found");
		return;
	}

	// Clear existing menu items
	menuContainer.innerHTML = "";

	// Add "All Stages" option
	const allStagesBtn = document.createElement("button");
	allStagesBtn.className =
		"block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700";
	allStagesBtn.setAttribute("role", "menuitem");
	allStagesBtn.textContent = "All Stages";
	allStagesBtn.onclick = function () {
		filterStage("all");
		updateMobileStageText("All Stages");
	};
	menuContainer.appendChild(allStagesBtn);

	// Add individual stage options
	try {
		const stages =
			stageNames && stageNames.arena && stageNames.arena.length > 0
				? stageNames.arena
				: ["Main Stage", "Second Stage", "Avalanche", "Dogtooth"];

		console.log("Using Arena stages:", stages);

		stages.forEach((stage) => {
			const stageBtn = document.createElement("button");
			stageBtn.className =
				"block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700";
			stageBtn.setAttribute("role", "menuitem");

			// Format stage name for display
			const displayName =
				stage.charAt(0).toUpperCase() +
				stage.slice(1).replace(/\bstage\b/i, "Stage");
			stageBtn.textContent = displayName;

			stageBtn.onclick = function () {
				filterStage(stage);
				updateMobileStageText(displayName);
			};

			menuContainer.appendChild(stageBtn);
		});
	} catch (error) {
		console.error("Error populating Arena stage dropdown:", error);
	}

	console.log("Arena stage dropdown populated successfully");
}
