#!/usr/bin/env python3
"""
Geocode London Vegan Places listings with OpenStreetMap Nominatim.

Run from the repository root:
    python3 scripts/geocode_venues.py

The script:
- searches by venue name + full address, then address alone if needed;
- accepts only plausible building/venue matches, not road or postcode centroids;
- caches every query and waits at least 1.1 seconds between live requests;
- updates lat/lng in data/venues.json in place;
- leaves existing coordinates untouched when a confident match is not found.

Please keep the cache file when committing results so queries are not repeated.
"""
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "venues.json"
CACHE_FILE = ROOT / ".geocode-cache.json"
USER_AGENT = "LondonVeganPlacesCommunityMap/1.0 (one-off venue coordinate update)"
ALLOWED_TYPES = {
    "house", "building", "commercial", "retail", "restaurant", "cafe",
    "fast_food", "food_court", "pub", "bar", "theatre", "church",
    "market", "community_centre", "arts_centre"
}
BLOCKED_TYPES = {"postcode", "road", "street", "residential", "administrative"}

def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()

def postcode(value):
    m = re.search(r"\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b", value or "", re.I)
    return re.sub(r"\s+", "", m.group(1)).upper() if m else ""

def leading_number(value):
    # Ignore unit/floor labels before the actual street number.
    value = re.sub(r"^\s*(unit|shop|suite|floor)\s+[\w-]+\s*,\s*", "", value or "", flags=re.I)
    m = re.search(r"\b(\d+[a-z]?)\s+[A-Za-z]", value, re.I)
    return m.group(1).lower() if m else ""

def query_nominatim(query, cache):
    key = norm(query)
    if key in cache:
        return cache[key]
    params = urllib.parse.urlencode({
        "q": query, "format": "jsonv2", "addressdetails": 1, "limit": 5,
        "countrycodes": "gb"
    })
    url = "https://nominatim.openstreetmap.org/search?" + params
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en"})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            results = json.loads(response.read().decode("utf-8"))
    finally:
        time.sleep(1.1)  # Nominatim public service policy: max 1 request/second.
    cache[key] = results
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    return results

def plausible_match(result, venue):
    typ = (result.get("type") or "").lower()
    if typ in BLOCKED_TYPES:
        return False
    addr = result.get("address") or {}
    display = norm(result.get("display_name", ""))
    wanted_pc = postcode(venue.get("address", ""))
    got_pc = re.sub(r"\s+", "", (addr.get("postcode") or "")).upper()
    wanted_num = leading_number(venue.get("address", ""))
    got_num = norm(addr.get("house_number", "")).replace(" ", "")
    wanted_name = norm(venue.get("name") or venue.get("instagram", ""))
    category = (result.get("category") or "").lower()

    # A matching house number and street/postcode is the strongest address match.
    road = norm(addr.get("road", ""))
    address_norm = norm(venue.get("address", ""))

    # For numbered street addresses, require the same building number and road.
    # If a postcode is present in the result, it must also match.
    number_matches = bool(wanted_num and got_num and (
        wanted_num == got_num or got_num.startswith(wanted_num)
    ))
    road_matches = bool(road and road in address_norm)
    postcode_matches = bool(wanted_pc and got_pc == wanted_pc)
    if number_matches and road_matches and (not wanted_pc or postcode_matches):
        return True

    # For named destinations without a street number (e.g. a church or market),
    # require the full venue name, or at least two distinctive words, in the result.
    name_words = [w for w in wanted_name.split() if len(w) > 3]
    full_name_matches = bool(wanted_name and wanted_name in display)
    distinctive_matches = sum(1 for w in name_words if w in display) >= 2
    if (full_name_matches or distinctive_matches) and typ not in BLOCKED_TYPES:
        return True

    return False

def geocode(venue, cache):
    name = venue.get("name") or (("@" + venue["instagram"]) if venue.get("instagram") else "")
    address = venue.get("address", "")
    queries = []
    if name and address:
        queries.append(f"{name}, {address}, London, UK")
    if address:
        queries.append(f"{address}, London, UK")
    for query in queries:
        try:
            results = query_nominatim(query, cache)
        except Exception as exc:
            code = getattr(exc, "code", None)
            if code in (403, 429):
                raise RuntimeError(
                    f"Nominatim returned HTTP {code}; stopping to respect its usage limits."
                ) from exc
            print(f"  ERROR querying {query!r}: {exc}")
            continue
        matches = [r for r in results if plausible_match(r, venue)]
        if matches:
            # Prefer the most specific venue/building feature.
            matches.sort(key=lambda r: (
                0 if (r.get("type") or "").lower() in {"restaurant","cafe","fast_food","building","house","commercial","retail"} else 1,
                len(r.get("display_name", ""))
            ))
            return float(matches[0]["lat"]), float(matches[0]["lon"]), matches[0].get("display_name", "")
    return None

def main():
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    cache = json.loads(CACHE_FILE.read_text(encoding="utf-8")) if CACHE_FILE.exists() else {}
    if not CACHE_FILE.exists():
        CACHE_FILE.write_text("{}", encoding="utf-8")
    updated = 0
    unresolved = []
    stop_requested = False
    for group in ("verified_venues", "suggestions"):
        for venue in data.get(group, []):
            label = venue.get("name") or venue.get("instagram") or venue.get("id")
            print(f"Geocoding: {label}")
            try:
                result = geocode(venue, cache)
            except RuntimeError as exc:
                print(f"STOPPING: {exc}")
                stop_requested = True
                break
            if result:
                lat, lng, matched_name = result
                old = (venue.get("lat"), venue.get("lng"))
                venue["lat"], venue["lng"] = round(lat, 7), round(lng, 7)
                updated += 1
                print(f"  updated {old} -> {(venue['lat'], venue['lng'])} [{matched_name}]")
            else:
                unresolved.append(label)
                print("  no confident address/venue match; kept existing coordinates")
        if stop_requested:
            break
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nUpdated {updated} listings. Unmatched: {len(unresolved)}")
    if unresolved:
        print("Unmatched listings: " + "; ".join(unresolved))

if __name__ == "__main__":
    main()
