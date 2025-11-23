import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
import requests
from bs4 import BeautifulSoup
import json
import re
import sys

load_dotenv()

def fetch_gta_updates():
    """Scrape recent incidents from gtaupdate.com"""
    url = "https://gtaupdate.com/"
    response = requests.get(url)

    if response.status_code != 200:
        print(json.dumps({"error": "Failed to fetch incidents"}))
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table")
    
    if not table:
        print(json.dumps({"error": "No incident table found"}))
        return []

    tbody = table.find("tbody")
    rows = tbody.find_all("tr")
    
    incidents = []
    for row in rows[:10]:  # Get top 10 incidents
        cols = row.find_all("td")
        if len(cols) < 3:
            continue
            
        time = cols[0].text.strip()
        district = cols[1].text.strip()
        details = cols[2].text.strip()
        
        incidents.append({
            "time": time,
            "district": district,
            "details": details
        })
    
    return incidents

def geocode_location(location_text):
    """Use Nominatim to get coordinates for a location in Toronto"""
    
    # Hardcoded coordinates for Toronto Fire Service districts and common areas
    toronto_locations = {
        # TFS Districts (approximate locations based on Toronto Fire Service stations)
        "TFS 111": {"lat": 43.6532, "lon": -79.3832},  # Downtown core
        "TFS 112": {"lat": 43.6465, "lon": -79.3957},  # Liberty Village
        "TFS 113": {"lat": 43.6426, "lon": -79.3871},  # Financial District
        "TFS 114": {"lat": 43.6548, "lon": -79.3975},  # King West
        "TFS 121": {"lat": 43.6629, "lon": -79.4000},  # Christie Pits
        "TFS 122": {"lat": 43.6670, "lon": -79.4163},  # High Park area
        "TFS 123": {"lat": 43.6700, "lon": -79.4300},  # Junction
        "TFS 131": {"lat": 43.6782, "lon": -79.2932},  # East York
        "TFS 132": {"lat": 43.6850, "lon": -79.2800},  # Danforth
        "TFS 133": {"lat": 43.6900, "lon": -79.2700},  # East End
        "TFS 141": {"lat": 43.7289, "lon": -79.3836},  # Midtown
        "TFS 142": {"lat": 43.7247, "lon": -79.3950},  # Eglinton West
        "TFS 143": {"lat": 43.7200, "lon": -79.4100},  # Forest Hill
        "TFS 211": {"lat": 43.7635, "lon": -79.4111},  # North York Centre
        "TFS 212": {"lat": 43.7700, "lon": -79.4200},  # Bathurst Manor
        "TFS 213": {"lat": 43.7800, "lon": -79.4300},  # York University area
        "TFS 221": {"lat": 43.7896, "lon": -79.4163},  # North York North
        "TFS 222": {"lat": 43.8000, "lon": -79.4000},  # Finch area
        "TFS 231": {"lat": 43.7731, "lon": -79.2580},  # Scarborough West
        "TFS 232": {"lat": 43.7800, "lon": -79.2400},  # Scarborough Central
        "TFS 233": {"lat": 43.7951, "lon": -79.1820},  # Scarborough North
        "TFS 234": {"lat": 43.7600, "lon": -79.2300},  # Scarborough South
        "TFS 241": {"lat": 43.7279, "lon": -79.5074},  # Etobicoke Central
        "TFS 242": {"lat": 43.7100, "lon": -79.5400},  # Etobicoke North
        "TFS 243": {"lat": 43.6465, "lon": -79.5484},  # Etobicoke South
        "TFS 244": {"lat": 43.7061, "lon": -79.5943},  # Etobicoke West
        "TFS 311": {"lat": 43.6600, "lon": -79.3700},  # Cabbagetown
        "TFS 312": {"lat": 43.6700, "lon": -79.3500},  # Riverdale
        "TFS 313": {"lat": 43.6800, "lon": -79.3300},  # Leslieville
        "TFS 321": {"lat": 43.7000, "lon": -79.3600},  # Leaside
        "TFS 322": {"lat": 43.7100, "lon": -79.3400},  # Don Mills
        "TFS 331": {"lat": 43.7400, "lon": -79.3000},  # Thorncliffe Park
        "TFS 332": {"lat": 43.7500, "lon": -79.2800},  # Flemingdon Park
        "TFS 333": {"lat": 43.7600, "lon": -79.2600},  # Victoria Park
        "TFS 341": {"lat": 43.7200, "lon": -79.2400},  # Main & Danforth
        "TFS 342": {"lat": 43.7100, "lon": -79.2200},  # Warden
        "TFS 343": {"lat": 43.7300, "lon": -79.2100},  # Kennedy
        "TFS 344": {"lat": 43.7400, "lon": -79.1900},  # Midland
        "TFS 345": {"lat": 43.7500, "lon": -79.1700},  # McCowan
        "TFS 411": {"lat": 43.6900, "lon": -79.4500},  # Corso Italia
        "TFS 412": {"lat": 43.7000, "lon": -79.4700},  # Fairbank
        "TFS 413": {"lat": 43.7100, "lon": -79.4900},  # Weston
        "TFS 421": {"lat": 43.7300, "lon": -79.5100},  # Mount Dennis
        "TFS 422": {"lat": 43.7400, "lon": -79.5300},  # Rexdale
        "TFS 423": {"lat": 43.7500, "lon": -79.5500},  # Thistletown
        "TFS 431": {"lat": 43.6700, "lon": -79.5200},  # Mimico
        "TFS 432": {"lat": 43.6600, "lon": -79.5400},  # Long Branch
        "TFS 433": {"lat": 43.6500, "lon": -79.5600},  # Alderwood
    }
    
    # Clean location text
    location_clean = location_text.strip()
    
    # Check if location matches a known TFS district or area
    if location_clean in toronto_locations:
        return toronto_locations[location_clean]
    
    # Try to extract TFS number (e.g., "District TFS 141" -> "TFS 141")
    if "TFS" in location_clean.upper():
        import re
        match = re.search(r'TFS\s*(\d+)', location_clean, re.IGNORECASE)
        if match:
            tfs_key = f"TFS {match.group(1)}"
            if tfs_key in toronto_locations:
                return toronto_locations[tfs_key]
    
    try:
        # Add "Toronto" to improve accuracy
        search_query = f"{location_text}, Toronto, Ontario, Canada"
        
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": search_query,
            "format": "json",
            "limit": 1,
            "countrycodes": "ca"
        }
        headers = {
            "User-Agent": "SafeRouteAI/1.0"
        }
        
        response = requests.get(url, params=params, headers=headers)
        data = response.json()
        
        if data and len(data) > 0:
            return {
                "lat": float(data[0]["lat"]),
                "lon": float(data[0]["lon"])
            }
    except Exception as e:
        print(f"Geocoding error for '{location_text}': {e}", file=sys.stderr)
    
    return None

def extract_crimes_simple(incidents):
    """Extract crimes directly from incidents without Gemini (fallback)"""
    crimes = []
    
    # Map keywords to crime types
    crime_keywords = {
        'shooting': ['shooting', 'shot', 'gunfire', 'firearm'],
        'homicide': ['homicide', 'murder', 'death', 'fatal'],
        'robbery': ['robbery', 'robbed', 'armed robbery'],
        'assault': ['assault', 'stabbing', 'stabbed', 'attacked'],
        'breakenter': ['break', 'enter', 'burglary'],
        'autotheft': ['auto theft', 'vehicle theft', 'stolen car']
    }
    
    for incident in incidents[:10]:
        details_lower = incident['details'].lower()
        district = incident['district']
        time = incident['time']
        details = incident['details']
        
        # Determine crime type
        crime_type = 'assault'  # default
        severity = 60  # default
        
        for ctype, keywords in crime_keywords.items():
            if any(keyword in details_lower for keyword in keywords):
                crime_type = ctype
                # Assign severity based on type
                if ctype in ['shooting', 'homicide']:
                    severity = 95
                elif ctype == 'robbery':
                    severity = 80
                elif ctype == 'assault':
                    severity = 70
                else:
                    severity = 60
                break
        
        # Extract location from district or details
        location = f"District {district}"
        
        # Create description
        description = f"Incident reported at {time} in District {district}. {details[:150]}"
        if len(details) > 150:
            description += "..."
        
        crimes.append({
            "location": location,
            "type": crime_type,
            "severity": severity,
            "description": description
        })
    
    # Return top 5 by severity
    crimes.sort(key=lambda x: x['severity'], reverse=True)
    return crimes[:5]

def extract_crimes_with_gemini(incidents):
    """Use Gemini to extract structured crime data with detailed descriptions"""
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    incidents_text = "\n".join([
        f"[{inc['time']}] District {inc['district']}: {inc['details']}" 
        for inc in incidents
    ])
    
    prompt = f"""
You are analyzing recent crime incidents in Toronto to help create safety alerts for citizens.

Analyze these incidents and select the 5 MOST SERIOUS and RECENT ones that pose immediate danger to public safety.

Incidents:
{incidents_text}

For EACH of the 5 most serious incidents, provide:
1. **location**: Specific street intersection, address, or landmark in Toronto (e.g., "Yonge St & Dundas St", "Union Station", "King St W & Spadina Ave")
2. **type**: One of these exact values: shooting/homicide/robbery/assault/breakenter/autotheft
3. **severity**: Number 1-100 (shooting/homicide=90-100, robbery=75-85, assault=60-75, other=40-60)
4. **description**: A 2-3 sentence news-style summary explaining what happened, when, and any important details (victims, suspects, ongoing investigation, etc.)

IMPORTANT:
- Extract actual street names and intersections from the incident details
- If no specific location given, use the district number and major landmark in that district
- Make descriptions informative and professional, like a news alert
- Focus on incidents from the last few hours

Return ONLY a valid JSON array with this EXACT format (no markdown, no extra text):
[
  {{
    "location": "Yonge St & College St",
    "type": "shooting",
    "severity": 95,
    "description": "A shooting incident occurred at this intersection around 2:30 AM. Police responded to reports of gunfire and found one victim with serious injuries. Suspects fled the scene and investigation is ongoing."
  }},
  {{
    "location": "King St W & Bathurst St",
    "type": "assault",
    "severity": 72,
    "description": "An assault was reported near this location late last night. Victim sustained injuries requiring medical attention. Police are seeking witnesses to the incident."
  }}
]
"""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt
        )
        
        # Extract JSON from response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        response_text = re.sub(r'^```json\s*\n', '', response_text)
        response_text = re.sub(r'^```\s*\n', '', response_text)
        response_text = re.sub(r'\n```$', '', response_text)
        response_text = response_text.strip()
        
        crimes = json.loads(response_text)
        return crimes
        
    except Exception as e:
        print(f"Gemini error: {e}", file=sys.stderr)
        return []

if __name__ == "__main__":
    # Fetch incidents
    incidents = fetch_gta_updates()
    
    if not incidents:
        print(json.dumps({"error": "No incidents found"}))
        exit(1)
    
    # Try Gemini first, fallback to simple extraction
    crimes = []
    try:
        crimes = extract_crimes_with_gemini(incidents)
        if crimes:
            print("Using Gemini AI analysis", file=sys.stderr)
        else:
            raise Exception("Gemini returned no results")
    except Exception as e:
        print(f"Gemini failed, using simple extraction: {e}", file=sys.stderr)
        crimes = extract_crimes_simple(incidents)
        print(f"Simple extraction found {len(crimes)} crimes", file=sys.stderr)
    
    if not crimes:
        print(json.dumps({"error": "Failed to extract crime data"}))
        exit(1)
    
    print(f"Processing {len(crimes)} crimes for geocoding...", file=sys.stderr)
    
    # Geocode locations
    crime_events = []
    for crime in crimes[:5]:  # Limit to 5
        location = crime.get("location", "")
        print(f"Geocoding: {location}", file=sys.stderr)
        coords = geocode_location(location)
        
        if coords:
            print(f"  -> Found coords: {coords['lat']}, {coords['lon']}", file=sys.stderr)
            crime_events.append({
                "lat": coords["lat"],
                "lon": coords["lon"],
                "type": crime.get("type", "assault"),
                "impact": crime.get("severity", 80),
                "location": location,
                "description": crime.get("description", "No details available")
            })
        else:
            print(f"  -> No coords found for {location}", file=sys.stderr)
    
    # Output JSON
    print(json.dumps({
        "success": True,
        "events": crime_events,
        "count": len(crime_events)
    }))
