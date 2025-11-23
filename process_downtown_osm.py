"""
Process small downtown Toronto OSM data and prepare for ML training
"""
import json
import lzma
import pandas as pd
import numpy as np
from shapely.geometry import shape, Point
from collections import Counter

print("="*70)
print("PROCESSING DOWNTOWN TORONTO OSM DATA")
print("="*70)

# Load the new smaller OSM file (compressed with XZ)
print("\n📍 Loading compressed OSM data...")
with lzma.open('planet_-79.429,43.629_-79.347,43.675.osm.geojson.xz', 'rt', encoding='utf-8') as f:
    osm_data = json.load(f)

print(f"Total features: {len(osm_data['features'])}")

# Separate by geometry type
streets = []
buildings = []
pois = []

for feature in osm_data['features']:
    geom_type = feature['geometry']['type']
    props = feature['properties']
    
    if geom_type == 'LineString' and 'highway' in props:
        streets.append(feature)
    elif geom_type == 'Polygon' and 'building' in props:
        buildings.append(feature)
    elif 'amenity' in props or 'shop' in props:
        pois.append(feature)

print(f"\n📊 Breakdown:")
print(f"   Streets: {len(streets)}")
print(f"   Buildings: {len(buildings)}")
print(f"   POIs: {len(pois)}")

# Save separated files
print("\n💾 Saving separated GeoJSON files...")

with open('downtown_streets.geojson', 'w', encoding='utf-8') as f:
    json.dump({
        'type': 'FeatureCollection',
        'features': streets
    }, f, indent=2)

with open('downtown_buildings.geojson', 'w', encoding='utf-8') as f:
    json.dump({
        'type': 'FeatureCollection',
        'features': buildings
    }, f, indent=2)

with open('downtown_pois.geojson', 'w', encoding='utf-8') as f:
    json.dump({
        'type': 'FeatureCollection',
        'features': pois
    }, f, indent=2)

print("   ✅ downtown_streets.geojson")
print("   ✅ downtown_buildings.geojson")
print("   ✅ downtown_pois.geojson")

# Analyze street types
print("\n🛣️  Street Types Distribution:")
highway_types = Counter([s['properties'].get('highway', 'unknown') for s in streets])
for htype, count in highway_types.most_common(10):
    print(f"   {htype}: {count}")

# Analyze POI types
print("\n🏪 POI Types Distribution:")
poi_types = []
for poi in pois:
    if 'amenity' in poi['properties']:
        poi_types.append(poi['properties']['amenity'])
    elif 'shop' in poi['properties']:
        poi_types.append(f"shop:{poi['properties']['shop']}")

poi_counter = Counter(poi_types)
for ptype, count in poi_counter.most_common(10):
    print(f"   {ptype}: {count}")

print("\n" + "="*70)
print("✅ DATA PROCESSING COMPLETE")
print("="*70)
