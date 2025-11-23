"""
Create a routing graph with weighted edges for safe route calculation
Nodes = intersections, Edges = street segments with weights
"""
import json
import pandas as pd
import numpy as np
from shapely.geometry import shape, Point, LineString
from collections import defaultdict
import math

print("="*80)
print("CREATING ROUTING GRAPH WITH WEIGHTED EDGES")
print("="*80)

# ===========================
# STEP 1: Load Intersections (Nodes)
# ===========================
print("\n📍 Loading intersection nodes...")
intersections_df = pd.read_csv('intersection_weights.csv')
print(f"Loaded {len(intersections_df)} intersection nodes")

# Create node lookup by coordinates
nodes = {}
for idx, row in intersections_df.iterrows():
    coord_key = f"{row['lat']:.6f},{row['lon']:.6f}"
    nodes[coord_key] = {
        'id': idx,
        'lat': row['lat'],
        'lon': row['lon'],
        'weight': row['weight'],
        'neighborhood': row['neighborhood']
    }

print(f"Created {len(nodes)} node lookup")

# ===========================
# STEP 2: Load Streets and Create Edges
# ===========================
print("\n🛣️  Loading streets...")
with open('downtown_streets.geojson', 'r') as f:
    streets_data = json.load(f)

print(f"Loaded {len(streets_data['features'])} streets")

# ===========================
# STEP 3: Build Edges
# ===========================
print("\n🔗 Building edges from streets...")

edges = []
edge_features = []

def coord_to_key(lat, lon):
    """Convert coordinate to lookup key"""
    return f"{lat:.6f},{lon:.6f}"

def find_nearest_node(lat, lon, max_distance=0.0001):
    """Find nearest intersection node within max_distance"""
    key = coord_to_key(lat, lon)
    if key in nodes:
        return key
    
    # Search nearby
    min_dist = float('inf')
    nearest = None
    for node_key, node in nodes.items():
        dist = math.sqrt((node['lat'] - lat)**2 + (node['lon'] - lon)**2)
        if dist < min_dist and dist < max_distance:
            min_dist = dist
            nearest = node_key
    
    return nearest

# Process each street
count = 0
for street in streets_data['features']:
    geom = shape(street['geometry'])
    props = street['properties']
    
    # Get coordinates of the street
    if geom.geom_type == 'LineString':
        coords = list(geom.coords)
    elif geom.geom_type == 'MultiLineString':
        # Take first segment
        coords = list(geom.geoms[0].coords)
    else:
        continue
    
    if len(coords) < 2:
        continue
    
    # Find nodes at start and end
    start_lat, start_lon = coords[0][1], coords[0][0]
    end_lat, end_lon = coords[-1][1], coords[-1][0]
    
    start_node = find_nearest_node(start_lat, start_lon)
    end_node = find_nearest_node(end_lat, end_lon)
    
    if not start_node or not end_node or start_node == end_node:
        continue
    
    # Calculate edge weight (average of node weights + length factor)
    start_weight = nodes[start_node]['weight']
    end_weight = nodes[end_node]['weight']
    avg_weight = (start_weight + end_weight) / 2
    
    # Calculate length
    length_m = geom.length * 111000  # degrees to meters
    
    # Final edge weight = average node weight * length factor
    edge_weight = avg_weight * (1 + length_m / 1000)  # normalized by km
    
    # Create edge
    edge = {
        'source': nodes[start_node]['id'],
        'target': nodes[end_node]['id'],
        'weight': edge_weight,
        'length_m': length_m,
        'street_name': props.get('name', 'Unnamed'),
        'highway_type': props.get('highway', 'unclassified'),
        'start_node_weight': start_weight,
        'end_node_weight': end_weight
    }
    
    edges.append(edge)
    
    # Create GeoJSON feature for visualization
    edge_feature = {
        'type': 'Feature',
        'geometry': street['geometry'],
        'properties': {
            'source': nodes[start_node]['id'],
            'target': nodes[end_node]['id'],
            'weight': round(edge_weight, 2),
            'length_m': round(length_m, 2),
            'street_name': props.get('name', 'Unnamed'),
            'highway_type': props.get('highway', 'unclassified'),
            'category': 'Low' if edge_weight < 50 else 'Medium' if edge_weight < 100 else 'High'
        }
    }
    
    edge_features.append(edge_feature)
    
    count += 1
    if count % 1000 == 0:
        print(f"  Processed {count} streets...")

print(f"\n✅ Created {len(edges)} edges connecting {len(nodes)} nodes")

# ===========================
# STEP 4: Statistics
# ===========================
edges_df = pd.DataFrame(edges)

print("\n📊 Edge Weight Statistics:")
print(edges_df['weight'].describe())

print("\n📈 Edge Category Distribution:")
edges_df['category'] = pd.cut(edges_df['weight'], 
                               bins=[0, 50, 100, float('inf')],
                               labels=['Low', 'Medium', 'High'])
print(edges_df['category'].value_counts())

# ===========================
# STEP 5: Save Results
# ===========================
print("\n💾 Saving results...")

# Save edges CSV
edges_df.to_csv('routing_edges.csv', index=False)
print("  ✅ routing_edges.csv")

# Save edges GeoJSON for visualization
edges_geojson = {
    'type': 'FeatureCollection',
    'features': edge_features
}

with open('routing_edges.geojson', 'w') as f:
    json.dump(edges_geojson, f)
print("  ✅ routing_edges.geojson")

# Create graph structure (adjacency list)
graph = defaultdict(list)
for edge in edges:
    graph[edge['source']].append({
        'target': edge['target'],
        'weight': edge['weight'],
        'length_m': edge['length_m']
    })
    # Add reverse edge (bidirectional)
    graph[edge['target']].append({
        'target': edge['source'],
        'weight': edge['weight'],
        'length_m': edge['length_m']
    })

# Save graph structure
graph_data = {
    'nodes': [{'id': node['id'], 'lat': node['lat'], 'lon': node['lon'], 'weight': node['weight']} 
              for node in nodes.values()],
    'edges': edges,
    'adjacency_list': {k: v for k, v in graph.items()}
}

with open('routing_graph.json', 'w') as f:
    json.dump(graph_data, f)
print("  ✅ routing_graph.json")

print("\n" + "="*80)
print("✅ ROUTING GRAPH CREATED")
print("="*80)

print(f"\n📊 Graph Summary:")
print(f"  Nodes (intersections): {len(nodes)}")
print(f"  Edges (street segments): {len(edges)}")
print(f"  Average edges per node: {len(edges)*2/len(nodes):.1f}")
print(f"  Weight range: {edges_df['weight'].min():.1f} - {edges_df['weight'].max():.1f}")

print("\n💡 Next steps:")
print("  1. Visualize routing_edges.geojson on the map")
print("  2. Implement A* or Dijkstra pathfinding")
print("  3. Select start/end points and calculate safest route")
