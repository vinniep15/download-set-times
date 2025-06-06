/**
 * vendor-responsive-test.js
 *
 * This script helps test the responsive behavior of the vendor bubbles in the vendors page.
 * It doesn't modify any functionality but adds visual indicators and tools to verify
 * that the responsive design is working correctly.
 *
 * Usage:
 * - Include this script in vendors.html
 * - Open vendors.html in a browser and resize the window to test responsiveness
 * - The script adds a small floating panel showing the current window width
 * - It also adds visual indicators to the vendor bubbles at mobile sizes
 */

(function () {
	document.addEventListener("DOMContentLoaded", function () {
		// Create test panel
		const panel = document.createElement("div");
		panel.style.position = "fixed";
		panel.style.bottom = "10px";
		panel.style.right = "10px";
		panel.style.padding = "8px 12px";
		panel.style.backgroundColor = "rgba(0,0,0,0.7)";
		panel.style.color = "#00ffc3";
		panel.style.borderRadius = "4px";
		panel.style.fontSize = "12px";
		panel.style.zIndex = "9999";
		panel.style.fontFamily = "monospace";
		panel.style.boxShadow = "0 0 10px rgba(0,255,195,0.5)";
		panel.id = "responsive-test-panel";

		// Create width indicator
		const widthIndicator = document.createElement("div");
		widthIndicator.id = "width-indicator";
		panel.appendChild(widthIndicator);

		// Create mobile mode indicator
		const mobileIndicator = document.createElement("div");
		mobileIndicator.id = "mobile-indicator";
		panel.appendChild(mobileIndicator);

		// Add a check mode toggle
		const checkButton = document.createElement("button");
		checkButton.textContent = "Toggle Highlight";
		checkButton.style.padding = "4px 8px";
		checkButton.style.backgroundColor = "#23bfcf";
		checkButton.style.color = "black";
		checkButton.style.border = "none";
		checkButton.style.borderRadius = "2px";
		checkButton.style.marginTop = "5px";
		checkButton.style.fontSize = "11px";
		checkButton.style.cursor = "pointer";
		checkButton.onclick = toggleHighlight;
		panel.appendChild(checkButton);

		// Add panel to body
		document.body.appendChild(panel);

		// Update indicators on load and resize
		updateIndicators();
		window.addEventListener("resize", updateIndicators);

		// Check stacking on load and after a delay
		setTimeout(checkVendorStacking, 2000);
		setTimeout(checkVendorStacking, 5000);

		// Variable to track highlight mode
		let highlightMode = false;

		function updateIndicators() {
			const width = window.innerWidth;
			const isMobileView = width <= 640;

			widthIndicator.textContent = `Width: ${width}px`;
			widthIndicator.style.color = isMobileView ? "#00ffc3" : "white";

			mobileIndicator.textContent = isMobileView
				? "MOBILE MODE ✓"
				: "DESKTOP MODE";
			mobileIndicator.style.color = isMobileView ? "#00ffc3" : "white";

			// Check stacking whenever window resizes
			checkVendorStacking();
		}

		function checkVendorStacking() {
			const vendorGrid = document.getElementById("vendorGrid");
			if (!vendorGrid || vendorGrid.style.display === "none") return;

			const bubbles = vendorGrid.querySelectorAll(".vendor-bubble");
			if (bubbles.length < 2) return;

			const isMobileView = window.innerWidth <= 640;
			const correctLayout = isMobileView ? "column" : "row";

			// Check if grid has correct display direction
			const computedStyle = window.getComputedStyle(vendorGrid);
			const currentDirection = computedStyle.flexDirection;

			// Update panel with result
			const stackingIndicator = document.createElement("div");
			stackingIndicator.textContent = `Stacking: ${
				currentDirection === correctLayout ? "CORRECT ✓" : "INCORRECT ✗"
			}`;
			stackingIndicator.style.color =
				currentDirection === correctLayout ? "#00ffc3" : "#ff6b6b";

			// Replace any existing indicator
			const existingIndicator = panel.querySelector(
				".stacking-indicator"
			);
			if (existingIndicator) {
				panel.removeChild(existingIndicator);
			}

			stackingIndicator.className = "stacking-indicator";
			panel.appendChild(stackingIndicator);
		}

		function toggleHighlight() {
			highlightMode = !highlightMode;

			const vendorGrid = document.getElementById("vendorGrid");
			if (!vendorGrid) return;

			if (highlightMode) {
				vendorGrid.style.outline = "2px dashed #00ffc3";
				vendorGrid.style.backgroundColor = "rgba(0, 255, 195, 0.2)";

				const bubbles = vendorGrid.querySelectorAll(".vendor-bubble");
				bubbles.forEach((bubble, index) => {
					bubble.dataset.originalBoxShadow = bubble.style.boxShadow;
					bubble.style.boxShadow = "0 0 10px rgba(255, 255, 0, 0.8)";
					bubble.style.position = "relative";

					// Add index number
					if (!bubble.querySelector(".bubble-index")) {
						const indexEl = document.createElement("div");
						indexEl.className = "bubble-index";
						indexEl.textContent = index + 1;
						indexEl.style.position = "absolute";
						indexEl.style.top = "-10px";
						indexEl.style.right = "-10px";
						indexEl.style.backgroundColor = "black";
						indexEl.style.color = "yellow";
						indexEl.style.borderRadius = "50%";
						indexEl.style.width = "20px";
						indexEl.style.height = "20px";
						indexEl.style.display = "flex";
						indexEl.style.alignItems = "center";
						indexEl.style.justifyContent = "center";
						indexEl.style.fontSize = "11px";
						indexEl.style.fontWeight = "bold";
						bubble.appendChild(indexEl);
					}
				});
			} else {
				vendorGrid.style.outline = "";
				vendorGrid.style.backgroundColor = "";

				const bubbles = vendorGrid.querySelectorAll(".vendor-bubble");
				bubbles.forEach((bubble) => {
					bubble.style.boxShadow =
						bubble.dataset.originalBoxShadow || "";

					// Remove index number
					const indexEl = bubble.querySelector(".bubble-index");
					if (indexEl) bubble.removeChild(indexEl);
				});
			}
		}
	});
})();
