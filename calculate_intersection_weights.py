"""
Calculate intelligent weights for each intersection in downtown Toronto
Uses crime RATES (already normalized by population) + POI density + street type
"""
import json
import pandas as pd
import numpy as np
from shapely.geometry import shape, Point, LineString
from shapely.ops import nearest_points
from collections import defaultdict
import math

print("="*80)
print("CALCULATING INTERSECTION WEIGHTS FOR DOWNTOWN TORONTO")
print("="*80)

# ===========================
# STEP 1: Load Crime Data
# ===========================
print("\n📊 Loading crime data...")
crime_df = pd.read_csv('Neighbourhood_Crime_Rates_Open_Data_6759951416839911996.csv')

# Use RATE columns (already normalized by population)
rate_cols_2024 = [col for col in crime_df.columns if '2024' in col and 'RATE' in col]
print(f"Found {len(rate_cols_2024)} crime rate columns for 2024")

# Calculate weighted risk score using RATES
weights = {
    'HOMICIDE': 10.0,
    'SHOOTING': 10.0,
    'ROBBERY': 5.0,
    'ASSAULT': 3.0,
    'BREAKENTER': 2.0,
    'AUTOTHEFT': 2.0,
    'THEFTFROMMV': 1.0,
    'THEFTOVER': 1.0,
    'BIKETHEFT': 1.0
}

crime_df['RISK_SCORE'] = 0
for col in rate_cols_2024:
    crime_type = col.split('_')[0]
    if crime_type in weights:
        crime_df['RISK_SCORE'] += crime_df[col] * weights[crime_type]

# Normalize 0-1
crime_df['RISK_NORMALIZED'] = (crime_df['RISK_SCORE'] - crime_df['RISK_SCORE'].min()) / \
                               (crime_df['RISK_SCORE'].max() - crime_df['RISK_SCORE'].min())

print(f"Risk scores calculated for {len(crime_df)} neighborhoods")
print(f"  Min: {crime_df['RISK_NORMALIZED'].min():.3f}")
print(f"  Max: {crime_df['RISK_NORMALIZED'].max():.3f}")
print(f"  Mean: {crime_df['RISK_NORMALIZED'].mean():.3f}")

# ===========================
# STEP 2: Load Neighborhood Boundaries
# ===========================
print("\n🗺️  Loading neighborhood boundaries...")
with open('Neighbourhood_Crime_Rates_Open_Data_-5291801778870948764.geojson', 'r') as f:
    neighborhoods = json.load(f)

neighborhood_shapes = {}
neighborhood_risk = {}

for feature in neighborhoods['features']:
    name = feature['properties'].get('AREA_NAME') or feature['properties'].get('NEIGHBOURHOOD_NAME')
    if name:
        neighborhood_shapes[name] = shape(feature['geometry'])
        # Get risk from crime_df
        risk_row = crime_df[crime_df['NEIGHBOURHOOD_NAME'] == name]
        if not risk_row.empty:
            neighborhood_risk[name] = risk_row['RISK_NORMALIZED'].values[0]
        else:
            neighborhood_risk[name] = 0.5  # default

print(f"Loaded {len(neighborhood_shapes)} neighborhood polygons")

# ===========================
# STEP 3: Load Downtown Streets
# ===========================
print("\n🛣️  Loading downtown streets...")
with open('downtown_streets.geojson', 'r') as f:
    streets_data = json.load(f)

print(f"Loaded {len(streets_data['features'])} streets")

# ===========================
# STEP 4: Load POIs and Build Spatial Index
# ===========================
print("\n🏪 Loading POIs...")
with open('downtown_pois.geojson', 'r') as f:
    pois_data = json.load(f)

# Create grid-based spatial index for fast lookup
poi_grid = defaultdict(list)
grid_size = 0.002  # ~200m

for poi in pois_data['features']:
    geom = shape(poi['geometry'])
    if geom.geom_type == 'Point':
        pt = geom
    else:
        pt = geom.centroid
    
    # Assign to grid cell
    grid_x = int(pt.x / grid_size)
    grid_y = int(pt.y / grid_size)
    poi_grid[(grid_x, grid_y)].append(pt)

print(f"Loaded {sum(len(pois) for pois in poi_grid.values())} POIs into spatial grid")

# ===========================
# STEP 5: Extract Intersections
# ===========================
print("\n🔗 Extracting intersections from street network...")

# Build adjacency: coord -> list of street indices
coord_to_streets = defaultdict(list)

for i, street in enumerate(streets_data['features']):
    geom = shape(street['geometry'])
    if geom.geom_type == 'LineString':
        coords = list(geom.coords)
        # Start and end points are intersections
        start = (round(coords[0][0], 6), round(coords[0][1], 6))
        end = (round(coords[-1][0], 6), round(coords[-1][1], 6))
        
        coord_to_streets[start].append(i)
        coord_to_streets[end].append(i)

# Intersections are points where 2+ streets meet
intersections = {coord: streets for coord, streets in coord_to_streets.items() 
                 if len(streets) >= 2}

print(f"Found {len(intersections)} intersections (2+ streets)")

# ===========================
# STEP 6: Calculate Weight for Each Intersection
# ===========================
print("\n⚖️  Calculating weights for intersections...")

intersection_data = []

for coord, street_indices in intersections.items():
    point = Point(coord[0], coord[1])
    
    # Feature 1: Neighborhood risk score
    neighborhood_name = "Unknown"
    risk_score = 0.5  # default
    
    for name, poly in neighborhood_shapes.items():
        if poly.contains(point):
            neighborhood_name = name
            risk_score = neighborhood_risk.get(name, 0.5)
            break
    
    # Feature 2: POI density (count within 100m using spatial grid)
    buffer_dist = 0.001  # ~100m
    
    # Check nearby grid cells
    grid_x = int(coord[0] / grid_size)
    grid_y = int(coord[1] / grid_size)
    
    num_pois = 0
    # Check this cell and 8 neighbors
    for dx in [-1, 0, 1]:
        for dy in [-1, 0, 1]:
            cell = (grid_x + dx, grid_y + dy)
            if cell in poi_grid:
                for poi_pt in poi_grid[cell]:
                    if point.distance(poi_pt) <= buffer_dist:
                        num_pois += 1
    
    # Normalize POI count (0-1 scale, cap at 50)
    poi_density = min(num_pois / 50.0, 1.0)
    
    # Feature 3: Street type importance (average of connected streets)
    highway_priorities = {
        'motorway': 1.0,
        'trunk': 0.9,
        'primary': 0.8,
        'secondary': 0.7,
        'tertiary': 0.6,
        'residential': 0.4,
        'service': 0.2,
        'footway': 0.1,
        'path': 0.1,
        'cycleway': 0.1,
        'steps': 0.1,
        'unclassified': 0.3
    }
    
    street_priorities = []
    for idx in street_indices:
        street = streets_data['features'][idx]
        highway_type = street['properties'].get('highway', 'unclassified')
        priority = highway_priorities.get(highway_type, 0.3)
        street_priorities.append(priority)
    
    avg_street_priority = np.mean(street_priorities) if street_priorities else 0.3
    
    # Feature 4: Number of connected streets (degree)
    degree = len(street_indices)
    degree_normalized = min(degree / 8.0, 1.0)  # cap at 8 streets
    
    # ===========================
    # WEIGHT FORMULA
    # ===========================
    # Components:
    # 1. Base weight from neighborhood crime rate (40%)
    # 2. POI density contribution (20%) - more POIs = more activity = potential risk
    # 3. Street importance (20%) - major roads = more exposure
    # 4. Intersection complexity (20%) - more streets = more conflict points
    
    weight_components = {
        'crime_rate': risk_score * 0.40,
        'poi_density': poi_density * 0.20,
        'street_importance': avg_street_priority * 0.20,
        'degree': degree_normalized * 0.20
    }
    
    total_weight = sum(weight_components.values())
    
    # Scale to meaningful range (0-100)
    final_weight = total_weight * 100
    
    # Categorize
    if final_weight < 30:
        category = 'Low'
        color = '#00ff00'  # green
    elif final_weight < 60:
        category = 'Medium'
        color = '#ffff00'  # yellow
    else:
        category = 'High'
        color = '#ff0000'  # red
    
    intersection_data.append({
        'lat': coord[1],
        'lon': coord[0],
        'neighborhood': neighborhood_name,
        'num_streets': degree,
        'num_pois_nearby': num_pois,
        'risk_score': round(risk_score, 3),
        'poi_density': round(poi_density, 3),
        'street_importance': round(avg_street_priority, 3),
        'degree_normalized': round(degree_normalized, 3),
        'weight': round(final_weight, 2),
        'category': category,
        'color': color,
        'weight_breakdown': {
            'crime_contribution': round(weight_components['crime_rate'] * 100, 2),
            'poi_contribution': round(weight_components['poi_density'] * 100, 2),
            'street_contribution': round(weight_components['street_importance'] * 100, 2),
            'degree_contribution': round(weight_components['degree'] * 100, 2)
        }
    })

# Convert to DataFrame
df = pd.DataFrame(intersection_data)

print(f"\n✅ Calculated weights for {len(df)} intersections")
print("\n📊 Weight Statistics:")
print(df['weight'].describe())

print("\n📈 Category Distribution:")
print(df['category'].value_counts())

print("\n🔴 Top 10 Most Dangerous Intersections:")
top_dangerous = df.nlargest(10, 'weight')[['lat', 'lon', 'neighborhood', 'weight', 'num_pois_nearby', 'num_streets']]
print(top_dangerous.to_string(index=False))

print("\n🟢 Top 10 Safest Intersections:")
top_safe = df.nsmallest(10, 'weight')[['lat', 'lon', 'neighborhood', 'weight', 'num_pois_nearby', 'num_streets']]
print(top_safe.to_string(index=False))

# ===========================
# STEP 7: Save Results
# ===========================
print("\n💾 Saving results...")

# Save as CSV
df.to_csv('intersection_weights.csv', index=False)
print("  ✅ intersection_weights.csv")

# Save as GeoJSON for mapping
geojson_features = []
for _, row in df.iterrows():
    feature = {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [row['lon'], row['lat']]
        },
        'properties': {
            'neighborhood': row['neighborhood'],
            'weight': row['weight'],
            'category': row['category'],
            'color': row['color'],
            'num_streets': row['num_streets'],
            'num_pois_nearby': row['num_pois_nearby'],
            'risk_score': row['risk_score'],
            'breakdown': row['weight_breakdown']
        }
    }
    geojson_features.append(feature)

intersection_geojson = {
    'type': 'FeatureCollection',
    'features': geojson_features
}

with open('intersection_weights.geojson', 'w') as f:
    json.dump(intersection_geojson, f, indent=2)
print("  ✅ intersection_weights.geojson")

print("\n" + "="*80)
print("✅ WEIGHT CALCULATION COMPLETE")
print("="*80)
print("\n💡 Next steps:")
print("  1. Visualize intersection_weights.geojson on your HTML map")
print("  2. Use weights for routing algorithm")
print("  3. Analyze patterns in weight distribution")
