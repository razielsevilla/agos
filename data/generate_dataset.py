import json
import urllib.request
import urllib.parse
import datetime
import random
import os

# Overpass API endpoint
OVERPASS_URL = "http://overpass-api.de/api/interpreter"

def get_osm_data():
    # We will get a few streets and buildings in Cabuyao
    query = """
    [out:json];
    area["name"="Cabuyao"]->.searchArea;
    (
      way["highway"~"^(primary|secondary|residential)$"](area.searchArea);
    );
    out center 20;
    (
      way["building"](area.searchArea);
    );
    out center 100;
    """
    
    data = urllib.parse.urlencode({'data': query}).encode('utf-8')
    req = urllib.request.Request(OVERPASS_URL, data=data, headers={'User-Agent': 'AGOS-Synthetic-Generator/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching from OSM: {e}")
        return None

def compute_street_risk(rainfall_mm_hr):
    if rainfall_mm_hr < 7.5:
        return "normal", (rainfall_mm_hr / 7.5) * 30
    elif rainfall_mm_hr < 15.0:
        return "watch", 30 + ((rainfall_mm_hr - 7.5) / 7.4) * 30
    else:
        return "flagged", 60 + min(40, ((rainfall_mm_hr - 15) / 15) * 40)

def compute_household_risk(elevation_m, ground_floor):
    elevation_score = max(0, 100 - (elevation_m * 25))
    return min(100, elevation_score * 0.8 + (15 if ground_floor else 0))

def main():
    print("Fetching data from OSM for Cabuyao...")
    osm_data = get_osm_data()
    
    streets = []
    households = []
    flood_events = []
    
    if osm_data and 'elements' in osm_data:
        ways = osm_data['elements']
        osm_streets = [w for w in ways if 'tags' in w and 'highway' in w['tags'] and 'name' in w['tags']]
        osm_buildings = [w for w in ways if 'tags' in w and 'building' in w['tags']]
        
        # Select 6 distinct streets
        selected_osm_streets = osm_streets[:6]
        if len(selected_osm_streets) < 6:
             print("Warning: Not enough streets found in OSM, using fallbacks.")
    else:
        selected_osm_streets = []
        osm_buildings = []
        print("Warning: OSM fetch failed or empty, using entirely synthetic fallback.")

    # Fallback names if OSM fails or doesn't have enough data
    fallback_street_names = [
        "Purok 3, Brgy. Banay-Banay", "Purok 7, Brgy. Sala", "Purok 1, Brgy. Marinig",
        "Purok 4, Brgy. Pittland", "Purok 2, Brgy. Gulod", "Purok 5, Brgy. Mamatid"
    ]
    
    # Pre-fetch real elevations for buildings
    selected_osm_buildings = osm_buildings[:60] # Limit to 60 to not overload the API and keep it fast
    building_locations = []
    for b in selected_osm_buildings:
        if 'center' in b and 'lat' in b['center'] and 'lon' in b['center']:
            building_locations.append(f"{b['center']['lat']},{b['center']['lon']}")
            
    real_elevations = []
    if building_locations:
        print(f"Fetching real elevations for {len(building_locations)} buildings from OpenTopoData...")
        locations_str = "|".join(building_locations)
        topo_url = f"https://api.opentopodata.org/v1/srtm90m?locations={locations_str}"
        try:
            topo_req = urllib.request.Request(topo_url, headers={'User-Agent': 'AGOS-Synthetic-Generator/1.0'})
            with urllib.request.urlopen(topo_req, timeout=30) as response:
                topo_data = json.loads(response.read().decode('utf-8'))
                if 'results' in topo_data:
                    for res in topo_data['results']:
                        if res.get('elevation') is not None:
                            real_elevations.append(res['elevation'])
        except Exception as e:
            print(f"Error fetching elevations: {e}")

    # Fallback to random if API fails
    if not real_elevations:
        print("Using synthetic fallback elevations.")
        real_elevations = [random.uniform(0.2, 3.0) for _ in range(60)]

    # Fetch historical real rainfall data for Typhoon Carina (July 2024)
    print("Fetching historical rainfall data (Typhoon Carina) from Open-Meteo...")
    carina_rainfall = []
    try:
        meteo_url = "https://archive-api.open-meteo.com/v1/archive?latitude=14.275&longitude=121.125&start_date=2024-07-23&end_date=2024-07-24&hourly=precipitation"
        meteo_req = urllib.request.Request(meteo_url, headers={'User-Agent': 'AGOS-Synthetic-Generator/1.0'})
        with urllib.request.urlopen(meteo_req, timeout=30) as response:
            meteo_data = json.loads(response.read().decode('utf-8'))
            if 'hourly' in meteo_data and 'precipitation' in meteo_data['hourly']:
                precip_data = meteo_data['hourly']['precipitation']
                # Open-Meteo is a global model and averages over large grids, underestimating local peaks.
                # We extract real relative intensities but scale them to match local rain gauge equivalent peaks.
                peaks = sorted(list(set(precip_data)), reverse=True)
                carina_rainfall = [
                    peaks[0] * 12, 
                    peaks[len(peaks)//6] * 12, 
                    peaks[2*len(peaks)//6] * 12,
                    peaks[3*len(peaks)//6] * 12,
                    peaks[4*len(peaks)//6] * 12,
                    peaks[-2] * 12
                ]
    except Exception as e:
        print(f"Error fetching historical rainfall: {e}")

    if not carina_rainfall or len(carina_rainfall) < 6:
        carina_rainfall = [20.0, 15.0, 10.0, 8.0, 4.0, 2.0]

    # We want exactly 6 streets
    for i in range(6):
        street_id = f"STR-{i+1:03d}"
        
        lat = 14.2764 + random.uniform(-0.01, 0.01)
        lng = 121.1235 + random.uniform(-0.01, 0.01)
        
        # Extract the specific barangay name from our fallback list
        fallback_brgy = fallback_street_names[i].split("Brgy. ")[1] if "Brgy. " in fallback_street_names[i] else "Cabuyao Area"
        
        if i < len(selected_osm_streets):
            name = selected_osm_streets[i]['tags'].get('name', fallback_street_names[i])
            if 'center' in selected_osm_streets[i]:
                lat = selected_osm_streets[i]['center']['lat']
                lng = selected_osm_streets[i]['center']['lon']
        else:
            name = fallback_street_names[i]
            
        rainfall = carina_rainfall[i]
        status, risk_score = compute_street_risk(rainfall)
        
        streets.append({
            "id": street_id,
            "name": name,
            "barangay": fallback_brgy,
            "camera_label": f"{name} Cam",
            "reference_object": "Street-side structure, 0.5m markings",
            "latitude": lat,
            "longitude": lng,
            "status": status,
            "risk_score": round(risk_score),
            "water_level_estimate_cm": 18 if status == "flagged" else None,
            "suggested_evacuation_route": "Proceed to the nearest barangay covered court on higher ground.",
            "last_updated": datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()
        })
        
        # Create flood event
        flood_events.append({
            "id": f"EVT-{i+1:03d}",
            "street_id": street_id,
            "rainfall_mm_hr": rainfall,
            "water_level_estimate_cm": 18 if status == "flagged" else None,
            "fused_risk_score": round(risk_score),
            "recorded_at": datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()
        })
        
        # Generate 5-8 households for this street
        num_households = random.randint(5, 8)
        street_hhs = []
        for j in range(num_households):
            hh_id = f"HH-{len(households) + len(street_hhs) + 1:03d}"
            
            # Pop a real elevation or fallback if we ran out
            if real_elevations:
                elevation_m = round(real_elevations.pop(0), 1)
            else:
                elevation_m = round(random.uniform(0.2, 3.0), 1)
                
            # We still need to mock ground_floor as sat data can't tell us if it's on stilts
            ground_floor = elevation_m < 15.0 or random.choice([True, False]) # Adjusting threshold since real elev in Cabuyao is ~10-20m
            hh_risk_score = compute_household_risk(elevation_m, ground_floor)
            
            street_hhs.append({
                "id": hh_id,
                "street_id": street_id,
                "address_label": f"Bldg/Lot {random.randint(1, 100)}",
                "elevation_m": elevation_m,
                "ground_floor": ground_floor,
                "risk_score": round(hh_risk_score),
                "predicted_at_risk": round(hh_risk_score) >= 50,
                "affected_status": "unmarked",
                "marked_at": None
            })
            
        # Sort by risk descending and assign rank
        street_hhs.sort(key=lambda x: x["risk_score"], reverse=True)
        for rank, hh in enumerate(street_hhs):
            hh["risk_rank"] = rank + 1
            
        households.extend(street_hhs)

    out_data = {
        "_meta": {
            "description": "AGOS illustrative/synthetic seed dataset generated using OSM data combined with scoring algorithms.",
            "generated_at": datetime.datetime.now().astimezone().replace(microsecond=0).isoformat(),
            "streets": len(streets),
            "households": len(households),
            "flood_events": len(flood_events)
        },
        "streets": streets,
        "households": households,
        "flood_events": flood_events
    }
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(script_dir, 'seed.json')
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, indent=2)
        
    print(f"Generated synthetic dataset saved to {out_path}")
    print(f"Created {len(streets)} streets and {len(households)} households.")

if __name__ == "__main__":
    main()
