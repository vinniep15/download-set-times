/**
 * Events Module
 * Handles all user interactions and event bindings
 */

import {state} from "./core.js";
import {
	filterStage,
	showDay,
	showDistrictXDay,
	filterDistrictXStage,
	showFavoritesModal,
	hideEventDetails,
	setupDropdowns,
} from "./ui.js";
import {
	saveFavorites,
	toggleFavoriteSet,
	showFavoritesOnly,
} from "./favourites.js";
import {generatePersonalizedPoster} from "./poster.js";
import {saveToStorage} from "./storage.js";

/**
 * Set up all event listeners when the app initializes
 */
export function setupEventListeners() {
	setupNavigationEvents();
	setupFavoritesEvents();
	setupFilterEvents();
	setupMobileEvents();
	setupPosterEvents();
	setupDropdowns(); // Initialize enhanced dropdowns
}

/**
 * Set up navigation (day/stage selection) event listeners
 */
function setupNavigationEvents() {
	// Day selection buttons
	document.querySelectorAll(".day-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			const day = this.textContent.trim().toLowerCase();
			showDay(day);
		});
	});

	// District X day buttons
	document.querySelectorAll(".districtx-day-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			const day = this.textContent.trim().toLowerCase();
			showDistrictXDay(day);
		});
	});

	// Add keyboard navigation for accessibility
	document.addEventListener("keydown", function (e) {
		// Navigate between days with arrow keys when focus is on day buttons
		if (document.activeElement.classList.contains("day-btn")) {
			const days = ["friday", "saturday", "sunday"];
			const currentIndex = days.indexOf(state.currentDay);

			if (e.key === "ArrowRight" && currentIndex < days.length - 1) {
				showDay(days[currentIndex + 1]);
			} else if (e.key === "ArrowLeft" && currentIndex > 0) {
				showDay(days[currentIndex - 1]);
			}
		}
	});
}

/**
 * Set up favorites-related event listeners
 */
function setupFavoritesEvents() {
	// Open favorites modal
	const openFavoritesBtn = document.getElementById("open-favorites");
	if (openFavoritesBtn) {
		openFavoritesBtn.addEventListener("click", showFavoritesModal);
	}

	// Close favorites modal
	const closeFavoritesBtn = document.getElementById("close-favorites");
	if (closeFavoritesBtn) {
		closeFavoritesBtn.addEventListener("click", () => {
			document.getElementById("favorites-modal").classList.add("hidden");
		});
	}

	// Save favorites button
	const saveFavoritesBtn = document.getElementById("save-favorites");
	if (saveFavoritesBtn) {
		saveFavoritesBtn.addEventListener("click", saveFavorites);
	}

	// Favorites modal tab switching
	document.addEventListener("click", function (e) {
		if (e.target.classList.contains("day-tab")) {
			// Remove active class from all tabs
			document.querySelectorAll(".day-tab").forEach((tab) => {
				tab.classList.remove("active-tab");
			});

			// Add active class to clicked tab
			e.target.classList.add("active-tab");

			// Hide all content
			document.querySelectorAll(".day-content").forEach((content) => {
				content.classList.add("hidden");
			});

			// Show selected content
			const day = e.target.dataset.day;
			document
				.getElementById(`${day}-artists`)
				.classList.remove("hidden");
		}
	});

	// Delegate heart icon clicks in the favorites modal
	document.addEventListener("click", function (e) {
		const heartIcon = e.target.closest(".heart-icon");
		if (
			heartIcon &&
			document.getElementById("favorites-modal").contains(heartIcon)
		) {
			const setKey = heartIcon.dataset.setKey;
			const svg = heartIcon.querySelector("svg");
			toggleFavoriteSet(setKey, svg);
		}
	});
}

/**
 * Set up filter events (favorites toggle, stage filters)
 */
function setupFilterEvents() {
	// Global favorites toggle (desktop)
	const globalToggleDesktop = document.getElementById(
		"global-favorites-toggle-desktop"
	);

	if (globalToggleDesktop) {
		globalToggleDesktop.addEventListener("change", function () {
			const isChecked = this.checked;

			import("./favourites.js").then((module) => {
				module.showFavoritesOnly(isChecked);
			});

			// Sync the other toggle
			const mobileToggle = document.getElementById(
				"global-favorites-toggle-mobile"
			);
			if (mobileToggle) mobileToggle.checked = isChecked;
		});
	}

	const globalToggleMobile = document.getElementById(
		"global-favorites-toggle-mobile"
	);

	if (globalToggleMobile) {
		globalToggleMobile.addEventListener("change", function () {
			const isChecked = this.checked;

			import("./favourites.js").then((module) => {
				module.showFavoritesOnly(isChecked);
			});

			// Sync desktop toggle
			const desktopToggle = document.getElementById(
				"global-favorites-toggle-desktop"
			);
			if (desktopToggle) desktopToggle.checked = isChecked;
		});
	}
}

/**
 * Synchronize the state of both mobile and desktop favorites toggles
 */
function syncFavoritesToggle(isChecked) {
	const desktopToggle = document.getElementById("global-favorites-toggle");
	const mobileToggle = document.getElementById(
		"global-favorites-toggle-mobile"
	);

	if (desktopToggle) desktopToggle.checked = isChecked;
	if (mobileToggle) mobileToggle.checked = isChecked;
}

/**
 * Set up mobile-specific event handlers
 */
function setupMobileEvents() {
	// Close popovers and tooltips when tapping elsewhere
	document.addEventListener("click", function () {
		hideEventDetails();
	});

	// Mobile day selection options
	document.addEventListener("click", function (e) {
		const dayMenuItem = e.target.closest("button[data-day]");
		if (dayMenuItem) {
			const day = dayMenuItem.dataset.day;
			showDay(day);
			updateMobileDayText(day.charAt(0).toUpperCase() + day.slice(1));
		}
	});
}

/**
 * Update mobile day text display
 */
function updateMobileDayText(text) {
	const mobileDay = document.getElementById("current-day-mobile");
	if (mobileDay) mobileDay.textContent = text;
}

/**
 * Set up poster generation events
 */
function setupPosterEvents() {
	const existingButton = document.getElementById("generate-poster");
	if (existingButton) {
		// Remove any existing listeners by cloning
		const newButton = existingButton.cloneNode(true);
		existingButton.parentNode.replaceChild(newButton, existingButton);

		// Add event listener using dynamic import
		newButton.addEventListener("click", function () {
			import("./poster.js").then((module) => {
				module.generatePersonalizedPoster();
			});
		});
	}
}

/**
 * Handle document click events outside of specific elements
 */
export function setupOutsideClickListeners() {
	document.addEventListener("click", function (event) {
		// Close any open dropdowns when clicking outside
		const dropdowns = document.querySelectorAll(".dropdown-open");
		dropdowns.forEach((dropdown) => {
			const button = document.getElementById(
				dropdown.id.replace("dropdown", "dropdown-btn")
			);
			if (
				button &&
				!button.contains(event.target) &&
				!dropdown.contains(event.target)
			) {
				const chevron = button.querySelector("svg");
				dropdown.classList.remove("dropdown-open");
				dropdown.classList.add("dropdown-close");

				if (chevron) {
					chevron.style.transform = "rotate(0deg)";
				}

				setTimeout(() => {
					dropdown.classList.add("hidden");
					dropdown.classList.remove("dropdown-close");
				}, 300);
			}
		});
	});
}

/**
 * Window resize handler for responsive adjustments
 */
export function setupResizeHandler() {
	let resizeTimer;

	window.addEventListener("resize", function () {
		clearTimeout(resizeTimer);

		// Debounce resize events
		resizeTimer = setTimeout(function () {
			// Adjust UI for new screen size
			const isMobile = window.innerWidth < 768;
			document.body.classList.toggle("mobile-view", isMobile);

			// Re-render current views to adjust for new screen size
			if (state.currentDay) showDay(state.currentDay);
			if (state.districtXCurrentDay)
				showDistrictXDay(state.districtXCurrentDay);
		}, 250);
	});
}

/**
 * Initialize all the keyboard shortcuts for power users
 */
export function setupKeyboardShortcuts() {
	document.addEventListener("keydown", function (e) {
		// Only if no modals are open and not in an input
		if (
			document.querySelector(".modal:not(.hidden)") ||
			e.target.tagName === "INPUT" ||
			e.target.tagName === "TEXTAREA"
		) {
			return;
		}

		// Day navigation shortcuts
		if (e.key === "1" || e.key === "f") {
			showDay("friday");
		} else if (e.key === "2" || e.key === "s") {
			showDay("saturday");
		} else if (e.key === "3" || e.key === "d") {
			// 'd' for 'domingo'/Sunday
			showDay("sunday");
		}

		// Favorites shortcuts
		if (e.key === "f" && e.ctrlKey) {
			e.preventDefault();
			showFavoritesModal();
		}

		// Toggle favorites only view
		if (e.key === "v") {
			const toggle = document.getElementById("global-favorites-toggle");
			if (toggle) {
				toggle.checked = !toggle.checked;
				toggle.dispatchEvent(new Event("change"));
			}
		}
	});
}
