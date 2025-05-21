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
	// fixArenaDropdowns(); // No longer needed
}

// Track currently open mobile dropdown and arrow
let openMobileDropdown = null;
let openMobileArrow = null;

/**
 * Set up a simple dropdown with direct DOM manipulation
 */
function setupSimpleDropdown(btnId, menuId) {
	const btn = document.getElementById(btnId);
	const menu = document.getElementById(menuId);

	if (!btn || !menu) {
		return;
	}

	// Create a clean button to avoid stale event listeners
	const newBtn = btn.cloneNode(true);
	btn.parentNode.replaceChild(newBtn, btn);

	newBtn.addEventListener("click", function (e) {
		e.preventDefault();
		e.stopPropagation();

		const arrow = this.querySelector("svg");

		// If another dropdown is open, close it first
		if (openMobileDropdown && openMobileDropdown !== menu) {
			openMobileDropdown.classList.add("hidden");
			openMobileDropdown.style.display = "none";
			if (openMobileArrow) openMobileArrow.style.transform = "";
			openMobileDropdown = null;
			openMobileArrow = null;
		}

		const isHidden = menu.classList.contains("hidden");
		if (isHidden) {
			// Show dropdown
			menu.classList.remove("hidden");
			menu.style.display = "block";
			if (arrow) arrow.style.transform = "rotate(180deg)";
			openMobileDropdown = menu;
			openMobileArrow = arrow;
		} else {
			// Hide dropdown
			menu.classList.add("hidden");
			menu.style.display = "none";
			if (arrow) arrow.style.transform = "";
			openMobileDropdown = null;
			openMobileArrow = null;
		}
	});

	// Add click handlers to menu items (delegated, so always works after repopulation)
	const menuContainer = menu.querySelector('div[role="menu"]');
	if (menuContainer) {
		menuContainer.addEventListener("click", function (event) {
			const button = event.target.closest("button");
			if (button) {
				menu.classList.add("hidden");
				menu.style.display = "none";
				const arrow = newBtn.querySelector("svg");
				if (arrow) arrow.style.transform = "";
				openMobileDropdown = null;
				openMobileArrow = null;
			}
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
	const dropdown = document.getElementById("districtx-stage-dropdown-mobile");
	if (!dropdown) {
		return;
	}

	const menuContainer = dropdown.querySelector('div[role="menu"]');
	if (!menuContainer) {
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
		// Add a fallback option if the loop fails
		const errorBtn = document.createElement("button");
		errorBtn.className =
			"block w-full text-left px-4 py-2 text-sm text-red-500";
		errorBtn.textContent = "Error loading stages";
		menuContainer.appendChild(errorBtn);
	}
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
}

/**
 * Direct fix for Arena dropdowns not showing
 */
export function fixArenaDropdowns() {
	// No longer needed; handled by improved setupSimpleDropdown
}

/**
 * Populate the Arena stage filter dropdown
 */
export function populateArenaStageDropdown(stageNames) {
	const dropdown = document.getElementById("stage-dropdown-mobile");
	if (!dropdown) {
		return;
	}

	const menuContainer = dropdown.querySelector('div[role="menu"]');
	if (!menuContainer) {
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
	} catch (error) {}
}
