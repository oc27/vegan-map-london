# London Vegan Places

A standalone, static, mobile-friendly London vegan directory and map.

## What's included

- 43 original Instagram seed accounts, retained in `data/venues.json`
- A small initial set of venue records with current first-party address/operation checks
- A separate pending list for accounts that still need checking
- Search, region filters, mapped/pending filters and venue detail popups
- Leaflet map with OpenStreetMap tiles
- Responsive black-and-white design using Cascadia Mono where installed
- GitHub Pages deployment workflow

## Verification approach

Only records in `verified_venues` are displayed as map pins. A venue should only move from `suggestions` to `verified_venues` after a contributor has checked:
1. The business is still operating (prefer its own current website/social account, booking system or direct confirmation).
2. The address belongs to the current venue/branch.
3. The vegan claim is accurately described. Use `Fully vegan`, `Fully plant-based`, `Vegan options` or another precise label rather than assuming every venue is fully vegan.

The original asterisk annotations are retained as `asterisk_in_original_list`; their meaning was not supplied, so they are not interpreted.

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

A pending suggestion has this shape:

```json
{
  "id": "suggestion-example",
  "instagram": "example_account",
  "region": "East",
  "status": "pending",
  "asterisk_in_original_list": false,
  "note": "Needs current operation, address and vegan status checked."
}
```

A verified venue should include `name`, `instagram`, `region`, `neighbourhood`, `address`, `vegan_status`, `category`, `website`, `source_urls`, `verification_note` and `checked_at`. Give each physical branch its own unique `id`. The front-end geocodes the address using the OpenStreetMap Nominatim service and caches successful results in the visitor's browser.

## External services

- Leaflet: map rendering library (CDN)
- OpenStreetMap: map tiles and geocoding
- GitHub Pages: static hosting

The map needs an internet connection. The public Nominatim service is used conservatively (sequential requests with a delay); for a larger public launch, consider a dedicated geocoding provider or storing checked coordinates in the data file.
