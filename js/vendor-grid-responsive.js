/**
 * vendor-grid-responsive.js
 *
 * This script ensures the vendor grid displays correctly on all screen sizes,
 * particularly focusing on stacking vendor bubbles in a vertical column on mobile devices.
 */

(function () {
	// Run when DOM is fully loaded
	document.addEventListener("DOMContentLoaded", initVendorGridResponsive);

	// Run when window is fully loaded
	window.addEventListener("load", initVendorGridResponsive);

	// Run when window is resized
	window.addEventListener("resize", debounce(handleResize, 250));

	// Handle page show events (like back navigation)
	window.addEventListener("pageshow", function (event) {
		// The persisted property indicates if the page is loaded from cache
		if (event.persisted) {
			initVendorGridResponsive();
		}
	});

	/**
	 * Initialize the responsive behavior for vendor grid
	 */
	function initVendorGridResponsive() {
		const vendorGrid = document.getElementById("vendorGrid");
		if (!vendorGrid) return;

		applyResponsiveLayout(vendorGrid);

		// Also ensure each vendor bubble has proper animation delays for staggered appearance
		const vendorBubbles = vendorGrid.querySelectorAll(".vendor-bubble");
		vendorBubbles.forEach((bubble, index) => {
			// Add animation delay for staggered appearance
			bubble.style.animationDelay = `${index * 0.1}s`;

			// Add random animation delay for glow effect
			const randomDelay = Math.random() * 3;
			bubble.style.setProperty("--animation-delay", `${randomDelay}s`);
		});
	}

	/**
	 * Handle window resize events
	 */
	function handleResize() {
		const vendorGrid = document.getElementById("vendorGrid");
		if (vendorGrid && vendorGrid.style.display !== "none") {
			applyResponsiveLayout(vendorGrid);
		}
	}

	/**
	 * Apply the appropriate layout based on screen size
	 */
	function applyResponsiveLayout(vendorGrid) {
		if (window.innerWidth <= 640) {
			// For mobile devices - ensure column layout
			vendorGrid.classList.add("vendor-grid-mobile");
			vendorGrid.style.flexDirection = "column";
			vendorGrid.style.alignItems = "center";
			vendorGrid.style.justifyContent = "flex-start";

			// Also style each vendor bubble
			const bubbles = vendorGrid.querySelectorAll(".vendor-bubble");
			bubbles.forEach((bubble) => {
				bubble.style.width = "85%";
				bubble.style.maxWidth = "180px";
				bubble.style.margin = "0 auto 1.5rem auto";
			});
		} else if (
			window.innerWidth <= 768 &&
			window.matchMedia("(orientation: landscape)").matches
		) {
			// For landscape tablets - flex row with wrap
			vendorGrid.classList.remove("vendor-grid-mobile");
			vendorGrid.style.flexDirection = "row";
			vendorGrid.style.flexWrap = "wrap";
			vendorGrid.style.justifyContent = "center";

			// Reset bubble margins
			const bubbles = vendorGrid.querySelectorAll(".vendor-bubble");
			bubbles.forEach((bubble) => {
				bubble.style.margin = "";
			});
		} else {
			// For larger screens - flex row with wrap
			vendorGrid.classList.remove("vendor-grid-mobile");
			vendorGrid.style.flexDirection = "row";
			vendorGrid.style.flexWrap = "wrap";
			vendorGrid.style.justifyContent = "center";

			// Reset bubble margins
			const bubbles = vendorGrid.querySelectorAll(".vendor-bubble");
			bubbles.forEach((bubble) => {
				bubble.style.margin = "";
			});
		}
	}

	/**
	 * Debounce function to limit how often a function is called
	 */
	function debounce(func, wait) {
		let timeout;
		return function () {
			const context = this;
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				func.apply(context, args);
			}, wait);
		};
	}

	// Expose the applyResponsiveLayout function globally
	window.applyResponsiveLayout = applyResponsiveLayout;
})();
