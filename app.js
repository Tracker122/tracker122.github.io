// Fitness Tracker App - Core Logic with Enhanced GPS & Map Features

// ==================== State Management ====================
const state = {
    currentMode: 'run',
    isTracking: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    currentRun: {
        coordinates: [],
        rawCoordinates: [], // Store all GPS points for analysis
        startTime: null,
        distance: 0,
        time: 0,
        calories: 0,
        maxElevation: 0,
        minElevation: Infinity,
        speedReadings: [], // Store last 5 speed readings for moving average
        currentSpeed: 0, // Current smoothed speed
    },
    currentWalk: {
        coordinates: [],
        rawCoordinates: [],
        startTime: null,
        distance: 0,
        time: 0,
        steps: 0,
        calories: 0,
        speedReadings: [], // Store last 5 speed readings for moving average
        currentSpeed: 0, // Current smoothed speed
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
    markers: {
        run: { current: null, start: null, location: null, accuracyCircle: null },
        walk: { current: null, start: null, location: null, accuracyCircle: null },
    },
    charts: {},
    tileLayers: {
        run: {},
        walk: {},
    },
    currentTileLayer: {
        run: 'standard',
        walk: 'standard',
    },
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

    // My Location Buttons
    document.getElementById('run-my-location-btn').addEventListener('click', () => showMyLocation('run'));
    document.getElementById('walk-my-location-btn').addEventListener('click', () => showMyLocation('walk'));

    // Map Layer Controls
    document.querySelectorAll('.tile-layer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTileLayer(e.target.dataset.mode, e.target.dataset.layer);
        });
    });

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('history-date-filter').value = today;
}

function initializeMaps() {
    // Define tile layers
    const tileLayers = {
        standard: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            name: 'Standard',
        },
        detailed: {
            url: 'https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap contributors',
            name: 'Detailed',
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '© Esri',
            name: 'Satellite',
        },
        terrain: {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '© OpenTopoMap contributors',
            name: 'Terrain',
        },
    };

    // Initialize Run Map
    state.maps.run = L.map('run-map', {
        zoom: 16,
        zoomControl: true,
    }).setView([51.505, -0.09], 16);

    state.tileLayers.run = {};
    Object.keys(tileLayers).forEach(key => {
        const layer = tileLayers[key];
        state.tileLayers.run[key] = L.tileLayer(layer.url, {
            attribution: layer.attribution,
            maxZoom: 19,
            minZoom: 13,
        });
    });
    state.tileLayers.run.standard.addTo(state.maps.run);

    // Initialize Walk Map
    state.maps.walk = L.map('walk-map', {
        zoom: 16,
        zoomControl: true,
    }).setView([51.505, -0.09], 16);

    state.tileLayers.walk = {};
    Object.keys(tileLayers).forEach(key => {
        const layer = tileLayers[key];
        state.tileLayers.walk[key] = L.tileLayer(layer.url, {
            attribution: layer.attribution,
            maxZoom: 19,
            minZoom: 13,
        });
    });
    state.tileLayers.walk.standard.addTo(state.maps.walk);

    // Add layer control
    const runLayers = {};
    Object.keys(tileLayers).forEach(key => {
        runLayers[tileLayers[key].name] = state.tileLayers.run[key];
    });
    L.control.layers(runLayers).addTo(state.maps.run);

    const walkLayers = {};
    Object.keys(tileLayers).forEach(key => {
        walkLayers[tileLayers[key].name] = state.tileLayers.walk[key];
    });
    L.control.layers(walkLayers).addTo(state.maps.walk);
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

function switchTileLayer(mode, layer) {
    // Remove current layer
    state.maps[mode].removeLayer(state.tileLayers[mode][state.currentTileLayer[mode]]);
    
    // Add new layer
    state.tileLayers[mode][layer].addTo(state.maps[mode]);
    state.currentTileLayer[mode] = layer;
}

// ==================== My Location Feature ====================
function showMyLocation(mode) {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    const btn = document.getElementById(`${mode}-my-location-btn`);
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const map = state.maps[mode];

            // Center map on user location with animation
            map.flyTo([latitude, longitude], 17, {
                duration: 1,
            });

            // Remove old location marker if exists
            if (state.markers[mode].location) {
                map.removeLayer(state.markers[mode].location);
            }

            // Add new location marker
            state.markers[mode].location = L.circleMarker([latitude, longitude], {
                radius: 10,
                fillColor: '#4ecdc4',
                color: '#fff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.7,
            }).addTo(map);

            // Add accuracy circle
            if (state.markers[mode].accuracyCircle) {
                map.removeLayer(state.markers[mode].accuracyCircle);
            }

            state.markers[mode].accuracyCircle = L.circle([latitude, longitude], {
                radius: accuracy,
                color: '#4ecdc4',
                fillColor: '#4ecdc4',
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '5, 5',
            }).addTo(map);

            // Display coordinates
            const coordsText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            document.getElementById(`${mode}-location-coords`).textContent = coordsText;
            document.getElementById(`${mode}-location-display`).style.display = 'block';

            // Try to get address using reverse geocoding (optional, using free service)
            reverseGeocode(latitude, longitude, mode);

            // Reset button
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMsg = 'Unable to get your location.';
            
            if (error.code === error.PERMISSION_DENIED) {
                errorMsg = 'Location permission denied. Please enable location access in your browser settings.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMsg = 'Location information is unavailable.';
            } else if (error.code === error.TIMEOUT) {
                errorMsg = 'Location request timed out. Please try again.';
            }
            
            alert(errorMsg);
            
            // Reset button
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        }
    );
}

// ==================== Speed Calculation with Moving Average ====================
function updateSpeed(mode, deviceSpeed, latitude, longitude) {
    const current = state[`current${mode.charAt(0).toUpperCase() + mode.slice(1)}`];
    const rawCoords = current.rawCoordinates;
    
    let speed = 0; // km/h
    
    // Primary: Use GPS device's built-in speed if available and reliable
    if (deviceSpeed !== null && deviceSpeed !== undefined && deviceSpeed >= SPEED_FALLBACK_THRESHOLD) {
        // Convert m/s to km/h
        speed = deviceSpeed * 3.6;
    } else if (rawCoords.length >= 2) {
        // Fallback: Calculate speed from recent GPS points (last 2 points)
        const prev = rawCoords[rawCoords.length - 2];
        const current_coord = rawCoords[rawCoords.length - 1];
        
        // Calculate distance in km
        const distance = calculateDistance(prev.lat, prev.lng, latitude, longitude) / 1000;
        
        // Estimate time between points (typically 1-2 seconds for high-accuracy GPS)
        // Use a conservative estimate of 1 second
        const timeSeconds = 1;
        const timeHours = timeSeconds / 3600;
        
        if (timeHours > 0) {
            speed = distance / timeHours;
        }
    }
    
    // Apply stationary threshold - show 0 if speed is below threshold
    if (speed < STATIONARY_THRESHOLD) {
        speed = 0;
    }
    
    // Add to moving average
    current.speedReadings.push(speed);
    
    // Keep only the last N readings
    if (current.speedReadings.length > SPEED_MOVING_AVERAGE_SIZE) {
        current.speedReadings.shift();
    }
    
    // Calculate moving average
    const averageSpeed = current.speedReadings.reduce((a, b) => a + b, 0) / current.speedReadings.length;
    current.currentSpeed = averageSpeed;
    
    console.log(`${mode} speed - Device: ${deviceSpeed ? (deviceSpeed * 3.6).toFixed(1) : 'N/A'} km/h, Current: ${speed.toFixed(1)} km/h, Average: ${averageSpeed.toFixed(1)} km/h`);
}

function reverseGeocode(latitude, longitude, mode) {
    // Using OpenStreetMap Nominatim API (free, no key required)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    fetch(url, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'FitnessTracker-App', // Required by Nominatim
        },
    })
        .then(response => response.json())
        .then(data => {
            if (data.address) {
                // Build address from components
                const addressParts = [];
                
                if (data.address.road) addressParts.push(data.address.road);
                if (data.address.suburb) addressParts.push(data.address.suburb);
                if (data.address.city) addressParts.push(data.address.city);
                if (data.address.state) addressParts.push(data.address.state);
                if (data.address.country) addressParts.push(data.address.country);

                const address = addressParts.slice(0, 3).join(', '); // Show top 3 components
                document.getElementById(`${mode}-location-address`).textContent = address || 'Address not found';
            }
        })
        .catch(error => {
            console.log('Reverse geocoding failed:', error);
            // Silently fail - coordinates are still displayed
        });
}


// ==================== GPS Accuracy Filtering ====================
const ACCURACY_THRESHOLD = 20; // meters - ignore points with lower accuracy
const SMOOTHING_FACTOR = 0.7; // For exponential moving average

function isAccurateGPS(accuracy) {
    return accuracy <= ACCURACY_THRESHOLD;
}

function smoothRoute(coordinates) {
    if (coordinates.length < 2) return coordinates;

    const smoothed = [coordinates[0]];
    
    for (let i = 1; i < coordinates.length; i++) {
        const prev = smoothed[smoothed.length - 1];
        const current = coordinates[i];
        
        // Exponential moving average for smoothing
        const smoothedLat = prev.lat * SMOOTHING_FACTOR + current.lat * (1 - SMOOTHING_FACTOR);
        const smoothedLng = prev.lng * SMOOTHING_FACTOR + current.lng * (1 - SMOOTHING_FACTOR);
        
        smoothed.push({
            lat: smoothedLat,
            lng: smoothedLng,
            alt: current.alt,
            accuracy: current.accuracy,
        });
    }
    
    return smoothed;
}

// ==================== Geolocation & Tracking ====================
function startRun() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }

    state.currentRun = {
        coordinates: [],
        rawCoordinates: [],
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

    // Request location with high accuracy
    state.watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, altitude, accuracy, speed } = position.coords;
            
            // Filter out inaccurate GPS points
            if (!isAccurateGPS(accuracy)) {
                console.log(`GPS point ignored: accuracy ${accuracy}m exceeds threshold of ${ACCURACY_THRESHOLD}m`);
                return;
            }

            const coord = { lat: latitude, lng: longitude, alt: altitude || 0, accuracy, speed };
            state.currentRun.rawCoordinates.push(coord);

            // Update elevation
            if (altitude) {
                state.currentRun.maxElevation = Math.max(state.currentRun.maxElevation, altitude);
                state.currentRun.minElevation = Math.min(state.currentRun.minElevation, altitude);
            }

            // Calculate distance
            if (state.currentRun.rawCoordinates.length > 1) {
                const prev = state.currentRun.rawCoordinates[state.currentRun.rawCoordinates.length - 2];
                const distance = calculateDistance(prev.lat, prev.lng, latitude, longitude);
                state.currentRun.distance += distance;
            }

            // Update speed using GPS device speed or fallback calculation
            updateSpeed('run', speed, latitude, longitude);

            // Smooth the route for display
            state.currentRun.coordinates = smoothRoute(state.currentRun.rawCoordinates);

            updateRunDisplay();
            drawRunRoute();
            centerMapOnUser('run', latitude, longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to access your location. Please check permissions.');
        },
        {
            enableHighAccuracy: true, // Use high-accuracy GPS
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
        rawCoordinates: [],
        startTime: Date.now(),
        distance: 0,
        time: 0,
        steps: 0,
        calories: 0,
    };

    state.isTracking = true;
    state.startTime = Date.now();
    state.pausedTime = 0;

    state.watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy, speed } = position.coords;
            
            // Filter out inaccurate GPS points
            if (!isAccurateGPS(accuracy)) {
                console.log(`GPS point ignored: accuracy ${accuracy}m exceeds threshold of ${ACCURACY_THRESHOLD}m`);
                return;
            }

            const coord = { lat: latitude, lng: longitude, accuracy, speed };
            state.currentWalk.rawCoordinates.push(coord);

            // Calculate distance
            if (state.currentWalk.rawCoordinates.length > 1) {
                const prev = state.currentWalk.rawCoordinates[state.currentWalk.rawCoordinates.length - 2];
                const distance = calculateDistance(prev.lat, prev.lng, latitude, longitude);
                state.currentWalk.distance += distance;

                // Estimate steps (1 step ≈ 0.762 meters average)
                state.currentWalk.steps += Math.round(distance * 1000 / 0.762);
            }

            // Update speed using GPS device speed or fallback calculation
            updateSpeed('walk', speed, latitude, longitude);

            // Smooth the route for display
            state.currentWalk.coordinates = smoothRoute(state.currentWalk.rawCoordinates);

            updateWalkDisplay();
            drawWalkRoute();
            centerMapOnUser('walk', latitude, longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to access your location. Please check permissions.');
        },
        {
            enableHighAccuracy: true, // Use high-accuracy GPS
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

// ==================== Map Centering ====================
function centerMapOnUser(mode, lat, lng) {
    const map = state.maps[mode];
    if (!map) return;

    // Pan to user location
    map.panTo([lat, lng], { animate: true, duration: 0.5 });

    // Update current position marker
    if (state.markers[mode].current) {
        map.removeLayer(state.markers[mode].current);
    }

    state.markers[mode].current = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: mode === 'run' ? '#ff6b6b' : '#4ecdc4',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
    }).addTo(map);
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
    const { distance, time, steps, currentSpeed } = state.currentWalk;

    // Display current speed
    document.getElementById('walk-speed').textContent = currentSpeed.toFixed(1);

    // Calculate pace based on current speed (min/km)
    let pace = 0;
    if (currentSpeed > 0) {
        pace = 60 / currentSpeed; // minutes per km
    }
    const paceMin = Math.floor(pace);
    const paceSec = Math.round((pace - paceMin) * 60);
    document.getElementById('walk-pace').textContent = `${String(paceMin).padStart(2, '0')}:${String(paceSec).padStart(2, '0')}`;

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

    // Create new polyline with smoothed coordinates
    const latlngs = state.currentRun.coordinates.map(c => [c.lat, c.lng]);
    state.polylines.run = L.polyline(latlngs, {
        color: '#ff6b6b',
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
    }).addTo(map);

    // Fit map to route
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

    // Add start marker if this is the first point
    if (state.currentRun.coordinates.length === 1 && !state.markers.run.start) {
        state.markers.run.start = L.circleMarker([state.currentRun.coordinates[0].lat, state.currentRun.coordinates[0].lng], {
            radius: 6,
            fillColor: '#51cf66',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        }).addTo(map).bindPopup('Start');
    }
}

function drawWalkRoute() {
    if (state.currentWalk.coordinates.length < 2) return;

    const map = state.maps.walk;

    // Remove old polyline
    if (state.polylines.walk) {
        map.removeLayer(state.polylines.walk);
    }

    // Create new polyline with smoothed coordinates
    const latlngs = state.currentWalk.coordinates.map(c => [c.lat, c.lng]);
    state.polylines.walk = L.polyline(latlngs, {
        color: '#4ecdc4',
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
    }).addTo(map);

    // Fit map to route
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

    // Add start marker if this is the first point
    if (state.currentWalk.coordinates.length === 1 && !state.markers.walk.start) {
        state.markers.walk.start = L.circleMarker([state.currentWalk.coordinates[0].lat, state.currentWalk.coordinates[0].lng], {
            radius: 6,
            fillColor: '#51cf66',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        }).addTo(map).bindPopup('Start');
    }
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
            rawCoordinates: [],
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
        if (state.markers.run.start) {
            state.maps.run.removeLayer(state.markers.run.start);
            state.markers.run.start = null;
        }
        if (state.markers.run.current) {
            state.maps.run.removeLayer(state.markers.run.current);
            state.markers.run.current = null;
        }
    } else {
        state.currentWalk = {
            coordinates: [],
            rawCoordinates: [],
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
        if (state.markers.walk.start) {
            state.maps.walk.removeLayer(state.markers.walk.start);
            state.markers.walk.start = null;
        }
        if (state.markers.walk.current) {
            state.maps.walk.removeLayer(state.markers.walk.current);
            state.markers.walk.current = null;
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
