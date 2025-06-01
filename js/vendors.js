/**
 * Vendors Module
 * Handles loading, filtering, and displaying vendor data
 */

// State management
const state = {
	vendors: [],
	filteredVendors: [],
	filters: {
		search: "",
		location: "all",
		type: "all",
		dietary: [],
	},
	viewMode: "grid", // "grid" or "list"
};

// DOM elements
let vendorsContainer;
let searchInput;
let locationFilter;
let typeFilter;
let dietaryFilters;
let gridViewBtn;
let listViewBtn;
let resultsCount;

/**
 * Initialize the vendors module
 */
async function initialize() {
	// Get DOM elements
	vendorsContainer = document.getElementById("vendors-container");
	searchInput = document.getElementById("vendor-search");
	locationFilter = document.getElementById("location-filter");
	typeFilter = document.getElementById("type-filter");
	dietaryFilters = document.querySelectorAll(".dietary-filter");
	gridViewBtn = document.getElementById("grid-view-btn");
	listViewBtn = document.getElementById("list-view-btn");
	resultsCount = document.getElementById("results-count");

	// Add event listeners
	searchInput.addEventListener("input", handleSearchInput);
	locationFilter.addEventListener("change", handleLocationFilter);
	typeFilter.addEventListener("change", handleTypeFilter);
	dietaryFilters.forEach((filter) => {
		filter.addEventListener("change", handleDietaryFilter);
	});

	gridViewBtn.addEventListener("click", () => setViewMode("grid"));
	listViewBtn.addEventListener("click", () => setViewMode("list"));

	// Load vendor data
	await loadVendorData();

	// Initial render
	applyFilters();
	renderVendors();
}

/**
 * Load vendor data from JSON
 */
async function loadVendorData() {
	try {
		const response = await fetch("vendors-data.json");
		const data = await response.json();

		// Flatten vendors by location into single array
		state.vendors = Object.keys(data.vendors).reduce((acc, location) => {
			return [...acc, ...data.vendors[location]];
		}, []);

		state.filteredVendors = [...state.vendors];
	} catch (error) {
		console.error("Error loading vendor data:", error);
		vendorsContainer.innerHTML = `
      <div class="col-span-full bg-red-900 text-white p-4 rounded-lg">
        <h3 class="font-bold text-lg">Error Loading Data</h3>
        <p>Unable to load vendor information. Please try again later.</p>
      </div>
    `;
	}
}

/**
 * Apply all current filters to the vendor data
 */
function applyFilters() {
	const {search, location, type, dietary} = state.filters;

	state.filteredVendors = state.vendors.filter((vendor) => {
		// Search filter
		const matchesSearch =
			search === "" ||
			vendor.name.toLowerCase().includes(search.toLowerCase()) ||
			vendor.description.toLowerCase().includes(search.toLowerCase());

		// Location filter
		const matchesLocation =
			location === "all" || vendor.location === location;

		// Type filter
		const matchesType = type === "all" || vendor.type === type;

		// Dietary filters
		const matchesDietary =
			dietary.length === 0 ||
			(vendor.dietaryOptions &&
				dietary.every((diet) => vendor.dietaryOptions.includes(diet)));

		return (
			matchesSearch && matchesLocation && matchesType && matchesDietary
		);
	});

	// Update results count
	resultsCount.textContent = state.filteredVendors.length;
}

/**
 * Render vendors based on current view mode
 */
function renderVendors() {
	if (state.filteredVendors.length === 0) {
		vendorsContainer.innerHTML = `
      <div class="col-span-full bg-gray-800 p-6 rounded-lg text-center">
        <h3 class="font-bold text-xl mb-2">No Results Found</h3>
        <p class="text-gray-400">Try adjusting your search or filters</p>
      </div>
    `;
		return;
	}

	// Clear container
	vendorsContainer.innerHTML = "";

	// Set layout based on view mode
	if (state.viewMode === "grid") {
		vendorsContainer.className =
			"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
	} else {
		vendorsContainer.className = "flex flex-col gap-4";
	}

	// Render each vendor
	state.filteredVendors.forEach((vendor) => {
		const vendorElement = document.createElement("div");

		if (state.viewMode === "grid") {
			vendorElement.className =
				"bg-gray-800 rounded-lg overflow-hidden shadow-lg";
			vendorElement.innerHTML = createGridCardHTML(vendor);
		} else {
			vendorElement.className =
				"bg-gray-800 rounded-lg overflow-hidden shadow-lg w-full";
			vendorElement.innerHTML = createListCardHTML(vendor);
		}

		vendorsContainer.appendChild(vendorElement);
	});
}

/**
 * Create HTML for grid view card
 */
function createGridCardHTML(vendor) {
	// Get dietary icons HTML if available
	const dietaryHTML = vendor.dietaryOptions
		? createDietaryIconsHTML(vendor.dietaryOptions)
		: "";

	// Create menu preview if available
	const menuPreview = vendor.menu
		? `<div class="mt-2">
      <p class="font-bold text-sm text-gray-300">Menu Preview:</p>
      <ul class="text-sm">
        ${vendor.menu
			.slice(0, 2)
			.map(
				(item) =>
					`<li class="flex justify-between">
            <span>${item.name}</span>
            <span>${item.price}</span>
          </li>`
			)
			.join("")}
        ${
			vendor.menu.length > 2
				? `<li class="text-sm text-gray-400">+ ${
						vendor.menu.length - 2
				  } more items</li>`
				: ""
		}
      </ul>
    </div>`
		: "";

	// Create products preview for merchandise
	const productsPreview = vendor.products
		? `<div class="mt-2">
      <p class="font-bold text-sm text-gray-300">Products:</p>
      <ul class="text-sm">
        ${vendor.products
			.slice(0, 2)
			.map(
				(item) =>
					`<li class="flex justify-between">
            <span>${item.name}</span>
            <span>${item.price}</span>
          </li>`
			)
			.join("")}
        ${
			vendor.products.length > 2
				? `<li class="text-sm text-gray-400">+ ${
						vendor.products.length - 2
				  } more items</li>`
				: ""
		}
      </ul>
    </div>`
		: "";

	return `
    <div class="relative">
      <div class="absolute top-0 right-0 m-2 px-2 py-1 bg-cyan-800 text-xs rounded">
        ${vendor.type.charAt(0).toUpperCase() + vendor.type.slice(1)}
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold">${vendor.name}</h3>
        <p class="text-sm text-gray-300 mb-2">${vendor.description}</p>
        <p class="text-xs flex items-center gap-1 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          ${vendor.locationDetail} (${formatLocation(vendor.location)})
        </p>
        <p class="text-xs flex items-center gap-1 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ${vendor.openingTimes}
        </p>
        
        ${dietaryHTML}
        ${menuPreview || productsPreview || ""}
      </div>
    </div>
  `;
}

/**
 * Create HTML for list view card
 */
function createListCardHTML(vendor) {
	// Get dietary icons HTML if available
	const dietaryHTML = vendor.dietaryOptions
		? createDietaryIconsHTML(vendor.dietaryOptions)
		: "";

	return `
    <div class="p-4 flex flex-col md:flex-row">
      <div class="md:w-1/3">
        <h3 class="text-lg font-bold">${vendor.name}</h3>
        <p class="text-sm text-gray-300 mb-2">${vendor.description}</p>
        <div class="flex items-center justify-between md:flex-col md:items-start">
          <span class="inline-block px-2 py-1 bg-cyan-800 text-xs rounded mb-2">
            ${vendor.type.charAt(0).toUpperCase() + vendor.type.slice(1)}
          </span>
          <p class="text-xs flex items-center gap-1 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            ${vendor.locationDetail} (${formatLocation(vendor.location)})
          </p>
          <p class="text-xs flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ${vendor.openingTimes}
          </p>
        </div>
        ${dietaryHTML}
      </div>
      <div class="md:w-2/3 md:pl-4 mt-4 md:mt-0">
        ${createDetailedListHTML(vendor)}
      </div>
    </div>
  `;
}

/**
 * Create detailed list content HTML based on vendor type
 */
function createDetailedListHTML(vendor) {
	if (vendor.menu) {
		return `
      <div>
        <h4 class="font-bold text-sm text-gray-300 mb-2">Menu:</h4>
        <ul class="text-sm space-y-2">
          ${vendor.menu
				.map(
					(item) => `
            <li class="bg-gray-700 bg-opacity-30 p-2 rounded">
              <div class="flex justify-between">
                <span class="font-bold">${item.name}</span>
                <span>${item.price}</span>
              </div>
              ${
					item.description
						? `<p class="text-xs text-gray-400">${item.description}</p>`
						: ""
				}
              ${
					item.dietary && item.dietary.length > 0
						? `<div class="flex flex-wrap gap-1 mt-1">
                  ${item.dietary
						.map(
							(diet) => `
                    <span class="px-1 py-0.5 text-xs rounded bg-green-900 text-green-200">${formatDietaryOption(
						diet
					)}</span>
                  `
						)
						.join("")}
                </div>`
						: ""
				}
            </li>
          `
				)
				.join("")}
        </ul>
      </div>
    `;
	} else if (vendor.products) {
		return `
      <div>
        <h4 class="font-bold text-sm text-gray-300 mb-2">Products:</h4>
        <ul class="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
          ${vendor.products
				.map(
					(product) => `
            <li class="bg-gray-700 bg-opacity-30 p-2 rounded flex justify-between">
              <span>${product.name}</span>
              <span class="font-bold">${product.price}</span>
            </li>
          `
				)
				.join("")}
        </ul>
      </div>
    `;
	} else if (vendor.type === "activity") {
		return `
      <div>
        <h4 class="font-bold text-sm text-gray-300 mb-2">Activity Details:</h4>
        <p class="text-sm">${vendor.description}</p>
        <p class="mt-2 text-sm"><span class="font-bold">Price:</span> ${vendor.prices}</p>
      </div>
    `;
	}

	return "";
}

/**
 * Create dietary icons HTML
 */
function createDietaryIconsHTML(dietaryOptions) {
	if (!dietaryOptions || dietaryOptions.length === 0) return "";

	return `
    <div class="flex flex-wrap gap-1 mt-1">
      ${dietaryOptions
			.map(
				(diet) =>
					`<span class="px-1 py-0.5 text-xs rounded bg-green-900 text-green-200">
          ${formatDietaryOption(diet)}
        </span>`
			)
			.join("")}
    </div>
  `;
}

/**
 * Format dietary option for display
 */
function formatDietaryOption(option) {
	switch (option) {
		case "vegetarian":
			return "Vegetarian";
		case "vegan":
			return "Vegan";
		case "glutenfree":
			return "Gluten-Free";
		case "dairyfree":
			return "Dairy-Free";
		case "nutfree":
			return "Nut-Free";
		default:
			return option;
	}
}

/**
 * Format location for display
 */
function formatLocation(location) {
	switch (location) {
		case "arena":
			return "Arena";
		case "districtX":
			return "District X";
		case "village":
			return "Village";
		case "campsite":
			return "Campsite";
		default:
			return location;
	}
}

/**
 * Set view mode (grid or list)
 */
function setViewMode(mode) {
	state.viewMode = mode;

	// Update button styling
	if (mode === "grid") {
		gridViewBtn.classList.add("bg-cyan-600");
		listViewBtn.classList.remove("bg-cyan-600");
	} else {
		listViewBtn.classList.add("bg-cyan-600");
		gridViewBtn.classList.remove("bg-cyan-600");
	}

	renderVendors();
}

/**
 * Handle search input
 */
function handleSearchInput(event) {
	state.filters.search = event.target.value.trim();
	applyFilters();
	renderVendors();
}

/**
 * Handle location filter change
 */
function handleLocationFilter(event) {
	state.filters.location = event.target.value;
	applyFilters();
	renderVendors();
}

/**
 * Handle type filter change
 */
function handleTypeFilter(event) {
	state.filters.type = event.target.value;
	applyFilters();
	renderVendors();
}

/**
 * Handle dietary filter changes
 */
function handleDietaryFilter() {
	// Get all checked dietary filters
	state.filters.dietary = Array.from(dietaryFilters)
		.filter((filter) => filter.checked)
		.map((filter) => filter.value);

	applyFilters();
	renderVendors();
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initialize);
