#!/usr/bin/env python3
"""
fetch_planes.py
Fetches live ADS-B aircraft data for Israel and Middle East region from ADS-B servers
and writes it to public/planes.json (and planes.json in repo root) for static hosting
on GitHub Pages.
"""

import json
import urllib.request
import os
import sys
import time

# Sources to query in priority order (Israel & regional coverage)
URLS = [
    # adsb.lol Israel center (lat 31.8, lon 34.8, dist 250 nmi)
    "https://api.adsb.lol/v2/lat/31.8/lon/34.8/dist/250",
    # airplanes.live point endpoint
    "https://api.airplanes.live/v2/point/31.800/34.800/250",
    # adsb.fi
    "https://api.adsb.fi/v2/lat/31.8/lon/34.8/dist/250",
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlyRadarIsrael-Updater/1.0',
    'Accept': 'application/json'
}

data = None
source_used = None

for url in URLS:
    try:
        print(f"Fetching from: {url}")
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            if resp.status == 200:
                body = resp.read().decode('utf-8')
                parsed = json.loads(body)
                aircraft = parsed.get('ac', [])
                print(f"Successfully received {len(aircraft)} aircraft from {url}")
                if len(aircraft) > 0 or data is None:
                    data = parsed
                    source_used = url
                if len(aircraft) > 0:
                    break
    except Exception as err:
        print(f"Failed to fetch from {url}: {err}")

if not data:
    print("Warning: Could not fetch from any live endpoint. Generating fallback payload.")
    data = {
        "ac": [],
        "total": 0,
        "ctime": int(time.time()),
        "msg": "No live planes currently fetched"
    }

# Enrich metadata
data['updated_at'] = int(time.time())
data['updated_at_iso'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
data['source_url'] = source_used or 'none'

# Target output files
script_dir = os.path.dirname(os.path.abspath(__file__))
public_dir = os.path.join(script_dir, 'public')
os.makedirs(public_dir, exist_ok=True)

targets = [
    os.path.join(public_dir, 'planes.json'),
    os.path.join(script_dir, 'planes.json')
]

for target_file in targets:
    try:
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Saved aircraft data ({len(data.get('ac', []))} aircraft) to {target_file}")
    except Exception as e:
        print(f"Error saving to {target_file}: {e}")

print("Done updating planes.json successfully!")
