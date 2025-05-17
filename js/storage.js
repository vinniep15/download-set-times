// storage.js - Storage utilities for cookies and localStorage

/**
 * Set a cookie with JSON value
 */
export function setCookie(name, value, days = 30) {
	const date = new Date();
	date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
	const expires = "expires=" + date.toUTCString();
	document.cookie =
		name + "=" + JSON.stringify(value) + ";" + expires + ";path=/";
}

/**
 * Get and parse a cookie value
 */
export function getCookie(name) {
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

/**
 * Save data to both localStorage and cookie for compatibility
 */
export function saveToStorage(key, value) {
	setCookie(key, value);
	localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Load data from localStorage with cookie fallback
 */
export function loadFromStorage(key) {
	const localValue = localStorage.getItem(key);
	const cookieValue = getCookie(key);

	if (localValue !== null) {
		try {
			return JSON.parse(localValue);
		} catch (e) {
			// If parsing fails, try cookie
		}
	}

	if (cookieValue !== null) {
		// Also set localStorage for next time
		localStorage.setItem(key, JSON.stringify(cookieValue));
		return cookieValue;
	}

	return null;
}

export function safeGetItem(key) {
	try {
		return localStorage.getItem(key);
	} catch (e) {
		return null;
	}
}

export function safeSetItem(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch (e) {
		// Ignore
	}
}

export function safeStorageAvailable() {
	try {
		const testKey = '__test__';
		localStorage.setItem(testKey, '1');
		localStorage.removeItem(testKey);
		return true;
	} catch (e) {
		return false;
	}
}
