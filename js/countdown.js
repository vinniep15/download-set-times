// countdown.js - Manage countdown timer.

// Constants
const Days = document.getElementById('days');
const Hours = document.getElementById('hours');
const Minutes = document.getElementById('minutes');

const targetDate = new Date("June 13 2025 12:00:00").getTime();

// Main Timer Function
export function timer () {
    const currentDate = new Date().getTime();
    const distance = targetDate - currentDate;

    const days = Math.floor(distance / 1000 / 60 / 60 / 24);
    const hours = Math.floor(distance / 1000 / 60 / 60) % 24;
    const minutes = Math.floor(distance / 1000 / 60) % 60;

    if (Days) Days.innerHTML = days;
    if (Hours) Hours.innerHTML = hours;
    if (Minutes) Minutes.innerHTML = minutes;

    if(distance < 0){
        if (Days) Days.innerHTML = "00";
        if (Hours) Hours.innerHTML = "00";
        if (Minutes) Minutes.innerHTML = "00";
    }
}

setInterval(timer, 1000);