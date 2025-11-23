# SafeRoute AI - Toronto Risk Map

Risk-aware urban map visualization for Toronto using crime statistics.

## Features (MVP)
- Dark-themed Leaflet map
- GeoJSON visualization of Toronto neighbourhoods
- Interactive popups with crime data
- Hover effects and click-to-zoom

## Setup

1. Make sure you have Node.js installed
2. Run the server:
   ```bash
   node server.js
   ```
3. Open browser at `http://localhost:3000`

## Files Structure
```
├── index.html          # Main HTML page
├── style.css           # Dark theme styles
├── app.js              # Leaflet map and GeoJSON logic
├── server.js           # Simple Node.js static server
├── package.json        # Project configuration
└── *.geojson          # GeoJSON data files
```

## Dependencies

### Runtime Dependencies
- **Node.js** (v14 or higher) - JavaScript runtime for the server
  - Built-in modules used:
    - `http` - HTTP server
    - `fs` - File system operations
    - `path` - Path utilities

### Frontend Dependencies (CDN)
- **Leaflet.js** v1.9.4 - Interactive map library
  - CSS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
  - JS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
  - Documentation: https://leafletjs.com/

### Map Tiles
- **CartoDB Dark Matter** - Dark-themed basemap tiles
  - URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`

### Data Files
- `Neighbourhood_Crime_Rates_Open_Data_*.geojson` - Toronto neighbourhood crime data (GeoJSON format)
- `Neighbourhood_Crime_Rates_Open_Data_*.csv` - Toronto neighbourhood crime data (CSV format)

## Technologies
- **Frontend**: HTML, CSS, JavaScript
- **Map**: Leaflet.js with CartoDB Dark basemap
- **Backend**: Node.js (static file server)
- **Data**: Toronto Open Data (GeoJSON format)

## Future Enhancements
- [ ] ML-based risk score calculation
- [ ] Color-coded risk visualization (green → red)
- [ ] Risk-aware routing algorithm
- [ ] Real-time data updates
- [ ] Additional data layers (transit, lighting, etc.)
