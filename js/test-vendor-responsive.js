/**
 * This is a tool to help test the responsive behavior of the vendors page.
 *
 * Usage:
 * 1. Include this script in vendors.html or run it in the browser console
 * 2. Call testVendorResponsive() to test different screen sizes
 * 3. The script will simulate different screen sizes and report if the vendor bubbles
 *    are stacking correctly in each case
 */

function testVendorResponsive() {
	// Create test container
	const container = document.createElement("div");
	container.style.position = "fixed";
	container.style.top = "0";
	container.style.left = "0";
	container.style.width = "100%";
	container.style.height = "100%";
	container.style.backgroundColor = "rgba(0,0,0,0.85)";
	container.style.color = "white";
	container.style.zIndex = "10000";
	container.style.padding = "20px";
	container.style.boxSizing = "border-box";
	container.style.fontFamily = "monospace";
	container.style.overflow = "auto";
	container.id = "vendor-responsive-test-container";

	container.innerHTML = `
    <h2 style="color:#00ffc3;margin-bottom:20px;">Vendor Responsive Test</h2>
    <p style="margin-bottom:15px;">This tool simulates different screen sizes and checks if the vendor bubbles stack correctly.</p>
    <div id="test-results" style="margin:20px 0;"></div>
    <button id="close-test" style="background:#00ffc3;color:black;border:none;padding:10px 15px;font-weight:bold;border-radius:4px;cursor:pointer;">Close</button>
    <button id="test-again" style="background:#23bfcf;color:black;border:none;padding:10px 15px;margin-left:10px;font-weight:bold;border-radius:4px;cursor:pointer;">Test Again</button>
  `;

	document.body.appendChild(container);

	// Run tests
	runResponsiveTests();

	// Add event listeners
	document
		.getElementById("close-test")
		.addEventListener("click", function () {
			document.body.removeChild(container);
		});

	document
		.getElementById("test-again")
		.addEventListener("click", function () {
			runResponsiveTests();
		});

	function runResponsiveTests() {
		const resultsContainer = document.getElementById("test-results");
		resultsContainer.innerHTML = "<p>Running tests...</p>";

		// Test sizes (width, height)
		const testSizes = [
			{width: 360, height: 640, name: "Small Mobile"},
			{width: 480, height: 800, name: "Mobile"},
			{width: 640, height: 960, name: "Mobile Boundary"},
			{width: 768, height: 1024, name: "Tablet"},
			{width: 1024, height: 768, name: "Landscape Tablet"},
			{width: 1280, height: 800, name: "Desktop"},
		];

		const results = [];

		// Function to check layout at a given size
		function checkLayout(size, callback) {
			// Create an iframe to test layout
			const iframe = document.createElement("iframe");
			iframe.style.position = "absolute";
			iframe.style.left = "-9999px";
			iframe.style.width = size.width + "px";
			iframe.style.height = size.height + "px";
			iframe.style.opacity = "0";
			iframe.style.border = "none";
			iframe.src = "vendors.html";

			document.body.appendChild(iframe);

			setTimeout(function () {
				try {
					const iframeDoc =
						iframe.contentDocument || iframe.contentWindow.document;
					const vendorGrid = iframeDoc.getElementById("vendorGrid");

					let result = {
						size: size,
						passed: false,
						error: null,
						details: {},
					};

					if (!vendorGrid) {
						result.error = "Could not find vendorGrid element";
					} else if (vendorGrid.style.display === "none") {
						result.error = "Vendor grid is not visible";
					} else {
						const computed =
							iframe.contentWindow.getComputedStyle(vendorGrid);
						const isMobile = size.width <= 640;
						const expectedDirection = isMobile ? "column" : "row";
						const actualDirection = computed.flexDirection;

						result.passed = actualDirection === expectedDirection;
						result.details = {
							expectedDirection: expectedDirection,
							actualDirection: actualDirection,
							isMobile: isMobile,
							hasVendorGridMobileClass:
								vendorGrid.classList.contains(
									"vendor-grid-mobile"
								),
						};
					}

					document.body.removeChild(iframe);
					callback(result);
				} catch (e) {
					document.body.removeChild(iframe);
					callback({
						size: size,
						passed: false,
						error: e.message,
					});
				}
			}, 3000); // Give time for page to load
		}

		// Run tests sequentially
		function runNextTest(index) {
			if (index >= testSizes.length) {
				showResults(results);
				return;
			}

			resultsContainer.innerHTML = `<p>Testing ${testSizes[index].name} (${testSizes[index].width}×${testSizes[index].height})...</p>`;

			checkLayout(testSizes[index], function (result) {
				results.push(result);
				runNextTest(index + 1);
			});
		}

		function showResults(testResults) {
			let html =
				'<h3 style="margin:15px 0;color:#23bfcf;">Test Results:</h3>';

			let allPassed = true;
			testResults.forEach((result) => {
				if (!result.passed) allPassed = false;

				const statusColor = result.passed ? "#0f0" : "#f00";
				const statusIcon = result.passed ? "✓" : "✗";
				const size = result.size;

				html += `
          <div style="margin:10px 0;padding:10px;border:1px solid #333;border-radius:4px;background:rgba(255,255,255,0.1)">
            <div style="font-weight:bold;margin-bottom:5px;">
              ${size.name} (${size.width}×${size.height})
              <span style="color:${statusColor};float:right">${statusIcon}</span>
            </div>
        `;

				if (result.error) {
					html += `<div style="color:#f66;margin-top:5px;">Error: ${result.error}</div>`;
				} else if (!result.passed) {
					html += `
            <div style="color:#f66;margin-top:5px;">
              Expected direction: ${result.details.expectedDirection}, 
              Actual direction: ${result.details.actualDirection}
            </div>
            <div style="margin-top:5px;">
              Mobile view: ${result.details.isMobile ? "Yes" : "No"}, 
              Has mobile class: ${
					result.details.hasVendorGridMobileClass ? "Yes" : "No"
				}
            </div>
          `;
				}

				html += "</div>";
			});

			// Overall result
			html += `
        <div style="margin:20px 0;padding:15px;border-radius:4px;text-align:center;font-weight:bold;background:${
			allPassed ? "rgba(0,255,0,0.2)" : "rgba(255,0,0,0.2)"
		}">
          <span style="font-size:18px;">Overall: ${
				allPassed ? "PASSED" : "FAILED"
			}</span>
        </div>
        <p style="margin-top:20px;">
          ${
				allPassed
					? "All tests passed! Vendor bubbles are stacking correctly on all tested screen sizes."
					: "Some tests failed. Review the details above to fix responsive issues."
			}
        </p>
      `;

			resultsContainer.innerHTML = html;
		}

		// Start testing
		runNextTest(0);
	}
}

// If this script is loaded in vendors.html, expose the function globally
if (typeof window !== "undefined") {
	window.testVendorResponsive = testVendorResponsive;
}
