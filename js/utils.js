// utils.js - Utility functions for time manipulation and calculations

/**
 * Generate array of time slots from start to end hour
 */
export function generateTimeArray(startHour, endHour) {
	const times = [];
	for (let hour = startHour; hour <= endHour; hour++) {
		for (let min = 0; min < 60; min += 15) {
			if ((hour === 10 && min >= 30) || hour > 10) {
				const displayHour = hour > 23 ? hour - 24 : hour;
				times.push(
					`${String(displayHour).padStart(2, "0")}:${String(
						min
					).padStart(2, "0")}`
				);
			}
		}
	}
	return times;
}

/**
 * Convert time string (HH:MM) to minutes past midnight
 */
export function timeToMinutes(time) {
	if (!time || typeof time !== "string") {
		return 0;
	}

	const [hourStr, minStr] = time.split(":");
	let hour = parseInt(hourStr, 10);
	const min = parseInt(minStr, 10);

	// Convert to a standard time range (0-29 hours where 24-29 represent early morning next day)
	if (hour >= 0 && hour < 6) {
		hour += 24; // Early morning hours treated as next day
	}

	return hour * 60 + min;
}

/**
 * Format time string for display, adding (+1) for next day times
 */
export function formatTimeDisplay(timeStr) {
	const [h, m] = timeStr.split(":").map(Number);
	if (h >= 0 && h < 6) {
		return `(+1) ${timeStr}`;
	}
	return timeStr;
}

/**
 * Calculate event duration in minutes
 */
export function calculateEventDuration(startTime, endTime) {
	let startMinutes = timeToMinutes(startTime);
	let endMinutes = timeToMinutes(endTime);

	if (endMinutes < startMinutes) {
		endMinutes += 24 * 60;
	}

	return endMinutes - startMinutes;
}
