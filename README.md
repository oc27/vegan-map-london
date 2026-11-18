# London Vegan Places

A standalone, static, mobile-friendly London vegan and vegan-friendly places guide.

## What's included

- The original 43 Instagram seed accounts, retained in `data/venues.json`
- All 44 seed-list entries have approximate map coordinates and are shown as pins
- All 36 additional Instagram accounts enriched with a name, address or clearly labelled approximate/pop-up location, and map coordinates
- Search, London region filters, mapped-place/account filters and venue detail popups
- Leaflet map with OpenStreetMap tiles
- Responsive black-and-white design using Cascadia Mono where installed
- GitHub Pages deployment workflow
- A prominent accuracy disclaimer asking visitors to check details directly with venues

## Editorial approach

This is a community-maintained guide, not an independently verified directory or an endorsement of any business. Listings may be incomplete or out of date. Visitors should check business status, address, opening hours and vegan options directly with each venue before visiting. Corrections and additions are welcome.

All seed accounts remain visible in the directory. All 44 entries are displayed as map pins. Some represent a current pop-up/residency, one representative branch of a multi-site business, or a broad approximate location where the original account did not provide a fixed address. Every coordinate is approximate and should be checked directly before travelling. One seed entry (Carb Club) is a creative workshop listing rather than a food venue; it is retained because it appeared in the source list and is labelled accordingly.

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
