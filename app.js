// Fitness Tracker App - Core Logic

// ==================== State Management ====================
const state = {
    currentMode: 'run',
    isTracking: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    currentRun: {
        coordinates: [],
        startTime: null,
        distance: 0,
        time: 0,
        calories: 0,
        maxElevation: 0,
        minElevation: Infinity,
    },
    currentWalk: {
        coordinates: [],
        startTime: null,
        distance: 0,
        time: 0,
        steps: 0,
        calories: 0,
    },
    watchId: null,
    maps: {
        run: null,
        walk: null,
    },
    polylines: {
        run: null,
        walk: null,
    },
    charts: {},
};

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeMaps();
    loadDataFromStorage();
    updateDashboard();
});

function initializeEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });

    // Mode Selector
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchMode(e.target.dataset.mode);
        });
    });

    // Run Controls
    document.getElementById('run-start-btn').addEventListener('click', startRun);
    document.getElementById('run-pause-btn').addEventListener('click', pauseTracking);
    document.getElementById('run-resume-btn').addEventListener('click', resumeTracking);
    document.getElementById('run-stop-btn').addEventListener('click', stopTracking);
    document.getElementById('run-save-btn').addEventListener('click', () => saveActivity('run'));

    // Walk Controls
    document.getElementById('walk-start-btn').addEventListener('click', startWalk);
    document.getElementById('walk-pause-btn').addEventListener('click', pauseTracking);
    document.getElementById('walk-resume-btn').addEventListener('click', resumeTracking);
    document.getElementById('walk-stop-btn').addEventListener('click', stopTracking);
    document.getElementById('walk-save-btn').addEventListener('click', () => saveActivity('walk'));

    // History Controls
    document.getElementById('history-date-filter').addEventListener('change', updateHistoryDisplay);
    document.getElementById('history-type-filter').addEventListener('change', updateHistoryDisplay);
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('history-date-filter').value = today;
}

function initializeMaps() {
    // Run Map
    state.maps.run = L.map('run-map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(state.maps.run);

    // Walk Map
    state.maps.walk = L.map('walk-map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(state.maps.walk);
}

// ==================== Tab & Mode Switching ====================
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Invalidate map size when switching tabs
    setTimeout(() => {
        state.maps.run?.invalidateSize();
        state.maps.walk?.invalidateSize();
    }, 100);

    if (tabName === 'dashboard') {
        initializeCharts();
    }
}

function switchMode(mode) {
    state.currentMode = mode;

    // Update mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Show/hide tracker modes
    document.querySelectorAll('.tracker-mode').forEach(tracker => {
        tracker.classList.remove('active');
    });
    document.getElementById(`${mode}-tracker`).classList.add('active');

    // Invalidate map size
    setTimeout(() => {
        state.maps[mode]?.invalidateSize();
    }, 100);
}

// ==================== Geolocation & Tracking ====================
function startRun() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    state.currentRun = {
        coordinates: [],
        startTime: Date.now(),
        distance: 0,
        time: 0,
        calories: 0,
        maxElevation: 0,
        minElevation: Infinity,
    };

    state.isTracking = true;
    state.startTime = Date.now();
    state.pausedTime = 0;

    // Request location permission
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, altitude, accuracy } = position.coords;
            const coord = { lat: latitude, lng: longitude, alt: altitude || 0, accuracy };

            state.currentRun.coordinates.push(coord);

            // Update elevation
            if (altitude) {
                state.currentRun.maxElevation = Math.max(state.currentRun.maxElevation, altitude);
                state.currentRun.minElevation = Math.min(state.currentRun.minElevation, altitude);
            }

            // Calculate distance
            if (state.currentRun.coordinates.length > 1) {
                const prev = state.currentRun.coordinates[state.currentRun.coordinates.length - 2];
                const distance = calculateDistance(prev.lat, prev.lng, latitude, longitude);
                state.currentRun.distance += distance;
            }

            updateRunDisplay();
            drawRunRoute();
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to access your location. Please check permissions.');
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );

    // Start timer
    startTimer('run');

    // Update UI
    document.getElementById('run-start-btn').style.display = 'none';
    document.getElementById('run-pause-btn').style.display = 'flex';
    document.getElementById('run-stop-btn').style.display = 'flex';
}

function startWalk() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    state.currentWalk = {
        coordinates: [],
        startTime: Date.now(),
        distance: 0,
        time: 0,
        steps: 0,
        calories: 0,
    };

    state.isTracking = true;
    state.startTime = Date.now();
    state.pausedTime = 0;

    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const coord = { lat: latitude, lng: longitude };

            state.currentWalk.coordinates.push(coord);

            // Calculate distance
            if (state.currentWalk.coordinates.length > 1) {
                const prev = state.currentWalk.coordinates[state.currentWalk.coordinates.length - 2];
                const distance = calculateDistance(prev.lat, prev.lng, latitude, longitude);
                state.currentWalk.distance += distance;

                // Estimate steps (1 step ≈ 0.762 meters average)
                state.currentWalk.steps += Math.round(distance * 1000 / 0.762);
            }

            updateWalkDisplay();
            drawWalkRoute();
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to access your location. Please check permissions.');
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );

    // Start timer
    startTimer('walk');

    // Update UI
    document.getElementById('walk-start-btn').style.display = 'none';
    document.getElementById('walk-pause-btn').style.display = 'flex';
    document.getElementById('walk-stop-btn').style.display = 'flex';
}

function pauseTracking() {
    state.isPaused = true;
    if (state.watchId) {
        navigator.geolocation.clearWatch(state.watchId);
    }

    // Update UI
    if (state.currentMode === 'run') {
        document.getElementById('run-pause-btn').style.display = 'none';
        document.getElementById('run-resume-btn').style.display = 'flex';
    } else {
        document.getElementById('walk-pause-btn').style.display = 'none';
        document.getElementById('walk-resume-btn').style.display = 'flex';
    }
}

function resumeTracking() {
    state.isPaused = false;
    state.pausedTime = Date.now() - state.startTime;

    if (state.currentMode === 'run') {
        startRun();
        document.getElementById('run-resume-btn').style.display = 'none';
        document.getElementById('run-pause-btn').style.display = 'flex';
    } else {
        startWalk();
        document.getElementById('walk-resume-btn').style.display = 'none';
        document.getElementById('walk-pause-btn').style.display = 'flex';
    }
}

function stopTracking() {
    state.isTracking = false;
    if (state.watchId) {
        navigator.geolocation.clearWatch(state.watchId);
    }

    // Update UI
    if (state.currentMode === 'run') {
        document.getElementById('run-pause-btn').style.display = 'none';
        document.getElementById('run-stop-btn').style.display = 'none';
        document.getElementById('run-save-btn').style.display = 'flex';
    } else {
        document.getElementById('walk-pause-btn').style.display = 'none';
        document.getElementById('walk-stop-btn').style.display = 'none';
        document.getElementById('walk-save-btn').style.display = 'flex';
    }
}

// ==================== Display Updates ====================
function startTimer(mode) {
    const timerInterval = setInterval(() => {
        if (!state.isTracking) {
            clearInterval(timerInterval);
            return;
        }

        if (!state.isPaused) {
            const elapsed = Date.now() - state.startTime - state.pausedTime;
            const seconds = Math.floor(elapsed / 1000);

            if (mode === 'run') {
                state.currentRun.time = seconds;
            } else {
                state.currentWalk.time = seconds;
            }

            updateTimerDisplay(mode, seconds);
        }
    }, 100);
}

function updateTimerDisplay(mode, seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (mode === 'run') {
        document.getElementById('run-time').textContent = timeStr;
        updateRunMetrics();
    } else {
        document.getElementById('walk-time').textContent = timeStr;
        updateWalkMetrics();
    }
}

function updateRunDisplay() {
    document.getElementById('run-distance').textContent = (state.currentRun.distance).toFixed(2);
}

function updateRunMetrics() {
    const { distance, time, maxElevation, minElevation } = state.currentRun;

    // Calculate speed (km/h)
    const hours = time / 3600;
    const speed = hours > 0 ? distance / hours : 0;
    document.getElementById('run-speed').textContent = speed.toFixed(1);

    // Calculate pace (min/km)
    const pace = distance > 0 ? time / 60 / distance : 0;
    const paceMin = Math.floor(pace);
    const paceSec = Math.round((pace - paceMin) * 60);
    document.getElementById('run-pace').textContent = `${String(paceMin).padStart(2, '0')}:${String(paceSec).padStart(2, '0')}`;

    // Calculate calories (simplified: ~0.063 cal per kg per km, assuming 70kg)
    const calories = Math.round(distance * 0.063 * 70 * (1 + speed / 10));
    state.currentRun.calories = calories;
    document.getElementById('run-calories').textContent = calories;

    // Elevation
    const elevation = maxElevation !== -Infinity && minElevation !== Infinity
        ? Math.round(maxElevation - minElevation)
        : 0;
    document.getElementById('run-elevation').textContent = elevation;
}

function updateWalkDisplay() {
    document.getElementById('walk-distance').textContent = (state.currentWalk.distance).toFixed(1);
    document.getElementById('walk-steps').textContent = state.currentWalk.steps;

    // Update progress
    const goal = 10000;
    const progress = Math.min((state.currentWalk.steps / goal) * 100, 100);
    document.getElementById('walk-progress').textContent = Math.round(progress);
    document.getElementById('walk-progress-bar').style.width = progress + '%';
    document.getElementById('walk-progress-text').textContent = `${state.currentWalk.steps} / ${goal} steps`;
}

function updateWalkMetrics() {
    const { distance, time, steps } = state.currentWalk;

    // Calculate calories (simplified: ~0.04 cal per step)
    const calories = Math.round(steps * 0.04);
    state.currentWalk.calories = calories;
    document.getElementById('walk-calories').textContent = calories;
}

function drawRunRoute() {
    if (state.currentRun.coordinates.length < 2) return;

    const map = state.maps.run;

    // Remove old polyline
    if (state.polylines.run) {
        map.removeLayer(state.polylines.run);
    }

    // Create new polyline
    const latlngs = state.currentRun.coordinates.map(c => [c.lat, c.lng]);
    state.polylines.run = L.polyline(latlngs, { color: '#ff6b6b', weight: 3, opacity: 0.8 }).addTo(map);

    // Fit map to route
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Add start marker
    if (state.currentRun.coordinates.length === 1) {
        L.circleMarker([state.currentRun.coordinates[0].lat, state.currentRun.coordinates[0].lng], {
            radius: 6,
            fillColor: '#51cf66',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        }).addTo(map).bindPopup('Start');
    }

    // Add current position marker
    const current = state.currentRun.coordinates[state.currentRun.coordinates.length - 1];
    L.circleMarker([current.lat, current.lng], {
        radius: 8,
        fillColor: '#ff6b6b',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
    }).addTo(map).bindPopup('Current');
}

function drawWalkRoute() {
    if (state.currentWalk.coordinates.length < 2) return;

    const map = state.maps.walk;

    // Remove old polyline
    if (state.polylines.walk) {
        map.removeLayer(state.polylines.walk);
    }

    // Create new polyline
    const latlngs = state.currentWalk.coordinates.map(c => [c.lat, c.lng]);
    state.polylines.walk = L.polyline(latlngs, { color: '#4ecdc4', weight: 3, opacity: 0.8 }).addTo(map);

    // Fit map to route
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Add start marker
    if (state.currentWalk.coordinates.length === 1) {
        L.circleMarker([state.currentWalk.coordinates[0].lat, state.currentWalk.coordinates[0].lng], {
            radius: 6,
            fillColor: '#51cf66',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        }).addTo(map).bindPopup('Start');
    }

    // Add current position marker
    const current = state.currentWalk.coordinates[state.currentWalk.coordinates.length - 1];
    L.circleMarker([current.lat, current.lng], {
        radius: 8,
        fillColor: '#4ecdc4',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
    }).addTo(map).bindPopup('Current');
}

// ==================== Storage & History ====================
function saveActivity(type) {
    const activity = {
        id: Date.now(),
        type: type,
        date: new Date().toISOString(),
        distance: type === 'run' ? state.currentRun.distance : state.currentWalk.distance,
        time: type === 'run' ? state.currentRun.time : state.currentWalk.time,
        calories: type === 'run' ? state.currentRun.calories : state.currentWalk.calories,
        coordinates: type === 'run' ? state.currentRun.coordinates : state.currentWalk.coordinates,
    };

    if (type === 'run') {
        activity.elevation = state.currentRun.maxElevation - state.currentRun.minElevation;
    } else {
        activity.steps = state.currentWalk.steps;
    }

    // Save to localStorage
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    activities.push(activity);
    localStorage.setItem('activities', JSON.stringify(activities));

    // Reset current activity
    if (type === 'run') {
        state.currentRun = {
            coordinates: [],
            startTime: null,
            distance: 0,
            time: 0,
            calories: 0,
            maxElevation: 0,
            minElevation: Infinity,
        };
        document.getElementById('run-distance').textContent = '0.00';
        document.getElementById('run-time').textContent = '00:00:00';
        document.getElementById('run-speed').textContent = '0.0';
        document.getElementById('run-pace').textContent = '--:--';
        document.getElementById('run-calories').textContent = '0';
        document.getElementById('run-elevation').textContent = '0';
        document.getElementById('run-start-btn').style.display = 'flex';
        document.getElementById('run-save-btn').style.display = 'none';

        // Clear map
        if (state.polylines.run) {
            state.maps.run.removeLayer(state.polylines.run);
            state.polylines.run = null;
        }
    } else {
        state.currentWalk = {
            coordinates: [],
            startTime: null,
            distance: 0,
            time: 0,
            steps: 0,
            calories: 0,
        };
        document.getElementById('walk-distance').textContent = '0.0';
        document.getElementById('walk-time').textContent = '00:00:00';
        document.getElementById('walk-steps').textContent = '0';
        document.getElementById('walk-progress').textContent = '0';
        document.getElementById('walk-progress-bar').style.width = '0%';
        document.getElementById('walk-progress-text').textContent = '0 / 10000 steps';
        document.getElementById('walk-calories').textContent = '0';
        document.getElementById('walk-start-btn').style.display = 'flex';
        document.getElementById('walk-save-btn').style.display = 'none';

        // Clear map
        if (state.polylines.walk) {
            state.maps.walk.removeLayer(state.polylines.walk);
            state.polylines.walk = null;
        }
    }

    updateHistoryDisplay();
    updateDashboard();
    alert(`${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully!`);
}

function loadDataFromStorage() {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    const dateFilter = document.getElementById('history-date-filter').value;
    const typeFilter = document.getElementById('history-type-filter').value;

    let filtered = activities;

    if (dateFilter) {
        filtered = filtered.filter(a => new Date(a.date).toISOString().split('T')[0] === dateFilter);
    }

    if (typeFilter) {
        filtered = filtered.filter(a => a.type === typeFilter);
    }

    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    if (filtered.length === 0) {
        historyList.innerHTML = '<p class="empty-message">No activities found.</p>';
        return;
    }

    filtered.reverse().forEach(activity => {
        const date = new Date(activity.date);
        const timeStr = date.toLocaleTimeString();
        const durationHours = Math.floor(activity.time / 3600);
        const durationMinutes = Math.floor((activity.time % 3600) / 60);
        const durationSeconds = activity.time % 60;

        let statsHTML = `
            <div class="history-stat">
                <span class="history-stat-label">Distance</span>
                <span class="history-stat-value">${activity.distance.toFixed(2)} km</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-label">Duration</span>
                <span class="history-stat-value">${String(durationHours).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(2, '0')}</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-label">Calories</span>
                <span class="history-stat-value">${activity.calories} kcal</span>
            </div>
        `;

        if (activity.type === 'run') {
            const speed = activity.time > 0 ? (activity.distance / (activity.time / 3600)).toFixed(1) : 0;
            statsHTML += `
                <div class="history-stat">
                    <span class="history-stat-label">Speed</span>
                    <span class="history-stat-value">${speed} km/h</span>
                </div>
                <div class="history-stat">
                    <span class="history-stat-label">Elevation</span>
                    <span class="history-stat-value">${activity.elevation || 0} m</span>
                </div>
            `;
        } else {
            statsHTML += `
                <div class="history-stat">
                    <span class="history-stat-label">Steps</span>
                    <span class="history-stat-value">${activity.steps || 0}</span>
                </div>
            `;
        }

        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-header">
                <div class="history-title">
                    <i class="fas fa-${activity.type === 'run' ? 'running' : 'walking'}"></i>
                    ${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                </div>
                <span class="history-badge ${activity.type}">${activity.type.toUpperCase()}</span>
            </div>
            <div class="history-date">${date.toLocaleDateString()} at ${timeStr}</div>
            <div class="history-stats">
                ${statsHTML}
            </div>
        `;
        historyList.appendChild(item);
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        localStorage.removeItem('activities');
        updateHistoryDisplay();
        updateDashboard();
        alert('History cleared.');
    }
}

// ==================== Dashboard ====================
function updateDashboard() {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    const today = new Date().toISOString().split('T')[0];

    // Today's stats
    const todayActivities = activities.filter(a => new Date(a.date).toISOString().split('T')[0] === today);
    const todayRuns = todayActivities.filter(a => a.type === 'run');
    const todayWalks = todayActivities.filter(a => a.type === 'walk');
    const todayDistance = todayActivities.reduce((sum, a) => sum + a.distance, 0);
    const todayCalories = todayActivities.reduce((sum, a) => sum + a.calories, 0);

    document.getElementById('today-runs').textContent = todayRuns.length;
    document.getElementById('today-walks').textContent = todayWalks.length;
    document.getElementById('today-distance').textContent = todayDistance.toFixed(1) + ' km';
    document.getElementById('today-calories').textContent = todayCalories + ' kcal';

    // Streaks
    const streak = calculateStreak(activities);
    document.getElementById('current-streak').textContent = streak.current;
    document.getElementById('best-streak').textContent = streak.best;

    // Personal records
    const records = calculateRecords(activities);
    document.getElementById('longest-run').textContent = records.longestRun.toFixed(1) + ' km';
    document.getElementById('fastest-pace').textContent = records.fastestPace;

    // Update charts
    updateCharts(activities);
}

function calculateStreak(activities) {
    if (activities.length === 0) return { current: 0, best: 0 };

    const dates = new Set();
    activities.forEach(a => {
        dates.add(new Date(a.date).toISOString().split('T')[0]);
    });

    const sortedDates = Array.from(dates).sort().reverse();
    let current = 0;
    let best = 0;
    let tempStreak = 0;

    const today = new Date().toISOString().split('T')[0];
    let lastDate = today;

    for (const date of sortedDates) {
        const lastDateObj = new Date(lastDate);
        const currentDateObj = new Date(date);
        const diff = (lastDateObj - currentDateObj) / (1000 * 60 * 60 * 24);

        if (diff === 1 || (diff === 0 && date === today)) {
            tempStreak++;
            if (date === today) current = tempStreak;
        } else if (diff > 1) {
            break;
        }

        lastDate = date;
        best = Math.max(best, tempStreak);
    }

    return { current, best };
}

function calculateRecords(activities) {
    let longestRun = 0;
    let fastestPace = Infinity;

    activities.forEach(a => {
        if (a.type === 'run') {
            longestRun = Math.max(longestRun, a.distance);
            if (a.time > 0 && a.distance > 0) {
                const pace = a.time / 60 / a.distance;
                fastestPace = Math.min(fastestPace, pace);
            }
        }
    });

    const paceMin = Math.floor(fastestPace);
    const paceSec = Math.round((fastestPace - paceMin) * 60);
    const paceStr = fastestPace === Infinity ? '--:--' : `${String(paceMin).padStart(2, '0')}:${String(paceSec).padStart(2, '0')}`;

    return { longestRun, fastestPace: paceStr };
}

function updateCharts(activities) {
    // Get last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    const dayLabels = last7Days.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    // Distance data
    const distanceData = last7Days.map(day => {
        return activities
            .filter(a => new Date(a.date).toISOString().split('T')[0] === day)
            .reduce((sum, a) => sum + a.distance, 0);
    });

    // Calories data
    const caloriesData = last7Days.map(day => {
        return activities
            .filter(a => new Date(a.date).toISOString().split('T')[0] === day)
            .reduce((sum, a) => sum + a.calories, 0);
    });

    // Activity type distribution
    const runDistance = activities.filter(a => a.type === 'run').reduce((sum, a) => sum + a.distance, 0);
    const walkDistance = activities.filter(a => a.type === 'walk').reduce((sum, a) => sum + a.distance, 0);

    // Duration data
    const durationData = last7Days.map(day => {
        return activities
            .filter(a => new Date(a.date).toISOString().split('T')[0] === day)
            .reduce((sum, a) => sum + a.time, 0) / 3600; // Convert to hours
    });

    // Create/update charts
    createChart('distanceChart', 'line', dayLabels, distanceData, 'Distance (km)', '#ff6b6b');
    createChart('caloriesChart', 'line', dayLabels, caloriesData, 'Calories (kcal)', '#ffd93d');
    createChart('activityChart', 'doughnut', ['Running', 'Walking'], [runDistance, walkDistance], 'Distance Distribution', ['#ff6b6b', '#4ecdc4']);
    createChart('durationChart', 'bar', dayLabels, durationData, 'Duration (hours)', '#4ecdc4');
}

function createChart(canvasId, type, labels, data, label, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Destroy existing chart if it exists
    if (state.charts[canvasId]) {
        state.charts[canvasId].destroy();
    }

    const colors = Array.isArray(color) ? color : [color];
    const borderColors = Array.isArray(color) ? color : [color];

    state.charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [
                {
                    label: label,
                    data: data,
                    backgroundColor: type === 'doughnut' ? colors : color + '33',
                    borderColor: borderColors,
                    borderWidth: 2,
                    fill: type === 'line',
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#b0b0b0',
                    },
                },
            },
            scales: type === 'doughnut' ? {} : {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#2a2a4e',
                    },
                    ticks: {
                        color: '#b0b0b0',
                    },
                },
                x: {
                    grid: {
                        color: '#2a2a4e',
                    },
                    ticks: {
                        color: '#b0b0b0',
                    },
                },
            },
        },
    });
}

function initializeCharts() {
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    updateCharts(activities);
}

// ==================== Utilities ====================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
