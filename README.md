# London Vegan Places

A standalone, static, mobile-friendly London vegan and vegan-friendly places guide.

## What's included

- The original Instagram seed accounts, retained in `data/venues.json`
- The original 44 seed-list entries are retained, with 21 additional places found in current 2026 London vegan dining guides; all 65 records have approximate map coordinates and appear as pins
- All 36 additional Instagram accounts enriched with a name, address or clearly labelled approximate/pop-up location, and map coordinates
- Search, London region filters, mapped-place/account filters and venue detail popups
- Leaflet map with OpenStreetMap tiles
- Responsive black-and-white design using Cascadia Mono where installed
- GitHub Pages deployment workflow
- A prominent accuracy disclaimer asking visitors to check details directly with venues
- A community feedback form connected to Formspree (endpoint configured in `index.html`)

## Editorial approach

This is a community-maintained guide, not an independently verified directory or an endorsement of any business. Listings may be incomplete or out of date. Visitors should check business status, address, opening hours and vegan options directly with each venue before visiting. Corrections and additions are welcome through the homepage feedback form. Visitors do not need to access GitHub or edit the repository; submissions are emailed through the configured Formspree form.

All seed accounts remain visible in the directory. The expanded dataset contains 65 entries, all displayed as map pins. Some represent a current pop-up/residency, one representative branch of a multi-site business, or a broad approximate location where the original account did not provide a fixed address. Every coordinate is approximate and should be checked directly before travelling. One seed entry (Carb Club) is a creative workshop listing rather than a food venue; it is retained because it appeared in the source list and is labelled accordingly.

## Run locally

Because the site fetches JSON, use a local static server rather than opening `index.html` directly. For example:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Publish using GitHub Pages (no ChatGPT/GitHub connection required)

1. Download and unzip this project.
2. Upload the contents of the `london-vegan-map` folder into the root of `https://github.com/oc27/vegan-map-london` (not the enclosing folder itself).
3. Commit the files to the `main` branch.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **GitHub Actions**.
6. The included workflow deploys the site. After the first successful run, GitHub will show the Pages URL in Settings → Pages.

The workflow is in `.github/workflows/deploy.yml`.

## Updating the directory

Edit `data/venues.json`.

- Add every community suggestion to the `suggestions` array; these appear as Instagram-account entries.
- Add names, addresses and approximate `lat` / `lng` coordinates to `suggestions` or `verified_venues`; every entry with coordinates appears on the map. The interface calls them `PINNED`, not `VERIFIED`.
- Use precise vegan descriptions such as `Fully vegan`, `Fully plant-based`, or `Vegan options`; do not imply that every venue is fully vegan.
- Keep the disclaimer in the homepage when adapting the site.

The front end reads coordinates directly from the data file. It does not geocode addresses in each visitor's browser, so pins render without depending on a live geocoding service.

## External services

- Leaflet: map rendering library (CDN)
- OpenStreetMap: map tiles
- GitHub Pages: static hosting

The map needs an internet connection to load Leaflet and OpenStreetMap tiles. Venue pins themselves are generated from the bundled coordinates.


## Navigation and coordinate accuracy update (18 November 2026)

- Every listing now has an **Open in Google Maps** directions link in its directory card and map popup.
- The destination is built from the venue name and the full listed address.
- All 65 map coordinates remain approximate. They have **not** been individually verified against each building entrance, so the map does not claim that the pins are exact.
- The next data-quality pass should geocode and manually inspect each venue, then update the coordinates and record the evidence/source for each one.


## Coordinate audit status (18 November 2026)

A coordinate-audit worklist is included as `COORDINATE-AUDIT.csv`. All 65 current positions are explicitly marked as needing manual verification. This update does not claim that any coordinates have been independently geocoded or checked against a building entrance. The existing coordinates are retained so the map continues to work, but the interface labels them approximate.

The live Nominatim public service has strict usage limits and discourages bulk geocoding. Any one-off audit must respect its current policy, cache results, and manually check ambiguous matches. A geocoded street/building result is not automatically an entrance coordinate. See https://operations.osmfoundation.org/policies/nominatim/ .


## Updating map coordinates

The coordinate updater is a one-off maintenance tool, not a visitor verification
step. It geocodes venue names and addresses with OpenStreetMap Nominatim, caches
responses, and updates `data/venues.json` directly. It waits at least 1.1 seconds
between requests and leaves an existing coordinate unchanged when it cannot find
a plausible building or venue match.

To run locally from the repository root:

```bash
python3 scripts/geocode_venues.py
```

Alternatively, after uploading the files to GitHub, open **Actions → Geocode map
locations → Run workflow**. The workflow runs the same script and commits changed
coordinates; the normal Pages deployment then publishes the updated map.

Nominatim's public service has a strict usage policy. This script is deliberately
sequential, rate-limited, and cached; do not run it repeatedly or use it for
continuous bulk geocoding. Policy: https://operations.osmfoundation.org/policies/nominatim/
