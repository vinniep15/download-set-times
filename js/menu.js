/**
 * Menu Module
 * Handles side menu functionality
 */
document.addEventListener("DOMContentLoaded", function () {
	initializeMenu();

	// Re-initialize after dynamic content loads
	document.addEventListener("contentLoaded", initializeMenu);
});

/**
 * Initialize the side menu functionality
 */
function initializeMenu() {
	// Get menu elements
	const menuBtn = document.getElementById("menu-toggle-btn");
	const closeBtn = document.getElementById("menu-close-btn");
	const overlay = document.getElementById("menu-overlay");
	const sideMenu = document.getElementById("side-menu");
	const menuFavorites = document.getElementById("menu-favorites");
	const menuPosterGenerate = document.getElementById("menu-poster-generate");
	const menuMapBtn = document.getElementById("menu-map-btn");

	// Check if we're on the index page
	const isIndexPage =
		window.location.pathname.includes("index.html") ||
		window.location.pathname.endsWith("/") ||
		window.location.pathname.endsWith("/download-set-times/");

	// Show/hide index-only elements
	const indexOnlyElements = document.querySelectorAll(".index-only");
	indexOnlyElements.forEach((element) => {
		if (isIndexPage) {
			element.style.display = "";
		} else {
			element.style.display = "none";
		}
	});

	// Toggle menu visibility
	if (menuBtn) {
		menuBtn.addEventListener("click", function () {
			overlay.classList.add("active");
			sideMenu.classList.add("active");
			document.body.style.overflow = "hidden"; // Prevent scrolling
		});
	}

	// Close menu
	function closeMenu() {
		overlay.classList.remove("active");
		sideMenu.classList.remove("active");
		document.body.style.overflow = ""; // Restore scrolling
	}

	if (closeBtn) {
		closeBtn.addEventListener("click", closeMenu);
	}

	if (overlay) {
		overlay.addEventListener("click", closeMenu);
	}

	// Handle menu item clicks
	if (menuFavorites) {
		menuFavorites.addEventListener("click", function () {
			// Call the showFavoritesModal function
			if (typeof window.showFavoritesModal === "function") {
				window.showFavoritesModal();
			}
			closeMenu();
		});
	}

	if (menuPosterGenerate) {
		menuPosterGenerate.addEventListener("click", function () {
			// Call the generate poster function
			if (typeof window.generatePersonalizedPoster === "function") {
				window.generatePersonalizedPoster();
			}
			closeMenu();
		});
	}

	if (menuMapBtn) {
		menuMapBtn.addEventListener("click", function () {
			// Directly open the map modal
			const mapModal = document.getElementById("map-modal");
			if (mapModal) {
				mapModal.classList.remove("hidden");
			}
			closeMenu();
		});
	}
}
