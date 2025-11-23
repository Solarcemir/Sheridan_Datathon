// Configuration
const CONFIG = {
    map: {
        center: [43.7, -79.42], // Toronto coordinates
        zoom: 11,
        minZoom: 10,
        maxZoom: 18
    },
    tiles: {
        // Dark basemap from CartoDB
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    },
    geojson: {
        file: 'Neighbourhood_Crime_Rates_Open_Data_-5291801778870948764.geojson'
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
// let bufferLayer;  // DEMO: Used for showing safety buffer zones around selected areas
let crimeData;
// let selectedFeature = null;  // DEMO: Tracks the currently selected feature for buffer display
// let showBuffers = true;  // DEMO: Toggle for automatic buffer display on click
// let riskMode = 'gradient';  // DEMO: 'gradient' for smooth color transitions or 'threshold' for discrete levels

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

// Style function for GeoJSON features
function getFeatureStyle(feature) {
    // DEMO: Risk-based coloring (commented out)
    // const riskScore = calculateRiskScore(feature);
    // const color = riskMode === 'gradient' ? getGradientColor(riskScore) : getRiskColor(riskScore);
    
    // Simple single-color style (default)
    return {
        fillColor: '#00ff88',
        weight: 1,
        opacity: 1,
        color: '#00ff88',
        fillOpacity: 0.3
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
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', init);
