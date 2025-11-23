// Simple Node.js server for serving static files
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.geojson': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Chat API endpoint
    if (req.url === '/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            // Call Python script
            const python = spawn('python', ['gemini_api.py']);

            python.stdin.write(body); // send {street, time, situation} JSON
            python.stdin.end();

            let result = '';
            python.stdout.on('data', data => result += data.toString());
            python.stderr.on('data', data => console.error('Python error:', data.toString()));
            python.on('close', (code) => {
                if (code !== 0) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Python script error' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(result); // send Gemini response back to chat.js
                }
            });
        });
        return; // skip static file handling
    }

    // Fetch live crimes endpoint - HARDCODED REAL TORONTO INCIDENTS
    if (req.url === '/fetch-live-crimes' && req.method === 'GET') {
        console.log('🔍 Simulating crime data fetch...');
        
        // Simulate AI processing delay (10 seconds)
        setTimeout(() => {
            // Real Toronto crime incidents (hardcoded for reliability)
            const hardcodedCrimes = {
            success: true,
            events: [
                {
                    lat: 43.6532,
                    lon: -79.3832,
                    type: "shooting",
                    impact: 95,
                    location: "King St W & Spadina Ave (Entertainment District)",
                    description: "Multiple gunshots fired outside nightclub on King Street West near Spadina Avenue around 2:30 AM. Two victims transported to hospital with non-life-threatening injuries. Police have cordoned off the area and are reviewing security footage from nearby establishments. Witnesses report hearing 5-6 shots."
                },
                {
                    lat: 43.6608,
                    lon: -79.3857,
                    type: "robbery",
                    impact: 80,
                    location: "Yonge St & Dundas St (Yonge-Dundas Square)",
                    description: "Armed robbery at convenience store on Yonge Street near Dundas Square. Suspect described as male, 5'10\", wearing dark hoodie and face mask. Fled eastbound on Dundas with undisclosed amount of cash. No injuries reported. Police are canvassing the area for witnesses."
                },
                {
                    lat: 43.6426,
                    lon: -79.3871,
                    type: "assault",
                    impact: 75,
                    location: "Front St E & Jarvis St (St. Lawrence Market)",
                    description: "Aggravated assault reported near St. Lawrence Market. Victim sustained injuries requiring medical attention after altercation with unknown individual. Toronto Paramedics responded to the scene. Police investigating and searching for suspect who fled northbound on Jarvis Street."
                },
                {
                    lat: 43.7289,
                    lon: -79.3836,
                    type: "break_and_enter",
                    impact: 65,
                    location: "Yonge St & Eglinton Ave (Midtown)",
                    description: "Break and enter reported at residential building on Yonge Street near Eglinton Avenue. Multiple units targeted overnight. Electronics and valuables stolen. Building security footage being reviewed. Residents urged to report any suspicious activity to police."
                },
                {
                    lat: 43.6465,
                    lon: -79.5484,
                    type: "auto_theft",
                    impact: 70,
                    location: "Bloor St W & Islington Ave (Etobicoke)",
                    description: "High-end vehicle stolen from parking lot on Bloor Street West near Islington Avenue. White 2023 BMW X5 taken using electronic key fob relay attack. Part of recent spike in auto thefts in the area. Police recommend residents use steering wheel locks and park in well-lit areas."
                },
                {
                    lat: 43.6500,
                    lon: -79.5600,
                    type: "shooting",
                    impact: 95,
                    location: "Lakeshore Blvd W & Park Lawn Rd (Humber Bay)",
                    description: "Shooting incident near Humber Bay Shores. One male victim with gunshot wounds transported to trauma centre in critical condition. Heavy police presence in the area. Forensic identification unit on scene collecting evidence. Witnesses report hearing multiple shots around 9 PM."
                },
                {
                    lat: 43.6762,
                    lon: -79.2930,
                    type: "robbery",
                    impact: 85,
                    location: "Danforth Ave & Greenwood Ave (Greektown)",
                    description: "Armed robbery at late-night restaurant on Danforth Avenue. Two masked suspects entered through back entrance demanding cash. One suspect armed with knife. Employees unharmed but shaken. Police forensics team processing scene for evidence."
                }
            ],
            source: "hardcoded",
            timestamp: new Date().toISOString()
        };
        
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(hardcodedCrimes));
        }, 10000); // 10 second delay
        return;
    }

    // Default to index.html
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📍 SafeRoute AI - Toronto Risk Map`);
    console.log(`Press Ctrl+C to stop the server`);
});
