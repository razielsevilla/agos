import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
import os
import sys

# Ensure we can import the backend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
try:
    from scoring import batch_compute_risk
except ImportError:
    print("Could not import backend.scoring. Please run this script from the project root or ensure backend/scoring.py exists.")
    sys.exit(1)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Approximate centroid of Cabuyao
CABUYAO_LAT = 14.275
CABUYAO_LNG = 121.125

def fetch_live_rainfall():
    """Fetches real-time and 24h cumulative rainfall from Open-Meteo for Cabuyao."""
    print(f"Fetching real-time rainfall data for Cabuyao (Lat: {CABUYAO_LAT}, Lng: {CABUYAO_LNG}) from Open-Meteo...")
    
    # We request precipitation (which includes rain and showers)
    params = {
        "latitude": CABUYAO_LAT,
        "longitude": CABUYAO_LNG,
        "current": "precipitation",
        "hourly": "precipitation",
        "past_days": 1,
        "forecast_days": 1,
        "timezone": "Asia/Manila"
    }
    
    query_string = urllib.parse.urlencode(params)
    url = f"{OPEN_METEO_URL}?{query_string}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'AGOS-Live-Fetcher/1.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Current intensity (mm/hr)
            current_precip = data.get("current", {}).get("precipitation", 0.0)
            
            # Calculate 24h cumulative
            # We look at the hourly array and sum the last 24 hours up to the current hour
            hourly_times = data.get("hourly", {}).get("time", [])
            hourly_precip = data.get("hourly", {}).get("precipitation", [])
            
            cumulative_24h = 0.0
            if hourly_times and hourly_precip:
                # Find current hour index or closest past hour
                now = datetime.now()
                # Open-Meteo returns ISO times like "2026-09-09T16:00"
                current_time_str = now.strftime("%Y-%m-%dT%H:00")
                
                try:
                    current_idx = hourly_times.index(current_time_str)
                except ValueError:
                    # If exact hour not found, just use the most recent hour before now
                    past_times = [i for i, t in enumerate(hourly_times) if t <= current_time_str]
                    current_idx = past_times[-1] if past_times else 24
                
                # Sum the previous 24 hours (including current hour)
                start_idx = max(0, current_idx - 23)
                cumulative_24h = sum(hourly_precip[start_idx:current_idx+1])
            
            return current_precip, cumulative_24h
            
    except Exception as e:
        print(f"Error fetching from Open-Meteo: {e}")
        return 0.0, 0.0

def load_streets_for_scoring():
    """Loads street and demographic data from the seed file to use in scoring."""
    seed_path = os.path.join(os.path.dirname(__file__), 'seed_cabuyao_risk.json')
    if not os.path.exists(seed_path):
        print(f"Seed file not found at {seed_path}")
        return []
        
    with open(seed_path, 'r', encoding='utf-8') as f:
        seed_data = json.load(f)
        
    # Create a mapping of demographics
    demographics_map = {d["street_id"]: d for d in seed_data.get("street_demographics", [])}
    
    streets_data = []
    for s in seed_data.get("streets", []):
        street_id = s["id"]
        demo = demographics_map.get(street_id, {})
        
        # We need to map seed data fields to the scoring engine expected names
        # Note: the new seed format has average_elevation_m instead of elevation_m
        elev = s.get("average_elevation_m")
        # Fallback to the old format if average_elevation_m is missing
        if elev is None:
            elev = s.get("elevation_m", 10.0) 
            
        streets_data.append({
            "street_id": street_id,
            "street_name": s.get("street_name", s.get("name", "Unknown")),
            "barangay": s.get("barangay", s.get("barangay_name", "Unknown")),
            "elevation_m": elev,
            "total_residents": demo.get("total_residents", 0),
            "seniors": demo.get("senior_citizen_count", 0),
            "children": demo.get("children_count", 0),
            "pregnant": demo.get("pregnant_count", 0),
            "pwd": demo.get("pwd_count", 0)
        })
        
    return streets_data

def main():
    print("=" * 60)
    print("AGOS Live Risk Assessment Pipeline")
    print("=" * 60)
    
    # 1. Fetch live weather data
    intensity, cumulative_24h = fetch_live_rainfall()
    print(f"Live Weather Data:")
    print(f"  Current Intensity: {intensity:.2f} mm/hr")
    print(f"  24h Cumulative:    {cumulative_24h:.2f} mm")
    print("-" * 60)
    
    # 2. Load street baselines
    streets = load_streets_for_scoring()
    if not streets:
        print("No streets found to score. Exiting.")
        return
        
    # 3. Add weather to each street's inputs
    for s in streets:
        s["intensity_mmh"] = intensity
        s["cumulative_24h_mm"] = cumulative_24h
        
    # 4. Compute risk via the official backend scoring engine
    print(f"Scoring {len(streets)} streets using backend.scoring engine...")
    results = batch_compute_risk(streets)
    
    # Print results
    print("-" * 60)
    print("LIVE RISK ASSESSMENT RESULTS:")
    
    # Create a quick lookup for street name/barangay
    street_info = {s["street_id"]: (s["street_name"], s["barangay"], s["elevation_m"]) for s in streets}
    
    for r in results:
        sid = r["street_id"]
        name, brgy, elev = street_info.get(sid, ("Unknown", "Unknown", 0.0))
        
        print(f"[{r['risk_level']:8s}] score={r['risk_score']:5.1f} | {sid} | {name} ({brgy}) | Elev: {elev}m")

if __name__ == "__main__":
    main()
