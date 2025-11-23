/**
 * A* Pathfinding Algorithm for Safe Route Calculation
 * Finds multiple route alternatives with different priorities
 */

class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority) {
        const item = { element, priority };
        
        // Binary search insertion (much faster than full sort)
        if (this.items.length === 0) {
            this.items.push(item);
            return;
        }
        
        let low = 0;
        let high = this.items.length;
        
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this.items[mid].priority < priority) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        
        this.items.splice(low, 0, item);
    }

    dequeue() {
        return this.items.shift();
    }

    isEmpty() {
        return this.items.length === 0;
    }
    
    size() {
        return this.items.length;
    }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Return in meters
}

/**
 * Find nearest node to a clicked point
 */
function findNearestNode(lat, lon, nodes) {
    let nearest = null;
    let minDist = Infinity;

    for (const node of nodes) {
        const dist = getDistance(lat, lon, node.lat, node.lon);
        if (dist < minDist) {
            minDist = dist;
            nearest = node;
        }
    }

    return nearest;
}

/**
 * A* Algorithm - finds path between start and end nodes
 * @param {object} graph - adjacency list {nodeId: [{target, weight, length_m}, ...]}
 * @param {object} nodes - node lookup {id: {lat, lon, weight}}
 * @param {number} startId - start node ID
 * @param {number} endId - end node ID
 * @param {number} weightFactor - 0 = shortest, 1 = safest, 0.5 = balanced
 */
function astar(graph, nodes, startId, endId, weightFactor = 0.5) {
    console.log(`  🔍 A* search (weightFactor=${weightFactor})...`);
    const startTime = performance.now();
    
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = {};
    const gScore = {};
    
    // Only initialize what we need
    gScore[startId] = 0;
    
    const startNode = nodes[startId];
    const endNode = nodes[endId];
    
    if (!startNode || !endNode) {
        console.error('  ❌ Invalid start or end node');
        return null;
    }
    
    const heuristic = getDistance(startNode.lat, startNode.lon, endNode.lat, endNode.lon) / 1000;
    openSet.enqueue(startId, heuristic);

    let iterations = 0;
    const maxIterations = 50000;

    while (!openSet.isEmpty() && iterations < maxIterations) {
        iterations++;
        
        const current = openSet.dequeue().element;
        console.log(`  🔄 Processing node: ${current} (type: ${typeof current})`);
        console.log(`     gScore[${current}] = ${gScore[current]}`);

        // Skip if already processed
        if (closedSet.has(current)) continue;
        closedSet.add(current);

        // Found the goal
        if (current === endId) {
            const elapsed = performance.now() - startTime;
            console.log(`  ✅ Path found in ${elapsed.toFixed(1)}ms (${iterations} iterations)`);
            return reconstructPath(cameFrom, current, nodes, graph);
        }

        // Check all neighbors
        const neighbors = graph[current] || [];
        console.log(`  🔍 Checking ${neighbors.length} neighbors for node ${current}`);
        
        for (const edge of neighbors) {
            const neighbor = String(edge.target); // Convert to string to match node IDs
            console.log(`    → Neighbor: ${neighbor} (original: ${edge.target}, type: ${typeof edge.target})`);
            
            // Skip if already processed
            if (closedSet.has(neighbor)) {
                console.log(`      ⏭️ Already processed`);
                continue;
            }
            
            // Cost = combination of distance and safety
            const distanceCost = edge.length_m / 1000; // Convert to km
            const safetyCost = edge.weight;
            console.log(`      🔍 About to read gScore[${current}] - value is: ${gScore[current]}`);
            console.log(`      🔑 gScore keys:`, Object.keys(gScore));
            const currentG = gScore[current] ?? Infinity;  // Use ?? instead of || to handle 0 correctly
            const neighborG = gScore[neighbor] ?? Infinity;
            const tentativeGScore = currentG + 
                (distanceCost * (1 - weightFactor) + safetyCost * weightFactor);
            
            console.log(`      📊 currentG: ${currentG}, neighborG: ${neighborG}, tentative: ${tentativeGScore}`);

            if (tentativeGScore < neighborG) {
                cameFrom[neighbor] = { from: current, edge: edge };
                gScore[neighbor] = tentativeGScore;
                
                const neighborNode = nodes[neighbor];
                if (!neighborNode) {
                    console.log(`      ❌ Neighbor node ${neighbor} not found in nodes lookup!`);
                    console.log(`      🔑 Available node IDs sample:`, Object.keys(nodes).slice(0, 5));
                    continue;
                }
                
                console.log(`      ✅ Valid neighbor, adding to queue`);
                const h = getDistance(neighborNode.lat, neighborNode.lon, endNode.lat, endNode.lon) / 1000;
                const fScore = gScore[neighbor] + h * (1 - weightFactor);

                openSet.enqueue(neighbor, fScore);
            }
        }
    }

    const elapsed = performance.now() - startTime;
    console.log(`  ❌ No path found after ${elapsed.toFixed(1)}ms (${iterations} iterations)`);
    return null; // No path found
}

/**
 * Reconstruct path from A* result
 */
function reconstructPath(cameFrom, current, nodes, graph) {
    const path = [current];
    let totalDistance = 0;
    let totalWeight = 0;
    const edges = [];

    while (cameFrom[current]) {
        const prev = cameFrom[current].from;
        const edge = cameFrom[current].edge;
        
        path.unshift(prev);
        edges.unshift(edge);
        totalDistance += edge.length_m;
        totalWeight += edge.weight;
        
        current = prev;
    }

    // Calculate coordinates for the path
    const coordinates = path.map(nodeId => {
        const node = nodes[nodeId];
        return [node.lon, node.lat];
    });

    // Calculate average danger score (0-100)
    const avgWeight = edges.length > 0 ? totalWeight / edges.length : 0;
    const dangerScore = Math.min(100, (avgWeight / 84) * 100); // Normalize by max weight

    console.log(`  📊 Path reconstructed: ${path.length} nodes, ${totalDistance.toFixed(1)}m, ${edges.length} edges`);

    return {
        path: path,
        coordinates: coordinates,
        edges: edges,
        distance: totalDistance / 1000, // Convert meters to km
        totalWeight: totalWeight,
        avgWeight: avgWeight,
        dangerScore: dangerScore,
        numSegments: edges.length
    };
}

/**
 * Calculate 3 alternative routes
 */
function calculateRoutes(graph, nodes, startId, endId) {
    console.log(`Calculating routes from ${startId} to ${endId}`);

    // Route 1: Safest (prioritize low weights)
    const safestRoute = astar(graph, nodes, startId, endId, 0.9);
    
    // Route 2: Balanced (mix of distance and safety)
    const balancedRoute = astar(graph, nodes, startId, endId, 0.5);
    
    // Route 3: Shortest (prioritize distance)
    const shortestRoute = astar(graph, nodes, startId, endId, 0.1);

    if (!safestRoute || !balancedRoute || !shortestRoute) {
        return null; // No path found
    }

    return {
        safest: {
            ...safestRoute,
            name: '🟢 Safest Route',
            color: '#00ff00',
            description: 'Prioritizes low-crime areas'
        },
        balanced: {
            ...balancedRoute,
            name: '🟡 Balanced Route',
            color: '#ffaa00',
            description: 'Balance between safety and distance'
        },
        shortest: {
            ...shortestRoute,
            name: '🔴 Shortest Route',
            color: '#ff0000',
            description: 'Fastest path, may go through risky areas'
        }
    };
}

/**
 * Format distance for display
 */
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    } else {
        return `${(meters / 1000).toFixed(2)}km`;
    }
}

/**
 * Get danger level description
 */
function getDangerLevel(score) {
    if (score < 20) return { label: 'Very Safe', color: '#00ff00' };
    if (score < 40) return { label: 'Safe', color: '#7fff00' };
    if (score < 60) return { label: 'Moderate', color: '#ffaa00' };
    if (score < 80) return { label: 'Risky', color: '#ff6600' };
    return { label: 'High Risk', color: '#ff0000' };
}
