# Fitness Tracker 🏃‍♂️

A modern, responsive web application for tracking your running and walking activities with GPS coordinates, real-time metrics, and comprehensive analytics.

## Live Demo

🌐 **Visit the app:** [tracker122.github.io](https://tracker122.github.io)

## Features

### 🏃 Running Tracker
- **GPS Tracking**: Real-time location tracking with high accuracy
- **Distance Calculation**: Automatic distance calculation using Haversine formula
- **Speed & Pace**: Live speed (km/h) and pace (min/km) calculations
- **Elevation Tracking**: Records elevation gain/loss during runs
- **Calories Burned**: Estimates calories burned based on distance and speed
- **Route Visualization**: Interactive map with Leaflet.js showing your route
- **Start/Pause/Stop Controls**: Full control over your tracking session

### 🚶 Walking Tracker
- **Step Estimation**: Automatic step counting based on distance traveled
- **Daily Goals**: Track progress toward daily step goals (default 10,000 steps)
- **Progress Visualization**: Visual progress bar showing daily goal completion
- **Route Mapping**: See your walking route on an interactive map
- **Calories Tracking**: Estimates calories burned during walks

### 📊 Dashboard
- **Daily Statistics**: View today's runs, walks, distance, and calories
- **Streaks & Records**: Track current and best streaks, longest run, fastest pace
- **Weekly Charts**: 
  - Distance trends (line chart)
  - Calories burned (line chart)
  - Activity distribution (doughnut chart)
  - Duration tracking (bar chart)
- **Real-time Updates**: Charts update automatically as you add activities

### 📱 Activity History
- **Complete History**: View all past activities with detailed metrics
- **Filtering**: Filter by date or activity type (runs/walks)
- **Detailed Metrics**: See distance, duration, speed, calories, and more
- **Data Persistence**: All data stored locally in your browser

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Maps**: [Leaflet.js](https://leafletjs.com/) with OpenStreetMap tiles
- **Charts**: [Chart.js](https://www.chartjs.org/) for data visualization
- **Storage**: Browser localStorage for persistent data
- **APIs**: Geolocation API for GPS tracking
- **Hosting**: GitHub Pages

## How to Use

### Starting a Run
1. Click the **"Tracker"** tab
2. Make sure **"Running"** mode is selected
3. Click **"Start Run"** button
4. Allow location permission when prompted
5. Your GPS coordinates will be recorded in real-time
6. Watch your distance, speed, pace, and calories update live
7. Click **"Pause"** to pause tracking, **"Resume"** to continue
8. Click **"Stop"** when finished
9. Click **"Save Run"** to save your activity

### Starting a Walk
1. Click the **"Tracker"** tab
2. Select **"Walking"** mode
3. Click **"Start Walk"** button
4. Allow location permission when prompted
5. Track your steps and distance as you walk
6. Watch your progress toward your daily goal
7. Click **"Stop"** when finished
8. Click **"Save Walk"** to save your activity

### Viewing Dashboard
1. Click the **"Dashboard"** tab
2. View today's statistics and personal records
3. Check your weekly trends with interactive charts
4. Track your current and best streaks

### Viewing History
1. Click the **"History"** tab
2. Filter by date or activity type
3. View detailed metrics for each activity
4. Clear history if needed (cannot be undone)

## Data Storage

All your data is stored locally in your browser using localStorage. This means:
- ✅ Your data stays private and never leaves your device
- ✅ Your data persists between browser sessions
- ✅ You can access your history anytime
- ⚠️ Clearing browser data will delete your history

## Browser Requirements

- Modern browser with support for:
  - Geolocation API
  - localStorage
  - ES6 JavaScript
  - CSS Grid & Flexbox

**Recommended browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Installation & Deployment

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/Tracker122/tracker122.github.io.git
   cd tracker122.github.io
   ```

2. Open `index.html` in your browser or use a local server:
   ```bash
   python3 -m http.server 8000
   # Visit http://localhost:8000
   ```

### Deploy to GitHub Pages
The app is already deployed at [tracker122.github.io](https://tracker122.github.io). To deploy your own version:

1. Create a repository named `{username}.github.io`
2. Push the files to the main branch
3. GitHub Pages will automatically deploy your site

## Metrics Calculations

### Distance
Uses the Haversine formula to calculate the great-circle distance between GPS coordinates:
```
d = 2R × arcsin(√[sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)])
```
Where R = 6371 km (Earth's radius)

### Speed
```
Speed (km/h) = Distance (km) / Time (hours)
```

### Pace
```
Pace (min/km) = Time (minutes) / Distance (km)
```

### Calories (Running)
```
Calories = Distance × 0.063 × Weight × (1 + Speed/10)
```
Assumes average weight of 70 kg

### Calories (Walking)
```
Calories = Steps × 0.04
```

### Steps (Walking)
```
Steps = Distance (meters) / 0.762
```
Assumes average stride length of 0.762 meters

## Features & Limitations

### ✅ What Works Great
- Real-time GPS tracking with high accuracy
- Accurate distance calculations
- Beautiful, responsive UI
- Offline-first with localStorage
- No API keys or backend required
- Works on mobile and desktop

### ⚠️ Known Limitations
- Requires HTTPS or localhost (Geolocation API requirement)
- GPS accuracy depends on device and environment
- Calorie calculations are estimates based on averages
- Data is stored locally (not synced across devices)
- No user accounts or cloud backup

## Privacy & Security

- 🔒 All data is stored locally in your browser
- 🔒 No data is sent to any server
- 🔒 No tracking or analytics
- 🔒 No ads or third-party scripts (except CDN libraries)
- 🔒 HTTPS enforced for security

## Performance

- ⚡ Lightweight (< 100KB total)
- ⚡ No build process required
- ⚡ Fast loading on all devices
- ⚡ Smooth animations and transitions
- ⚡ Optimized for mobile

## Future Enhancements

Potential features for future versions:
- Social sharing of activities
- Activity photos/media
- Weather integration
- Training plans
- Achievement badges
- Export data (CSV, GPX)
- Dark/light theme toggle
- Multiple user profiles
- Cloud backup option

## Contributing

Found a bug or have a suggestion? Feel free to open an issue or submit a pull request!

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or feedback, please open an issue on GitHub.

---

**Happy tracking! 🏃‍♀️🚶‍♂️**
