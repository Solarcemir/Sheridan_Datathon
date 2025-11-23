// Configuration
const CONFIG = {
    map: {
        center: [43.7175, -79.375], // Toronto downtown center (based on downloaded area)
        zoom: 12,
        minZoom: 10,
        maxZoom: 18,
        // Downloaded OSM boundaries
        bounds: {
            southWest: [43.612, -79.563], // Lower left corner
            northEast: [43.823, -79.187]  // Upper right corner
        }
    },
    tiles: {
        // Dark basemap from CartoDB
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    },
    geojson: {
        file: 'Neighbourhood_Crime_Rates_Open_Data_-5291801778870948764.geojson',
        edges: 'routing_edges.geojson',
        routingGraph: 'routing_graph.json'
    }
    // DEMO: Risk level thresholds (dummy values for visualization examples)
    // Uncomment below to enable risk scoring and color-coded visualization
    // riskLevels: {
    //     low: { max: 30, color: '#00ff88', label: 'Low Risk' },
    //     medium: { max: 60, color: '#ffd700', label: 'Medium Risk' },
    //     high: { max: 100, color: '#ff6b35', label: 'High Risk' },
    //     critical: { max: Infinity, color: '#ff0000', label: 'Critical Risk' }
    // }
};

// Global variables
let map;
let geojsonLayer;
let edgesLayer;  // Routing edges
let crimeData;

// Routing state
let routingGraph = null;  // Graph data loaded from routing_graph.json
let startNode = null;     // Selected start point
let endNode = null;       // Selected end point
let routeLayers = [];     // Store route polylines
let markerLayers = [];    // Store start/end markers
let routingMode = false;  // Whether routing UI is active
let networkDisplayed = false;  // Whether edges are shown
let coverageArea = null;  // Coverage circle
let directLine = null;    // Direct line between A and B

// Vehicle animation state
let vehicleMarker = null;  // Animated vehicle marker
let riskPopup = null;      // Popup showing current risk
let animationInterval = null;  // Animation timer
let currentRoute = null;   // Currently displayed route for animation

// Initialize the map
function initMap() {
    map = L.map('map', {
        center: CONFIG.map.center,
        zoom: CONFIG.map.zoom,
        minZoom: CONFIG.map.minZoom,
        maxZoom: CONFIG.map.maxZoom,
        zoomControl: true
    });

    // Add dark tile layer
    L.tileLayer(CONFIG.tiles.url, {
        attribution: CONFIG.tiles.attribution,
        maxZoom: CONFIG.tiles.maxZoom
    }).addTo(map);

    // Add click handler for routing
    map.on('click', onMapClick);
    
    // Add coverage area indicator
    addCoverageArea();

    console.log('Map initialized');
}

// DEMO FUNCTIONS - Risk Scoring and Color Visualization
// Uncomment these functions to enable risk-based color coding

// // Calculate dummy risk score based on feature properties
// function calculateRiskScore(feature) {
//     // Generate dummy risk score (0-100) based on some logic
//     const props = feature.properties;
//     
//     // Use a hash of the area name to generate consistent but varied scores
//     let hash = 0;
//     const name = props.AREA_NAME || props.NEIGHBOURHOOD_NAME || 'Unknown';
//     for (let i = 0; i < name.length; i++) {
//         hash = ((hash << 5) - hash) + name.charCodeAt(i);
//         hash = hash & hash;
//     }
//     
//     // Convert to 0-100 range
//     const score = Math.abs(hash % 100);
//     return score;
// }

// // Get risk level from score (low, medium, high, critical)
// function getRiskLevel(score) {
//     if (score <= CONFIG.riskLevels.low.max) return 'low';
//     if (score <= CONFIG.riskLevels.medium.max) return 'medium';
//     if (score <= CONFIG.riskLevels.high.max) return 'high';
//     return 'critical';
// }

// // Get color based on risk score (discrete levels)
// function getRiskColor(score) {
//     const level = getRiskLevel(score);
//     return CONFIG.riskLevels[level].color;
// }

// // Get color with gradient (smooth transition from green to red)
// function getGradientColor(score) {
//     // Green to Red gradient
//     if (score < 25) {
//         // Green to Yellow-Green
//         const ratio = score / 25;
//         return interpolateColor('#00ff88', '#7fff00', ratio);
//     } else if (score < 50) {
//         // Yellow-Green to Yellow
//         const ratio = (score - 25) / 25;
//         return interpolateColor('#7fff00', '#ffd700', ratio);
//     } else if (score < 75) {
//         // Yellow to Orange
//         const ratio = (score - 50) / 25;
//         return interpolateColor('#ffd700', '#ff6b35', ratio);
//     } else {
//         // Orange to Red
//         const ratio = (score - 75) / 25;
//         return interpolateColor('#ff6b35', '#ff0000', ratio);
//     }
// }

// // Interpolate between two hex colors
// function interpolateColor(color1, color2, ratio) {
//     const hex = (x) => {
//         x = x.toString(16);
//         return x.length === 1 ? '0' + x : x;
//     };

//     const r1 = parseInt(color1.substring(1, 3), 16);
//     const g1 = parseInt(color1.substring(3, 5), 16);
//     const b1 = parseInt(color1.substring(5, 7), 16);

//     const r2 = parseInt(color2.substring(1, 3), 16);
//     const g2 = parseInt(color2.substring(3, 5), 16);
//     const b2 = parseInt(color2.substring(5, 7), 16);

//     const r = Math.round(r1 + (r2 - r1) * ratio);
//     const g = Math.round(g1 + (g2 - g1) * ratio);
//     const b = Math.round(b1 + (b2 - b1) * ratio);

//     return '#' + hex(r) + hex(g) + hex(b);
// }

// Style function for crime neighborhoods
function getFeatureStyle(feature) {
    return {
        fillColor: '#00ff88',
        weight: 1,
        opacity: 1,
        color: '#00ff88',
        fillOpacity: 0.2
    };
}

// Get color for edge based on weight
function getEdgeColor(weight) {
    if (weight < 30) return '#00ff00';      // Green (safe)
    if (weight < 50) return '#7fff00';      // Yellow-green
    if (weight < 70) return '#ffff00';      // Yellow
    if (weight < 90) return '#ffa500';      // Orange
    if (weight < 110) return '#ff6b35';     // Red-orange
    return '#ff0000';                       // Red (dangerous)
}

// Style for intersection points
function getIntersectionStyle(feature) {
    const weight = feature.properties.weight;
    return {
        radius: 5,
        fillColor: getIntersectionColor(weight),
        color: '#ffffff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };
}

// Create popup content
function createPopupContent(feature) {
    const props = feature.properties;
    
    // Simple popup without risk scoring
    let content = `<div class="popup-title">${props.AREA_NAME || props.NEIGHBOURHOOD_NAME || 'Unknown Area'}</div>`;
    
    // Add all available properties
    Object.keys(props).forEach(key => {
        if (key !== 'AREA_NAME' && key !== 'NEIGHBOURHOOD_NAME' && key !== 'OBJECTID') {
            content += `<div class="popup-stat">${key}: <span>${props[key]}</span></div>`;
        }
    });
    
    return content;
}

// DEMO: Risk-based popup with score visualization (commented out)
// function createPopupContent(feature) {
//     const props = feature.properties;
//     const riskScore = calculateRiskScore(feature);
//     const riskLevel = getRiskLevel(riskScore);
//     const color = getRiskColor(riskScore);
//     
//     let content = `
//         <div class="popup-title">${props.AREA_NAME || props.NEIGHBOURHOOD_NAME || 'Unknown Area'}</div>
//         <div class="risk-score-container">
//             <div class="risk-label">Risk Score</div>
//             <div class="risk-score" style="color: ${color};">${riskScore.toFixed(1)}/100</div>
//             <div class="risk-bar">
//                 <div class="risk-bar-fill" style="width: ${riskScore}%; background: ${color};"></div>
//             </div>
//             <div class="risk-level" style="color: ${color};">
//                 ${CONFIG.riskLevels[riskLevel].label}
//             </div>
//         </div>
//         <div class="popup-stats">
//             <div class="stat-item">
//                 <span class="stat-icon">🚨</span>
//                 <span class="stat-label">Incidents:</span>
//                 <span class="stat-value">${Math.floor(riskScore * 2)}</span>
//             </div>
//             <div class="stat-item">
//                 <span class="stat-icon">👥</span>
//                 <span class="stat-label">Density:</span>
//                 <span class="stat-value">${(riskScore / 10).toFixed(1)}/km²</span>
//             </div>
//             <div class="stat-item">
//                 <span class="stat-icon">🌙</span>
//                 <span class="stat-label">Night Risk:</span>
//                 <span class="stat-value">${Math.min(100, riskScore + 15).toFixed(0)}%</span>
//             </div>
//         </div>
//         <button class="show-buffer-btn" onclick="toggleBuffer('${props.AREA_NAME || props.NEIGHBOURHOOD_NAME}')">
//             Show Safety Buffer
//         </button>
//     `;
//     
//     return content;
// }

// DEMO: Create buffer zone around a feature (safety radius visualization)
// function createBuffer(feature, radiusKm = 0.5) {
//     const center = L.geoJSON(feature).getBounds().getCenter();
//     const riskScore = calculateRiskScore(feature);
//     const color = getRiskColor(riskScore);
//     
//     // Create buffer circle with dashed border
//     const buffer = L.circle(center, {
//         radius: radiusKm * 1000, // Convert km to meters
//         color: color,
//         fillColor: color,
//         fillOpacity: 0.1,
//         weight: 2,
//         dashArray: '5, 10',
//         opacity: 0.6
//     });
//     
//     buffer.bindPopup(`
//         <div class="popup-title">Safety Buffer Zone</div>
//         <p>Radius: ${radiusKm} km</p>
//         <p>Recommended precautions in this area</p>
//     `);
//     
//     return buffer;
// }

// DEMO: Toggle buffer visibility on/off
// window.toggleBuffer = function(areaName) {
//     if (!selectedFeature) return;
//     
//     if (bufferLayer) {
//         map.removeLayer(bufferLayer);
//         bufferLayer = null;
//     } else {
//         bufferLayer = createBuffer(selectedFeature);
//         bufferLayer.addTo(map);
//     }
// };

// Handle feature interactions
function onEachFeature(feature, layer) {
    // Popup
    layer.bindPopup(createPopupContent(feature));
    
    // Hover effects
    layer.on({
        mouseover: (e) => {
            const layer = e.target;
            layer.setStyle({
                weight: 3,
                fillOpacity: 0.6
            });
        },
        mouseout: (e) => {
            geojsonLayer.resetStyle(e.target);
        },
        click: (e) => {
            // Don't zoom to polygon during routing mode - stop event completely
            if (routingMode) {
                L.DomEvent.stopPropagation(e);
                return;
            }
            map.fitBounds(e.target.getBounds());
        }
    });
}

// DEMO: Enhanced feature interactions with buffer zones (commented out)
// function onEachFeature(feature, layer) {
//     // Popup
//     layer.bindPopup(createPopupContent(feature));
//     
//     // Hover effects
//     layer.on({
//         mouseover: (e) => {
//             const layer = e.target;
//             layer.setStyle({
//                 weight: 4,
//                 fillOpacity: 0.7
//             });
//             
//             // Update info panel with live data
//             updateInfoPanel(feature);
//         },
//         mouseout: (e) => {
//             geojsonLayer.resetStyle(e.target);
//         },
//         click: (e) => {
//             selectedFeature = feature;
//             map.fitBounds(e.target.getBounds());
//             
//             // Show buffer if enabled
//             if (showBuffers) {
//                 if (bufferLayer) {
//                     map.removeLayer(bufferLayer);
//                 }
//                 bufferLayer = createBuffer(feature);
//                 bufferLayer.addTo(map);
//             }
//         }
//     });
// }

// DEMO: Update info panel with real-time feature data on hover
// function updateInfoPanel(feature) {
//     const riskScore = calculateRiskScore(feature);
//     const riskLevel = getRiskLevel(riskScore);
//     const color = getRiskColor(riskScore);
//     
//     const hoverInfo = document.getElementById('hover-info');
//     if (hoverInfo) {
//         hoverInfo.innerHTML = `
//             <div style="color: ${color}; font-weight: bold; font-size: 16px;">
//                 ${feature.properties.AREA_NAME || feature.properties.NEIGHBOURHOOD_NAME}
//             </div>
//             <div style="margin-top: 5px;">
//                 Risk: ${riskScore.toFixed(1)} - ${CONFIG.riskLevels[riskLevel].label}
//             </div>
//         `;
//     }
// }

// Load and display GeoJSON data
async function loadGeoJSON() {
    try {
        console.log('Loading GeoJSON data...');
        const response = await fetch(CONFIG.geojson.file);
        crimeData = await response.json();
        
        console.log('GeoJSON loaded:', crimeData);
        
        // Add GeoJSON layer to map
        geojsonLayer = L.geoJSON(crimeData, {
            style: getFeatureStyle,
            onEachFeature: onEachFeature
        }).addTo(map);
        
        // Fit map to data bounds
        map.fitBounds(geojsonLayer.getBounds());
        
        // Update stats
        updateStats();
        
        console.log('GeoJSON layer added to map');
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        document.getElementById('stats').innerHTML = '<p style="color: #ff0000;">Error loading data</p>';
    }
}

// Update statistics panel
function updateStats() {
    const features = crimeData.features;
    const statsDiv = document.getElementById('stats');
    
    statsDiv.innerHTML = `
        <p><strong>Total Neighbourhoods:</strong> ${features.length}</p>
        <p><strong>Data Source:</strong> Toronto Open Data</p>
        <p style="margin-top: 10px; font-size: 11px;">Click on a neighbourhood to zoom in</p>
    `;
}

// DEMO: Risk legend showing color-coded levels (commented out)
// function createLegend() {
//     const legend = L.control({ position: 'bottomleft' });
//     
//     legend.onAdd = function(map) {
//         const div = L.DomUtil.create('div', 'legend');
//         div.innerHTML = '<h4>Risk Levels</h4>';
//         
//         for (const [key, value] of Object.entries(CONFIG.riskLevels)) {
//             if (value.max === Infinity) continue;
//             div.innerHTML += `
//                 <div class="legend-item">
//                     <span class="legend-color" style="background: ${value.color};"></span>
//                     <span class="legend-label">${value.label} (0-${value.max})</span>
//                 </div>
//             `;
//         }
//         
//         return div;
//     };
//     
//     legend.addTo(map);
// }

// DEMO: Enhanced statistics with risk distribution (commented out)
// function updateStats() {
//     const features = crimeData.features;
//     const riskScores = features.map(f => calculateRiskScore(f));
//     const avgRisk = (riskScores.reduce((a, b) => a + b, 0) / riskScores.length).toFixed(1);
//     
//     const riskDistribution = {
//         low: 0,
//         medium: 0,
//         high: 0,
//         critical: 0
//     };
//     
//     riskScores.forEach(score => {
//         const level = getRiskLevel(score);
//         riskDistribution[level]++;
//     });
//     
//     const statsDiv = document.getElementById('stats');
//     statsDiv.innerHTML = `
//         <div class="stat-card">
//             <div class="stat-title">Average Risk</div>
//             <div class="stat-big">${avgRisk}</div>
//         </div>
//         <div class="stat-card">
//             <div class="stat-title">Total Areas</div>
//             <div class="stat-big">${features.length}</div>
//         </div>
//         <div class="risk-distribution">
//             <div class="dist-title">Risk Distribution</div>
//             <div class="dist-bar">
//                 <div class="dist-segment" style="width: ${(riskDistribution.low/features.length)*100}%; background: #00ff88;" title="Low: ${riskDistribution.low}"></div>
//                 <div class="dist-segment" style="width: ${(riskDistribution.medium/features.length)*100}%; background: #ffd700;" title="Medium: ${riskDistribution.medium}"></div>
//                 <div class="dist-segment" style="width: ${(riskDistribution.high/features.length)*100}%; background: #ff6b35;" title="High: ${riskDistribution.high}"></div>
//                 <div class="dist-segment" style="width: ${(riskDistribution.critical/features.length)*100}%; background: #ff0000;" title="Critical: ${riskDistribution.critical}"></div>
//             </div>
//             <div class="dist-labels">
//                 <span>🟢 ${riskDistribution.low}</span>
//                 <span>🟡 ${riskDistribution.medium}</span>
//                 <span>🟠 ${riskDistribution.high}</span>
//                 <span>🔴 ${riskDistribution.critical}</span>
//             </div>
//         </div>
//     `;
// }

// DEMO: Toggle between gradient and threshold visualization modes
// window.toggleRiskMode = function() {
//     riskMode = riskMode === 'gradient' ? 'threshold' : 'gradient';
//     
//     // Update button text
//     const btn = document.querySelector('.toggle-mode-btn');
//     btn.textContent = riskMode === 'gradient' ? '🎨 Gradient Mode' : '📊 Threshold Mode';
//     
//     // Refresh styles
//     if (geojsonLayer) {
//         geojsonLayer.setStyle(getFeatureStyle);
//     }
// };

// DEMO: Toggle buffer visibility globally
// window.toggleBufferMode = function() {
//     showBuffers = !showBuffers;
//     
//     const btn = document.querySelector('.toggle-buffer-btn');
//     btn.textContent = showBuffers ? '🛡️ Buffers: ON' : '🛡️ Buffers: OFF';
//     
//     if (!showBuffers && bufferLayer) {
//         map.removeLayer(bufferLayer);
//         bufferLayer = null;
//     }
// };

// Initialize app
function init() {
    initMap();
    loadGeoJSON();
    loadRoutingGraph(); // Solo carga el grafo JSON (ligero), no los edges visuales
}

// Add coverage area circle to show where routing works
function addCoverageArea() {
    // Downtown Toronto center and radius
    const center = [43.6532, -79.3832]; // CN Tower area
    const radiusKm = 5; // 5km radius
    
    coverageArea = L.circle(center, {
        radius: radiusKm * 1000, // Convert to meters
        color: '#00ff88',
        fillColor: '#00ff88',
        fillOpacity: 0.05,
        weight: 2,
        opacity: 0.3,
        dashArray: '10, 10',
        interactive: false  // DON'T intercept clicks!
    }).addTo(map);
    
    // No popup to avoid interference
    // coverageArea.bindPopup('<b>🗺️ Routing Coverage Area</b><br>Safe route calculation available within this zone');
}

// Toggle network display (edges and nodes)
window.toggleNetworkDisplay = function() {
    const btn = document.getElementById('show-network-btn');
    
    if (!networkDisplayed) {
        console.log('📊 Loading street network...');
        btn.textContent = '⏳ Loading...';
        btn.disabled = true;
        
        loadEdges().then(() => {
            networkDisplayed = true;
            btn.textContent = '🙈 Hide Street Network';
            btn.disabled = false;
            console.log('✅ Street network displayed');
        }).catch(err => {
            console.error('❌ Error loading network:', err);
            btn.textContent = '🔍 Show Street Network';
            btn.disabled = false;
        });
    } else {
        console.log('🙈 Hiding street network...');
        if (edgesLayer) {
            map.removeLayer(edgesLayer);
            edgesLayer = null;
        }
        networkDisplayed = false;
        btn.textContent = '🔍 Show Street Network';
    }
};

// Load Routing Edges (ahora retorna una promesa)
function loadEdges() {
    return fetch(CONFIG.geojson.edges)
        .then(response => response.json())
        .then(data => {
            console.log('Routing edges loaded:', data.features.length, 'edges');
            
            edgesLayer = L.geoJSON(data, {
                style: (feature) => {
                    const weight = feature.properties.weight;
                    return {
                        color: getEdgeColor(weight),
                        weight: 3,
                        opacity: 0.7
                    };
                },
                onEachFeature: (feature, layer) => {
                    const props = feature.properties;
                    const weight = props.weight;
                    const category = props.category;
                    
                    const categoryEmoji = {
                        'Low': '🟢',
                        'Medium': '🟡',
                        'High': '🔴'
                    };
                    
                    let content = `
                        <div class="popup-title">${props.street_name}</div>
                        <div class="popup-stat">Weight: <span style="color: ${getEdgeColor(weight)}; font-weight: bold;">${weight.toFixed(1)}</span></div>
                        <div class="popup-stat">Category: <span>${categoryEmoji[category]} ${category}</span></div>
                        <div class="popup-stat">Length: <span>${props.length_m.toFixed(0)}m</span></div>
                        <div class="popup-stat">Type: <span>${props.highway_type}</span></div>
                    `;
                    
                    layer.bindPopup(content);
                }
            }).addTo(map);
            
            return Promise.resolve();
        })
        .catch(error => {
            console.error('Error loading edges:', error);
            return Promise.reject(error);
        });
}

// Load OSM layers
function loadOSMLayer(filename, layerName) {
    fetch(filename)
        .then(response => response.json())
        .then(data => {
            console.log(`${layerName} loaded:`, data.features.length, 'features');
            
            let layer;
            const style = getOSMLayerStyle(layerName);
            
            layer = L.geoJSON(data, {
                style: style,
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 5,
                        fillColor: style.color,
                        color: style.color,
                        weight: 1,
                        opacity: 0.8,
                        fillOpacity: 0.6
                    });
                },
                onEachFeature: (feature, layer) => {
                    const props = feature.properties;
                    let content = `<div class="popup-title">${props.name || layerName}</div>`;
                    
                    // Add relevant properties
                    Object.keys(props).forEach(key => {
                        if (props[key] && key !== 'name') {
                            content += `<div class="popup-stat">${key}: <span>${props[key]}</span></div>`;
                        }
                    });
                    
                    layer.bindPopup(content);
                }
            });
            
            // Store layer reference
            if (layerName === 'Streets') streetsLayer = layer;
            else if (layerName === 'Buildings') buildingsLayer = layer;
            else if (layerName === 'POIs') poisLayer = layer;
        })
        .catch(error => {
            console.error(`Error loading ${layerName}:`, error);
        });
}

// Get style for OSM layers
function getOSMLayerStyle(layerName) {
    const styles = {
        'Streets': {
            color: '#FFD700',
            weight: 2,
            opacity: 0.6
        },
        'Buildings': {
            fillColor: '#4169E1',
            color: '#4169E1',
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.3
        },
        'POIs': {
            color: '#FF1493',
            weight: 1,
            opacity: 0.8
        }
    };
    
    return styles[layerName] || {};
}

// Toggle layer visibility
window.toggleLayer = function(layerType) {
    if (layerType === 'crime') {
        if (map.hasLayer(geojsonLayer)) {
            map.removeLayer(geojsonLayer);
        } else {
            map.addLayer(geojsonLayer);
        }
    } else if (layerType === 'edges') {
        if (map.hasLayer(edgesLayer)) {
            map.removeLayer(edgesLayer);
        } else {
            map.addLayer(edgesLayer);
        }
    }
};

// ===========================
// ROUTING FUNCTIONS
// ===========================

// Load routing graph
async function loadRoutingGraph() {
    console.log('🔄 Loading routing graph...');
    try {
        const response = await fetch('routing_graph.json');
        routingGraph = await response.json();
        console.log('✅ Routing graph loaded successfully!');
        console.log('   📊 Nodes:', routingGraph.nodes.length);
        console.log('   📊 Adjacency entries:', Object.keys(routingGraph.adjacency_list).length);
        console.log('   🗺️ Ready for route planning!');
    } catch (error) {
        console.error('❌ Error loading routing graph:', error);
    }
}

// Handle map clicks for routing
function onMapClick(e) {
    console.log('🖱️ Map click detected! routingMode:', routingMode, 'routingGraph loaded:', !!routingGraph);
    
    if (!routingMode || !routingGraph) {
        console.log('⚠️ Click ignored - routing mode not active or graph not loaded');
        return;
    }

    const clickedLat = e.latlng.lat;
    const clickedLon = e.latlng.lng;

    // Find nearest node
    const nodesList = routingGraph.nodes.map(n => ({
        id: n.id,
        lat: n.lat,
        lon: n.lon,
        weight: n.weight
    }));
    
    console.log('📍 Map clicked at:', clickedLat.toFixed(5), clickedLon.toFixed(5));
    console.log('🔍 Searching among', nodesList.length, 'nodes...');
    
    const nearest = findNearestNode(clickedLat, clickedLon, nodesList);
    
    if (!nearest) {
        console.error('❌ No nearest node found!');
        alert('No node found near this location. Try clicking closer to a street.');
        return;
    }
    
    const distance = getDistance(clickedLat, clickedLon, nearest.lat, nearest.lon);
    console.log('🎯 Nearest node found:', nearest.id);
    console.log('   📏 Distance from click:', distance.toFixed(2), 'm');
    console.log('   🗺️ Node location:', nearest.lat.toFixed(5), nearest.lon.toFixed(5));
    console.log('   ⚖️ Node weight:', nearest.weight.toFixed(2));

    if (!startNode) {
        // Set start point (A)
        startNode = nearest;
        
        // Add marker A with better styling
        const marker = L.marker([nearest.lat, nearest.lon], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #00ff88; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: black; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">A</div>',
                iconSize: [35, 35],
                iconAnchor: [17, 17]
            })
        }).addTo(map);
        
        marker.bindPopup('<b>🟢 Start Point (A)</b><br>Click another location for destination').openPopup();
        markerLayers.push(marker);
        
        console.log('🟢 START (A) set:', startNode.id, '| Weight:', startNode.weight.toFixed(2));
        console.log('✅ Click map again to select END point (B)');
    } else if (!endNode) {
        // Set end point (B)
        endNode = nearest;
        
        // Add marker B
        const marker = L.marker([nearest.lat, nearest.lon], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<div style="background: #ff4444; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">B</div>',
                iconSize: [35, 35],
                iconAnchor: [17, 17]
            })
        }).addTo(map);
        
        marker.bindPopup('<b>🔴 End Point (B)</b><br>Calculating safest route...').openPopup();
        markerLayers.push(marker);
        
        // Draw direct line between A and B
        directLine = L.polyline([[startNode.lat, startNode.lon], [endNode.lat, endNode.lon]], {
            color: '#ffffff',
            weight: 2,
            opacity: 0.5,
            dashArray: '10, 10'
        }).addTo(map);
        routeLayers.push(directLine);
        
        console.log('🔴 END (B) set:', endNode.id, '| Weight:', endNode.weight.toFixed(2));
        console.log('\n🧮 Starting route calculation...');
        
        // Calculate safest route
        calculateSafestRoute();
    }
}

// Calculate and display ONLY the safest route
function calculateSafestRoute() {
    if (!startNode || !endNode || !routingGraph) {
        console.error('❌ Cannot calculate route - missing data');
        return;
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('🧮 CALCULATING SAFEST ROUTE');
    console.log('From:', startNode.id, '→ To:', endNode.id);
    console.log('Start coords:', startNode.lat.toFixed(5), startNode.lon.toFixed(5));
    console.log('End coords:', endNode.lat.toFixed(5), endNode.lon.toFixed(5));
    console.log('═══════════════════════════════════════════════');

    // Convert nodes array to lookup object with STRING keys (critical for matching adjacency_list format)
    const nodesLookup = {};
    routingGraph.nodes.forEach(n => {
        nodesLookup[String(n.id)] = n;  // Convert to string to match adjacency_list keys
    });
    
    // IMPORTANT: Convert IDs to strings because adjacency_list uses string keys
    const startIdStr = String(startNode.id);
    const endIdStr = String(endNode.id);
    
    console.log('🔑 Start ID:', startIdStr, '(type:', typeof startIdStr, ')');
    console.log('🔑 End ID:', endIdStr, '(type:', typeof endIdStr, ')');
    console.log('🔗 Adjacency keys sample:', Object.keys(routingGraph.adjacency_list).slice(0, 3));

    // Calculate ONLY the safest route (weightFactor = 0.9 prioritizes safety)
    const startTime = performance.now();
    const safestRoute = astar(
        routingGraph.adjacency_list,
        nodesLookup,
        startIdStr,  // Use string ID
        endIdStr,    // Use string ID
        0.9 // 90% safety priority
    );
    const endTime = performance.now();
    
    console.log('\n⏱️  Calculation time:', (endTime - startTime).toFixed(2), 'ms');

    if (!safestRoute) {
        console.error('❌ No path found between these points!');
        console.error('   Start node:', startIdStr, 'exists in nodes?', !!nodesLookup[startNode.id]);
        console.error('   End node:', endIdStr, 'exists in nodes?', !!nodesLookup[endNode.id]);
        console.error('   Adjacency for start:', routingGraph.adjacency_list[startIdStr] ? 'YES' : 'NO');
        console.error('   Adjacency for end:', routingGraph.adjacency_list[endIdStr] ? 'YES' : 'NO');
        if (routingGraph.adjacency_list[startIdStr]) {
            console.error('   Start has', routingGraph.adjacency_list[startIdStr].length, 'neighbors');
        }
        if (routingGraph.adjacency_list[endIdStr]) {
            console.error('   End has', routingGraph.adjacency_list[endIdStr].length, 'neighbors');
        }
        alert('❌ No path found between these points!\n\nTry selecting different locations within the coverage area.');
        resetRouting();
        return;
    }
    
    console.log('✅ Route found!');
    console.log('   Path has', safestRoute.path.length, 'nodes');
    console.log('   Coordinates:', safestRoute.coordinates ? safestRoute.coordinates.length : 0, 'points');

    console.log('\n📊 SAFEST ROUTE FOUND:');
    console.log('─────────────────────────────────────────────');
    console.log('🟢 SAFEST Route (90% safety priority):');
    console.log('   Distance:', safestRoute.distance.toFixed(2), 'km');
    console.log('   Danger Score:', safestRoute.dangerScore.toFixed(1));
    console.log('   Total Weight:', safestRoute.totalWeight.toFixed(2));
    console.log('   Nodes in path:', safestRoute.path.length);
    console.log('─────────────────────────────────────────────');
    console.log('\n🗺️  Displaying route on map...');

    // Remove the dotted direct line
    if (directLine) {
        map.removeLayer(directLine);
        routeLayers = routeLayers.filter(l => l !== directLine);
    }

    // Display the safest route
    displaySafestRoute(safestRoute);

    // Show result panel
    showRouteResult(safestRoute);
    
    console.log('✅ Route displayed successfully!');
    console.log('═══════════════════════════════════════════════\n');
}

// Display the safest route on the map
function displaySafestRoute(route) {
    const polyline = L.polyline(route.coordinates.map(c => [c[1], c[0]]), {
        color: '#00ff88',
        weight: 6,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(map);

    const dangerLevel = getDangerLevel(route.dangerScore);
    polyline.bindPopup(`
        <div style="min-width: 220px;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #00ff88;">
                🟢 Safest Route
            </div>
            <hr style="margin: 8px 0; border-color: #444;">
            <div style="font-size: 13px; line-height: 1.6;">
                📏 Distance: <b>${formatDistance(route.distance)}</b><br>
                🚨 Danger Level: <b style="color: ${dangerLevel.color}">${dangerLevel.label}</b><br>
                💯 Safety Score: <b>${route.dangerScore.toFixed(1)}/100</b><br>
                🛣️ Segments: <b>${route.numSegments}</b>
            </div>
        </div>
    `);

    routeLayers.push(polyline);

    // Store route for animation
    currentRoute = route;

    // Fit map to show the route
    const allCoords = polyline.getLatLngs();
    map.fitBounds(L.latLngBounds(allCoords), { padding: [80, 80] });
}

// Show route result panel
function showRouteResult(route) {
    const panel = document.getElementById('route-result');
    if (!panel) return;

    const dangerLevel = getDangerLevel(route.dangerScore);

    panel.innerHTML = `
        <div style="text-align: center;">
            <h3 style="color: #00ff88; margin-bottom: 15px;">🟢 Safest Route Found</h3>
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 15px;">
                <div style="flex: 1; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                    <div style="font-size: 12px; color: #888;">Distance</div>
                    <div style="font-size: 24px; font-weight: bold; color: #00ff88;">${formatDistance(route.distance)}</div>
                </div>
                
                <div style="flex: 1; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                    <div style="font-size: 12px; color: #888;">Safety Score</div>
                    <div style="font-size: 24px; font-weight: bold; color: ${dangerLevel.color};">${route.dangerScore.toFixed(1)}</div>
                    <div style="font-size: 11px; color: ${dangerLevel.color};">${dangerLevel.label}</div>
                </div>
                
                <div style="flex: 1; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                    <div style="font-size: 12px; color: #888;">Segments</div>
                    <div style="font-size: 24px; font-weight: bold; color: #fff;">${route.numSegments}</div>
                </div>
            </div>
            
            <button id="animate-route-btn" onclick="startRouteAnimation()" 
                style="width: 100%; padding: 12px; margin-bottom: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                       color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; 
                       font-weight: bold; transition: all 0.3s; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.5)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'">
                🚗 Animate Route Journey
            </button>
            
            <div id="animation-controls" style="display: none; margin-bottom: 10px;">
                <button id="stop-animation-btn" onclick="stopRouteAnimation()" 
                    style="width: 100%; padding: 12px; background: #ff6b6b; color: white; border: none; 
                           border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;
                           transition: all 0.3s; box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);"
                    onmouseover="this.style.boxShadow='0 4px 12px rgba(255, 107, 107, 0.5)'"
                    onmouseout="this.style.boxShadow='0 2px 8px rgba(255, 107, 107, 0.3)'">
                    ⏹️ Stop Animation
                </button>
            </div>
            
            <button onclick="resetRouting()" class="reset-btn">🔄 Plan New Route</button>
        </div>
    `;

    panel.style.display = 'block';
}

// Display a route on the map
function displayRoute(route, index) {
    const polyline = L.polyline(route.coordinates.map(c => [c[1], c[0]]), {
        color: route.color,
        weight: 5,
        opacity: 0.7,
        smoothFactor: 1
    }).addTo(map);

    polyline.bindPopup(`
        <div style="min-width: 200px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">${route.name}</div>
            <div style="font-size: 12px; color: #ccc;">${route.description}</div>
            <hr style="margin: 8px 0; border-color: #444;">
            <div style="font-size: 12px;">
                📏 Distance: <b>${formatDistance(route.distance)}</b><br>
                🚨 Danger: <b>${route.dangerScore.toFixed(1)}/100</b> - ${getDangerLevel(route.dangerScore).label}<br>
                🛣️ Segments: <b>${route.numSegments}</b>
            </div>
        </div>
    `);

    routeLayers.push(polyline);

    // Fit map to show all routes
    if (index === 2) {
        const allCoords = routeLayers.flatMap(layer => layer.getLatLngs());
        map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
    }
}

// Show route comparison panel
function showRouteComparison(routes) {
    const panel = document.getElementById('route-comparison');
    if (!panel) return;

    const dangerSafest = getDangerLevel(routes.safest.dangerScore);
    const dangerBalanced = getDangerLevel(routes.balanced.dangerScore);
    const dangerShortest = getDangerLevel(routes.shortest.dangerScore);

    panel.innerHTML = `
        <h3>🗺️ Route Comparison</h3>
        
        <div class="route-option" style="border-left: 4px solid ${routes.safest.color};">
            <div class="route-name">${routes.safest.name}</div>
            <div class="route-stats">
                📏 ${formatDistance(routes.safest.distance)}
                <br>🚨 Danger: <span style="color: ${dangerSafest.color};">${routes.safest.dangerScore.toFixed(1)}/100 (${dangerSafest.label})</span>
                <br>⏱️ Est. ${Math.round(routes.safest.distance / 1.4 / 60)} min walk
            </div>
        </div>

        <div class="route-option" style="border-left: 4px solid ${routes.balanced.color};">
            <div class="route-name">${routes.balanced.name}</div>
            <div class="route-stats">
                📏 ${formatDistance(routes.balanced.distance)}
                <br>🚨 Danger: <span style="color: ${dangerBalanced.color};">${routes.balanced.dangerScore.toFixed(1)}/100 (${dangerBalanced.label})</span>
                <br>⏱️ Est. ${Math.round(routes.balanced.distance / 1.4 / 60)} min walk
            </div>
        </div>

        <div class="route-option" style="border-left: 4px solid ${routes.shortest.color};">
            <div class="route-name">${routes.shortest.name}</div>
            <div class="route-stats">
                📏 ${formatDistance(routes.shortest.distance)}
                <br>🚨 Danger: <span style="color: ${dangerShortest.color};">${routes.shortest.dangerScore.toFixed(1)}/100 (${dangerShortest.label})</span>
                <br>⏱️ Est. ${Math.round(routes.shortest.distance / 1.4 / 60)} min walk
            </div>
        </div>

        <div style="text-align: center; margin-top: 15px;">
            <button onclick="resetRouting()" class="reset-btn">🔄 New Route</button>
        </div>
    `;

    panel.style.display = 'block';
}

// Toggle routing mode
window.toggleRoutingMode = function() {
    routingMode = !routingMode;
    
    const btn = document.getElementById('routing-toggle-btn');
    const instructions = document.getElementById('routing-instructions');
    
    if (routingMode) {
        console.log('\n🗺️  ROUTING MODE ACTIVATED');
        console.log('   ✅ routingMode =', routingMode);
        console.log('   ✅ routingGraph loaded =', !!routingGraph);
        console.log('📍 Step 1: Click on the map to select START point (A)');
        console.log('📍 Step 2: Click again to select END point (B)');
        btn.textContent = '🛑 Cancel Routing';
        btn.style.background = 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)';
        instructions.style.display = 'block';
        
        // Highlight coverage area
        if (coverageArea) {
            coverageArea.setStyle({
                fillOpacity: 0.1,
                opacity: 0.6
            });
        }
        
        // HIDE crime polygons completely during routing to prevent interference
        if (geojsonLayer) {
            console.log('   🚫 Hiding crime layer to prevent interference');
            map.removeLayer(geojsonLayer);
        }
    } else {
        console.log('❌ Routing mode deactivated');
        btn.textContent = '🗺️ Plan Safe Route';
        btn.style.background = 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)';
        instructions.style.display = 'none';
        
        // Dim coverage area
        if (coverageArea) {
            coverageArea.setStyle({
                fillOpacity: 0.05,
                opacity: 0.3
            });
        }
        
        // RESTORE crime polygons
        if (geojsonLayer && !map.hasLayer(geojsonLayer)) {
            map.addLayer(geojsonLayer);
        }
        
        resetRouting();
    }
};

// Reset routing state
window.resetRouting = function() {
    console.log('🔄 Resetting routing state...');
    
    // Stop any animation
    stopRouteAnimation();
    
    startNode = null;
    endNode = null;
    directLine = null;
    currentRoute = null;
    
    // Remove all route layers
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers = [];
    
    // Remove all markers
    markerLayers.forEach(marker => map.removeLayer(marker));
    markerLayers = [];
    
    // Hide result panel
    const panel = document.getElementById('route-result');
    if (panel) {
        panel.style.display = 'none';
    }
    
    console.log('✅ Routing reset complete. Ready for new route!');
};

// ============================================
// VEHICLE ANIMATION FUNCTIONS
// ============================================

// Start route animation
window.startRouteAnimation = function() {
    if (!currentRoute || !currentRoute.coordinates) {
        console.error('No route to animate');
        return;
    }
    
    // Stop any existing animation
    stopRouteAnimation();
    
    console.log('🚗 Starting route animation...');
    
    // Show/hide buttons
    document.getElementById('animate-route-btn').style.display = 'none';
    document.getElementById('animation-controls').style.display = 'block';
    
    // Create vehicle marker (triangle)
    const startCoord = currentRoute.coordinates[0];
    vehicleMarker = L.marker([startCoord[1], startCoord[0]], {
        icon: L.divIcon({
            className: 'vehicle-marker',
            html: '<div style="width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-bottom: 25px solid #667eea; transform: rotate(0deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 25]
        }),
        zIndexOffset: 1000
    }).addTo(map);
    
    // Create risk popup
    riskPopup = L.popup({
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        className: 'risk-popup'
    });
    
    // Animation variables
    let currentSegment = 0;
    let progress = 0;
    const speed = 0.02; // Progress per frame (0-1), adjust for speed
    const delayMs = 30; // Frame delay in milliseconds
    
    // Animation loop
    animationInterval = setInterval(() => {
        if (currentSegment >= currentRoute.coordinates.length - 1) {
            // Animation complete
            stopRouteAnimation();
            console.log('✅ Animation complete!');
            return;
        }
        
        // Get current and next points
        const start = currentRoute.coordinates[currentSegment];
        const end = currentRoute.coordinates[currentSegment + 1];
        
        // Interpolate position
        const lat = start[1] + (end[1] - start[1]) * progress;
        const lon = start[0] + (end[0] - start[0]) * progress;
        
        // Calculate bearing (rotation) for triangle
        const bearing = calculateBearing(start[1], start[0], end[1], end[0]);
        
        // Update vehicle position
        vehicleMarker.setLatLng([lat, lon]);
        
        // Update vehicle rotation
        const vehicleElement = vehicleMarker.getElement();
        if (vehicleElement) {
            const triangle = vehicleElement.querySelector('div');
            if (triangle) {
                triangle.style.transform = `rotate(${bearing}deg)`;
            }
        }
        
        // Get current edge data for risk
        const edgeIndex = Math.min(currentSegment, currentRoute.edges.length - 1);
        const currentEdge = currentRoute.edges[edgeIndex];
        const riskScore = currentEdge ? currentEdge.weight : 0;
        const dangerLevel = getDangerLevel(riskScore);
        
        // Update risk popup
        const riskHtml = `
            <div style="text-align: center; min-width: 180px;">
                <div style="font-size: 24px; margin-bottom: 5px;">🚗</div>
                <div style="font-weight: bold; color: ${dangerLevel.color}; font-size: 16px; margin-bottom: 8px;">
                    ${dangerLevel.label}
                </div>
                <div style="font-size: 13px; color: #888;">Risk Score</div>
                <div style="font-size: 20px; font-weight: bold; color: ${dangerLevel.color};">
                    ${riskScore.toFixed(1)}
                </div>
                <div style="margin-top: 8px; font-size: 11px; color: #aaa;">
                    Segment ${currentSegment + 1}/${currentRoute.coordinates.length - 1}
                </div>
            </div>
        `;
        
        riskPopup.setLatLng([lat, lon]).setContent(riskHtml).openOn(map);
        
        // Update progress
        progress += speed;
        if (progress >= 1) {
            progress = 0;
            currentSegment++;
        }
        
    }, delayMs);
};

// Stop route animation
window.stopRouteAnimation = function() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    
    if (vehicleMarker) {
        map.removeLayer(vehicleMarker);
        vehicleMarker = null;
    }
    
    if (riskPopup) {
        map.closePopup(riskPopup);
        riskPopup = null;
    }
    
    // Show/hide buttons
    const animateBtn = document.getElementById('animate-route-btn');
    const controlsDiv = document.getElementById('animation-controls');
    
    if (animateBtn) animateBtn.style.display = 'block';
    if (controlsDiv) controlsDiv.style.display = 'none';
    
    console.log('⏹️ Animation stopped');
};

// Calculate bearing between two points (for triangle rotation)
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', init);
