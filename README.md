# SafeRoute AI - Toronto Risk Map

**AI-powered safe route navigation system** using real Toronto crime data, live incident monitoring, OpenStreetMap infrastructure, and intelligent weight calculation for risk-aware pathfinding.

---

## 🎯 Project Overview

SafeRoute AI is a comprehensive urban safety navigation system that analyzes Toronto's downtown area to create a **weighted routing graph** enabling safe path calculation between any two points. The system combines historical crime statistics, real-time incident monitoring, and advanced geospatial analysis to provide users with actionable safety intelligence.

### Key Capabilities:
- 🗺️ **Interactive Risk Visualization**: Dark-themed map with color-coded streets (🟢 safe → 🔴 dangerous)
- 🤖 **AI-Powered Live Incident Monitoring**: Gemini AI integration for real-time crime data analysis
- 📊 **Weighted Routing Graph**: 11,495 intersection nodes + 13,195 street edges with safety scores
- 🧠 **Smart Multi-Factor Analysis**: Crime rates, POI density, street characteristics, and intersection complexity
- 📍 **Real Toronto Data**: Crime rates from 2024 across 158 neighborhoods + live incident tracking
- 🚨 **Dynamic Danger Zones**: 100m radius circles around active incidents with detailed descriptions
- 🎯 **Ready for Pathfinding**: Complete graph structure for A* or Dijkstra safe routing algorithms

---

## 🚀 Features

### 1. **Historical Crime Analysis**
- Processes 158 Toronto neighborhoods with normalized crime rates (per capita)
- Analyzes 9 crime types: Homicide, Shooting, Robbery, Assault, Break & Enter, Auto Theft, Theft from MV, Theft Over, Bike Theft
- Severity-weighted scoring system prioritizing violent crimes
- Color-coded visualization: green (safe) → yellow → orange → red (dangerous)

### 2. **Live Crime Incident Monitoring** 🆕
- **AI-Powered Analysis**: Gemini 2.0 Flash integration for intelligent crime data extraction
- **Real-Time Updates**: Fetches latest incidents from Toronto crime feeds
- **Automatic Geocoding**: Converts location descriptions to precise GPS coordinates
- **Detailed Descriptions**: News-style summaries with location, type, severity, and full incident details
- **Visual Alerts**: Red danger zone circles (100m radius) with pulsing markers
- **Smart Popup Interface**: Consolidated view of all active incidents with severity indicators

### 3. **Intelligent Weight System**
Each street intersection receives a 0-100 safety score based on:
- **Crime Risk** (40%): Neighborhood crime statistics normalized by population
- **POI Density** (20%): Nearby bars, nightlife, and high-activity venues
- **Street Importance** (20%): Road type classification (highway vs residential)
- **Intersection Complexity** (20%): Number of converging streets (traffic exposure)

### 4. **Advanced Geospatial Analysis**
- **Point-in-Polygon Spatial Joins**: Maps street intersections to neighborhood crime zones
- **Coordinate System Accuracy**: WGS84 (EPSG:4326) with 6-decimal precision (~10cm accuracy)
- **Spatial Indexing**: Optimized POI lookups within 100m radius
- **Boundary Visualization**: 158 neighborhood polygons rendered as GeoJSON layers

---

## 🎬 Demo

### Usage
1. **Open SafeRoute AI**: Navigate to `http://localhost:3000`
2. **View Crime Heat Map**: Streets colored by safety score (green = safe, red = dangerous)
3. **Fetch Live Incidents**: Click "🤖 Fetch Live Crime Data" button
4. **AI Processing**: Wait ~10 seconds while Gemini AI analyzes latest crime reports
5. **View Results**: 
   - Map auto-pans to show all active incidents
   - Red markers with 100m danger zones appear
   - Popup displays all incidents with detailed descriptions
   - Click individual markers for specific incident details

### What You'll See:
- 🟢 **Safe Streets**: Low crime neighborhoods (e.g., Lambton Baby Point)
- 🟡 **Moderate Risk**: Mixed safety zones
- 🔴 **High Risk**: Entertainment districts, high-crime areas (e.g., Yonge-Bay Corridor)
- 🚨 **Active Incidents**: Live crime events with severity ratings (60-95%)
- 📍 **Precise Locations**: GPS coordinates, street intersections, and neighborhood names

---

## 📊 How It Works

### 1. **Crime Risk Calculation**
Uses **crime RATES** (normalized by population) from Toronto Open Data:

```python
# Crime type weights (based on severity)
CRIME_WEIGHTS = {
    'HOMICIDE': 10.0,    # Most severe
    'SHOOTING': 10.0,
    'ROBBERY': 5.0,
    'ASSAULT': 3.0,
    'BREAK_AND_ENTER': 2.0,
    'AUTO_THEFT': 2.0,
    'THEFT_FROM_MV': 1.0,
    'THEFT_OVER': 1.0,
    'BIKE_THEFT': 1.0
}

# Calculate neighborhood risk score
risk_score = Σ(crime_rate × weight) for all crime types
risk_normalized = (risk - min) / (max - min)  # Normalize to 0-1
```

**Example Results:**
- **Highest Risk**: West Humber-Clairville (normalized: 1.0)
- **Lowest Risk**: Lambton Baby Point (normalized: 0.0)

### 2. **Live Incident Processing Pipeline** 🆕

```
1. Data Fetching
   ↓
   Scrape Toronto crime feeds (gtaupdate.com, police reports)
   
2. AI Analysis (Gemini 2.0 Flash)
   ↓
   Extract structured data:
   - Location (street intersections, districts)
   - Crime type (shooting, robbery, assault, etc.)
   - Severity (1-100 scale)
   - Detailed description (2-3 sentence summary)
   
3. Geocoding
   ↓
   Convert locations to GPS coordinates:
   - Toronto Fire Service (TFS) district mapping
   - Nominatim OpenStreetMap API
   - Custom coordinate database
   
4. Visualization
   ↓
   Create map elements:
   - Red circular markers (20px, white border, pulsing shadow)
   - Danger zone circles (100m radius, 20% opacity)
   - Detailed popups (location, description, severity table)
   
5. User Interface
   ↓
   Display consolidated popup:
   - All incidents sorted by severity
   - Color-coded borders (red > 80%, orange 70-80%, yellow < 70%)
   - Timestamp and data source attribution
```

### 3. **Intersection (Node) Weight Calculation**

Each of the **11,495 intersections** gets a weight based on **4 key features**:

#### **Feature Extraction Per Intersection**

```python
# 1. Neighborhood Crime Risk (via spatial join)
# Uses point-in-polygon to find which neighborhood contains this intersection
for neighborhood_polygon in neighborhoods:
    if neighborhood_polygon.contains(intersection_point):
        risk_score = neighborhood_risk[neighborhood_name]  # 0-1 normalized
        break

# 2. POI Density (Points of Interest within 100m)
# Counts restaurants, shops, bars, etc. using spatial grid optimization
buffer_radius = 0.001  # ~100 meters in degrees
num_pois = count_pois_within_radius(intersection, buffer_radius)
poi_density = min(num_pois / 50.0, 1.0)  # Normalized, capped at 50

# 3. Street Type Importance (average of connected streets)
# Different street types have different priority values:
highway_priorities = {
    'motorway': 1.0,      # Highest exposure
    'trunk': 0.9,
    'primary': 0.8,
    'secondary': 0.7,
    'tertiary': 0.6,
    'residential': 0.4,
    'service': 0.2,
    'footway': 0.1        # Lowest exposure
}
avg_street_priority = mean([priority for street in connected_streets])

# 4. Intersection Degree (complexity)
# Number of streets meeting at this intersection
degree = len(connected_streets)
degree_normalized = min(degree / 8.0, 1.0)  # Normalized, capped at 8
```

#### **Weight Formula**

```python
# Weighted combination of all features:
weight_components = {
    'crime_rate': risk_score × 40%,              # Neighborhood crime (most important)
    'poi_density': poi_density × 20%,            # Local activity level
    'street_importance': avg_street_priority × 20%,  # Road exposure
    'degree': degree_normalized × 20%            # Intersection complexity
}

total_weight = sum(weight_components.values())

# Scale to meaningful range (0-100)
final_weight = total_weight × 100
```

#### **Weight Categorization**

| Range | Category | Color | Count | Description |
|-------|----------|-------|-------|-------------|
| 0-30 | Low | 🟢 Green | 4,772 | Safe residential areas, low crime |
| 30-60 | Medium | 🟡 Yellow | 5,339 | Mixed areas, moderate activity |
| 60-100 | High | 🔴 Red | 1,384 | High crime areas, busy intersections |

#### **Real Examples**

**Example 1: High-Risk Intersection**
- **Location**: Yonge & Dundas (Downtown Core)
- **Neighborhood**: Yonge-Bay Corridor (risk: 0.95)
- **POIs nearby**: 73 (bars, restaurants, shops)
- **Streets**: 4-way intersection (primary roads)
- **Calculation**:
  ```
  crime:     0.95 × 40% = 38.0
  poi:       1.00 × 20% = 20.0  (73/50 capped at 1.0)
  street:    0.80 × 20% = 16.0  (primary road)
  degree:    0.50 × 20% = 10.0  (4 streets / 8)
  -----------------------------------
  Total:     84.0 → 🔴 High Risk
  ```

**Example 2: Low-Risk Intersection**
- **Location**: Quiet residential corner in North Riverdale
- **Neighborhood**: North Riverdale (risk: 0.12)
- **POIs nearby**: 0
- **Streets**: Simple 2-way (residential)
- **Calculation**:
  ```
  crime:     0.12 × 40% = 4.8
  poi:       0.00 × 20% = 0.0
  street:    0.40 × 20% = 8.0   (residential)
  degree:    0.25 × 20% = 5.0   (2 streets / 8)
  -----------------------------------
  Total:     17.8 → 🟢 Low Risk
  ```

### 3. **Edge (Street) Weight Calculation**

Each of the **13,195 street segments** (edges) connects two intersections (nodes). The edge inherits the average weight of its endpoints.

```python
# Get the two nodes connected by this street
start_node = nodes[edge_start_id]
end_node = nodes[edge_end_id]

# Average their weights
edge_weight = (start_node['weight'] + end_node['weight']) / 2

# Store with street metadata
edge = {
    'source': edge_start_id,
    'target': edge_end_id,
    'weight': edge_weight,
    'length_m': street_length_meters,
    'name': street_name,
    'highway_type': street_type
}
```

#### **Why Average the Endpoints?**

Streets represent **transitions** between two points:
- Starting at Node A (weight 60)
- Ending at Node B (weight 80)
- Walking this street exposes you to **both risk levels**
- Average (70) represents the **overall exposure** along the route

#### **Edge Distribution**

| Weight Range | Risk Level | Count | Percentage |
|--------------|------------|-------|------------|
| 12-30 | Low 🟢 | 9,571 | 72.5% |
| 30-70 | Medium 🟡 | 3,614 | 27.4% |
| 70-129 | High 🔴 | 10 | 0.1% |

#### **Real Examples**

**Example 1: High-Risk Street**
- **Street**: Dundas St E segment near Yonge
- **Start Node**: Weight 84.0 (Yonge & Dundas intersection)
- **End Node**: Weight 78.5 (Next intersection east)
- **Edge Weight**: (84.0 + 78.5) / 2 = **81.25** 🔴
- **Length**: 127 meters
- **Visualization**: Bright red line on map

**Example 2: Safe Street**
- **Street**: Residential side street in North Riverdale
- **Start Node**: Weight 17.8 (quiet corner)
- **End Node**: Weight 19.2 (another quiet corner)
- **Edge Weight**: (17.8 + 19.2) / 2 = **18.5** 🟢
- **Length**: 89 meters
- **Visualization**: Green line on map

#### **Routing Implications**

When calculating the **safest route** using A* algorithm:

```python
# For each edge in the path:
route_cost = distance_cost × (1 - safety_weight) + safety_cost × safety_weight

# With safety_weight = 0.9 (90% safety priority):
# - Edge with weight 18.5 → LOW cost (preferred)
# - Edge with weight 81.25 → HIGH cost (avoided)

# The algorithm will choose longer but safer routes
# avoiding high-weight edges even if they're shorter
```

## 📁 Project Structure

```
├── index.html                    # Web interface
├── app.js                        # Leaflet map + visualization logic
├── style.css                     # Dark theme styling
├── server.js                     # Node.js static file server
├── package.json                  # Project configuration
│
├── Data Files:
│   ├── Neighbourhood_Crime_Rates_*.csv        # Crime statistics (158 neighborhoods)
│   ├── Neighbourhood_Crime_Rates_*.geojson    # Neighborhood boundaries
│   ├── planet_*.osm.geojson.xz               # OpenStreetMap data (compressed)
│   ├── downtown_streets.geojson              # 22,448 street segments
│   ├── downtown_pois.geojson                 # 19,487 points of interest
│   ├── intersection_weights.csv              # 11,495 weighted nodes
│   ├── intersection_weights.geojson          # Nodes for visualization
│   ├── routing_edges.csv                     # 13,195 weighted edges
│   ├── routing_edges.geojson                 # Edges for visualization
│   └── routing_graph.json                    # Complete graph structure
│
├── Python Scripts:
│   ├── process_downtown_osm.py               # Extract streets/POIs from OSM
│   ├── calculate_intersection_weights.py     # Calculate node weights
│   └── create_routing_graph.py               # Build routing graph
│
└── ML Notebooks:
    └── ML_Weight_Prediction.ipynb            # Train ML models (future work)
```

## 🛠️ Setup

### Prerequisites
- **Node.js** v14+ (JavaScript runtime)
- **Python** 3.8+ (for data processing)
- Python packages: `pandas`, `numpy`, `shapely`, `scikit-learn`

### Installation

```bash
# 1. Install Python dependencies
pip install pandas numpy shapely scikit-learn

# 2. Start the web server
node server.js

# 3. Open browser
# Navigate to http://localhost:3000
```

## 📍 Coverage Area

**Downtown Toronto** - optimized for dense urban routing:
- **Bounds**: 43.629°N to 43.675°N, -79.429°W to -79.347°W
- **Key areas**: Financial District, Entertainment District, Yonge-Bay Corridor
- **Size**: ~5km × 5km area with high intersection density

## 🎨 Visualization

The map shows **routing edges** color-coded by weight:

| Color | Weight Range | Risk Level | Count |
|-------|-------------|------------|-------|
| 🟢 Green | 12-30 | Safe | 9,571 edges |
| 🟡 Yellow | 30-70 | Medium | 3,614 edges |
| 🔴 Red | 70-129 | High Risk | 10 edges |

**Click any street** to see:
- Weight value
- Length (meters)
- Street name
- Highway type
- Risk category

## 🧮 Technical Details

### Graph Statistics
- **Nodes**: 11,495 intersections
- **Edges**: 13,195 street segments (bidirectional)
- **Average degree**: 2.3 edges per node
- **Weight range**: 12.0 - 128.8
- **Graph type**: Weighted, undirected

### Data Sources
1. **Toronto Open Data**: Crime rates by neighborhood (2014-2024)
2. **OpenStreetMap**: Street network, buildings, POIs
3. **Spatial Analysis**: Point-in-polygon for neighborhood assignment

### Calculation Pipeline

```
1. Load Crime Data (158 neighborhoods)
   ↓
2. Calculate Risk Scores (weighted sum of crime rates)
   ↓
3. Load OSM Data (22,448 streets + 19,487 POIs)
   ↓
4. Extract Intersections (11,495 nodes)
   ↓
5. Calculate Intersection Weights
   - Spatial join with neighborhoods
   - Count nearby POIs (100m radius)
   - Analyze street types
   ↓
6. Build Graph Edges (13,195 connections)
   - Match street endpoints to intersections
   - Calculate edge weights
   - Create bidirectional graph
   ↓
7. Export for Visualization & Routing
```

## 🤖 Machine Learning (Future Work)

The system is prepared for ML-based weight prediction:

**Approach**: Train models to predict weights based on features
- **Features**: Street type, POI density, building density, neighborhood risk
- **Target**: Weight value or category (Low/Medium/High)
- **Models**: RandomForest Regressor/Classifier, GradientBoosting
- **Use case**: Predict weights for new areas without manual calculation

See `ML_Weight_Prediction.ipynb` for implementation details.

## 🔬 Technical Deep Dive: Spatial Join Methodology

### **The Challenge: Area-Level Data → Point-Level Weights**

Crime data comes aggregated by **neighborhood areas** (158 polygons), but we need weights for **individual intersections** (11,495 points). How do we map area data to specific locations?

### **Solution: Point-in-Polygon Spatial Join**

#### **Step 1: Load Neighborhood Polygons**
```python
# From GeoJSON - each neighborhood is a polygon
neighborhoods = {
    "Yonge-Bay Corridor": Polygon([
        (-79.40, 43.65),  # SW corner
        (-79.36, 43.65),  # SE corner
        (-79.36, 43.68),  # NE corner
        (-79.40, 43.68)   # NW corner
    ]),
    "North Riverdale": Polygon([...]),
    ...
}
```

#### **Step 2: Load Risk Scores by Name**
```python
# From CSV - risk score per neighborhood
neighborhood_risk = {
    "Yonge-Bay Corridor": 0.95,  # High crime
    "North Riverdale": 0.12,     # Low crime
    ...
}
```

#### **Step 3: Spatial Join - The Core Algorithm**
```python
# For each intersection extracted from OSM:
intersection = Point(-79.3857, 43.6608)  # Just lat/lon coordinates

# Find which neighborhood contains this point
for name, polygon in neighborhoods.items():
    if polygon.contains(intersection):  # ← Point-in-Polygon test
        risk_score = neighborhood_risk[name]
        break

# Result: Point (-79.3857, 43.6608) is inside "Yonge-Bay Corridor"
# → Inherits risk score: 0.95
```

### **How `.contains()` Works: Ray Casting Algorithm**

The Shapely library uses computational geometry to test if a point is inside a polygon:

1. **Cast a ray** from the point to infinity (→)
2. **Count crossings** with polygon boundary
3. **Odd crossings** = INSIDE ✅ | **Even crossings** = OUTSIDE ❌

```
Visual Example:

Inside:
    ┌─────────────┐
    │ Polygon     │
    │   • P ─────→│─→  (crosses 1 time = ODD = INSIDE)
    │             │
    └─────────────┘

Outside:
• P ─────→┌──────┐─→  (crosses 2 times = EVEN = OUTSIDE)
          │      │
          └──────┘
```

### **Coordinate System Accuracy**

Both datasets use **WGS84 (EPSG:4326)** - geographic coordinates in decimal degrees:

| Source | Format | Example | Precision |
|--------|--------|---------|-----------|
| Crime GeoJSON | Lon, Lat (degrees) | -79.3857, 43.6608 | 6 decimals ≈ 0.1m |
| OSM Streets | Lon, Lat (degrees) | -79.3857, 43.6608 | 6 decimals ≈ 0.1m |

✅ **Same projection → Accurate spatial relationships**

### **Complete Workflow Example**

```python
# 1. Intersection from OSM
intersection = Point(-79.3857, 43.6608)

# 2. Find neighborhood via spatial join
yonge_bay_polygon = Polygon([(-79.40, 43.65), (-79.36, 43.68), ...])
yonge_bay_polygon.contains(intersection)  # → True

# 3. Get risk score
risk = 0.95  # From CSV for "Yonge-Bay Corridor"

# 4. Count nearby POIs
pois_within_100m = 73  # Spatial query

# 5. Calculate weight
weight = (
    risk * 0.40 +              # Crime risk (40%)
    (73/50) * 0.20 +           # POI density (20%)
    0.8 * 0.20 +               # Street importance (20%)
    (4/8) * 0.20               # Degree (20%)
) * 100 = 84.0
```

### **Why This Approach Works**

✅ **Mathematically sound**: Point-in-polygon is a proven computational geometry algorithm  
✅ **Consistent CRS**: Both datasets use WGS84  
✅ **High precision**: 6 decimal places = ~10cm accuracy  
✅ **Efficient**: Spatial indexing for fast lookups  
✅ **Validated**: Shapely is industry-standard geospatial library  

---

## 💬 Plain English Explanation (For Pitch)

### **The Problem We Solved**

Toronto publishes crime data by **neighborhood** - but people walk **street by street**. How do you tell someone which exact intersection is safe or dangerous?

### **Our Solution: Smart Data Mapping**

Think of it like this:

1. **Crime Data = Big Zones** 🗺️
   - Toronto is divided into 158 neighborhoods
   - Each neighborhood has a crime rate (like a "danger score")
   - Example: "Yonge-Bay Corridor" = High Crime (95/100)

2. **Street Network = Tiny Points** 📍
   - We have 11,495 street intersections from OpenStreetMap
   - Each intersection is just a GPS coordinate (latitude, longitude)
   - Example: Yonge & Dundas intersection = (43.6608°N, -79.3857°W)

3. **The Magic: Connecting the Dots** ✨
   - Our algorithm asks: "Is this intersection GPS point **inside** the Yonge-Bay neighborhood zone?"
   - Computer draws a line from the point and counts how many times it crosses the neighborhood boundary
   - Odd crossings = inside, even crossings = outside
   - Once we know the neighborhood, we assign that area's crime score to the intersection

4. **Make It Smarter** 🧠
   - We add local factors:
     - How many bars/stores nearby? (More activity = more risk)
     - How busy is the intersection? (4-way vs 2-way)
     - What type of street? (Highway vs residential)

5. **Live Crime Integration** 🚨
   - Gemini AI analyzes real-time Toronto crime feeds
   - Extracts location, type, severity from news-style reports
   - Geocodes to precise GPS coordinates
   - Creates 100m danger zones on map
   - Consolidated popup shows all active incidents
   
6. **Final Result: Every Street Has a Safety Score** 🎯
   - Yonge & Dundas: Weight 84 (High Crime area + 73 bars nearby + busy 4-way) = 🔴 Red
   - Quiet Riverdale street: Weight 12 (Low Crime area + 0 bars + simple 2-way) = 🟢 Green
   - Live incidents: Red markers with 100m radius danger circles

### **Why This Matters**

- **Accurate**: Uses real Toronto crime statistics (2024 data) + live incident monitoring
- **Precise**: Down to individual street corners, not just neighborhoods
- **Smart**: Considers multiple safety factors + AI-powered analysis
- **Visual**: Color-coded map shows safe (green) vs dangerous (red) streets
- **Real-Time**: Fresh incidents with detailed descriptions and severity ratings
- **Actionable**: Powers safe route navigation - avoid red zones, prefer green streets

### **The Technical Win**

We bridged three incompatible data sources:
- **Crime data**: Area-level (neighborhoods)
- **Street data**: Point-level (GPS coordinates)
- **Live incidents**: Text descriptions → structured data

Using proven geospatial algorithms and cutting-edge AI, we accurately mapped area statistics to individual locations and integrated real-time monitoring - enabling comprehensive street-by-street safety analysis.

---

## 💻 Tech Stack

### **Frontend**
- **JavaScript (ES6+)**: Core application logic and map interactions
- **Leaflet.js v1.9.4**: Interactive map rendering and layer management
- **HTML5/CSS3**: Responsive UI with dark theme styling
- **Fetch API**: Asynchronous data loading

### **Backend**
- **Node.js**: HTTP server for static files and API endpoints
- **Python 3.x**: Data processing pipeline and AI integration

### **AI & Data Processing**
- **Google Gemini 2.0 Flash**: Natural language processing for crime incident extraction
- **Beautiful Soup 4**: Web scraping for live crime feeds
- **Pandas**: Data manipulation and statistical analysis
- **NumPy**: Numerical computing for weight calculations
- **Shapely**: Computational geometry and spatial operations

### **Geospatial**
- **OpenStreetMap (OSM)**: Street network data (11,495 nodes, 13,195 edges)
- **Nominatim API**: Geocoding and reverse geocoding
- **GeoJSON**: Standard format for crime boundaries and routing graph
- **WGS84 (EPSG:4326)**: Coordinate reference system

### **Data Sources**
- **Toronto Open Data**: 2024 crime statistics (158 neighborhoods, 9 crime types)
- **Live Crime Feeds**: Real-time incident monitoring
- **Toronto Fire Service (TFS)**: District coordinate mapping

### **Map Visualization**
- **CartoDB Dark Matter**: Basemap tiles for night-mode aesthetic
- **Custom Markers**: SVG-based crime incident indicators
- **Dynamic Layers**: Crime boundaries, routing edges, danger zones

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js v14+ installed
- Python 3.7+ installed
- Internet connection (for map tiles and AI API)

### **Installation**

```bash
# 1. Clone repository
git clone https://github.com/Solarcemir/Sheridan_Datathon.git
cd Sheridan_Datathon

# 2. Install Python dependencies
pip install pandas numpy shapely scikit-learn beautifulsoup4 requests google-generativeai python-dotenv

# 3. Set up environment variables (optional for AI features)
# Create .env file with your Gemini API key:
echo "GEMINI_API_KEY=your_api_key_here" > .env

# 4. Start the server
node server.js
```

### **Usage**

```bash
# Server starts on http://localhost:3000
🚀 Server running at http://localhost:3000/
📍 SafeRoute AI - Toronto Risk Map
```

**Open browser** → Navigate to `http://localhost:3000`

### **Features to Try**

1. **Explore Crime Heat Map**
   - Pan/zoom around Toronto
   - Streets colored green (safe) to red (dangerous)
   - Neighborhood boundaries visible

2. **Fetch Live Incidents**
   - Click "🤖 Fetch Live Crime Data" button
   - Wait ~10 seconds for AI processing
   - View consolidated popup with all incidents
   - Red danger zones appear on map

3. **Inspect Individual Incidents**
   - Click any red marker
   - See detailed popup with location, description, severity

---

## 📊 Data Pipeline

### **1. Historical Crime Processing** (Python)

**Input Files:**
- `Neighbourhood_Crime_Rates_Open_Data.csv` - Crime statistics
- `Neighbourhood_Crime_Rates_Open_Data.geojson` - Neighborhood boundaries
- Toronto OSM extract (street network XML)

**Output Files:**
- `routing_graph.json` - 11,495 nodes with safety weights (9.8 MB)
- `routing_edges.geojson` - 13,195 edges for visualization (15 MB)

### **2. Live Crime Monitoring** (Python + Node.js)

```bash
# Server endpoint: GET /fetch-live-crimes
# Returns JSON with live incidents
```

**Pipeline:**
1. Scrape Toronto crime feeds
2. Gemini AI extracts structured data
3. Geocode locations to GPS coordinates
4. Return JSON to frontend
5. Frontend creates markers and danger zones

**Output Format:**
```json
{
  "success": true,
  "events": [
    {
      "lat": 43.6532,
      "lon": -79.3832,
      "type": "shooting",
      "impact": 95,
      "location": "King St W & Spadina Ave",
      "description": "Detailed incident description..."
    }
  ],
  "timestamp": "2024-11-23T12:34:56Z"
}
```

---

## 🗺️ Project Structure

```
Sheridan_Datathon/
│
├── index.html                 # Main web interface
├── style.css                  # Dark theme styling
├── app.js                     # Frontend logic (2100+ lines)
├── server.js                  # Node.js HTTP server
│
├── routing_graph.json         # 11,495 nodes with safety weights (9.8 MB)
├── routing_edges.geojson      # 13,195 edges for visualization (15 MB)
├── Neighbourhood_Crime_Rates_*.csv     # Crime statistics
├── Neighbourhood_Crime_Rates_*.geojson # Boundaries
│
├── fetch_live_crimes.py       # AI-powered live crime fetching
├── gemini_api.py             # Gemini AI integration
├── .env                       # API keys (not committed)
│
└── README.md                  # This file
```

---

## 🎯 Future Roadmap

### **Phase 1: Smart Routing** (Next Sprint)
- [ ] Implement A* pathfinding with safety weights
- [ ] Drag-and-drop start/end point selection
- [ ] Display safest route vs shortest route comparison
- [ ] Show route statistics (distance, time, safety score)
- [ ] Turn-by-turn navigation with safety alerts

### **Phase 2: Advanced AI** (Q1 2025)
- [ ] Train ML models to predict crime hotspots by time of day
- [ ] Dynamic weight adjustments based on real-time patterns
- [ ] Sentiment analysis of crime descriptions
- [ ] Integration with police dispatch data
- [ ] Predictive risk modeling using historical trends

### **Phase 3: Mobile App** (Q2 2025)
- [ ] Native iOS/Android apps
- [ ] GPS tracking with real-time rerouting
- [ ] Push notifications for nearby incidents
- [ ] Voice-guided safe navigation
- [ ] Community reporting features
- [ ] Offline mode with cached data

### **Phase 4: Scale to Other Cities** (Q3 2025)
- [ ] Template system for any city with open crime data
- [ ] Automated data pipeline for municipal integration
- [ ] Multi-city comparison and benchmarking
- [ ] Public API for researchers and civic tech developers

### **Phase 5: Social Impact** (Ongoing)
- [ ] Partner with local police departments
- [ ] Community safety workshops
- [ ] Academic research collaborations
- [ ] Open-source toolkit for developers

---

## 🏆 Achievements

✅ Built complete end-to-end system in 48 hours  
✅ Processed 158 neighborhoods, 11,495 intersections, 9 crime types  
✅ Integrated cutting-edge AI (Gemini 2.0 Flash) for live monitoring  
✅ Achieved 6-decimal GPS precision (~10cm accuracy)  
✅ Created intuitive dark-themed UI optimized for night safety  
✅ Generated production-ready weighted graph for pathfinding  
✅ Implemented robust fallback systems for API reliability  

---

## 📝 License

MIT License - Toronto Open Data is licensed under the Open Government Licence - Toronto

## 🙏 Acknowledgments

- **Toronto Open Data** - Crime statistics and neighborhood boundaries
- **OpenStreetMap** contributors - Street network data
- **Google Gemini AI** - Natural language processing
- **CartoDB** - Dark Matter basemap tiles
- **Leaflet.js** - Open-source mapping library
