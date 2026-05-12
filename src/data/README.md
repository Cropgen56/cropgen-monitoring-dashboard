# `src/data` — Maharashtra geographies & modules

## District boundary GeoJSON (35 files)

Files are named to match **`maharashtraTalukas.json`** / **`MAHARASHTRA_DISTRICTS`** UI labels:

- **Pattern:** `{District}.geojson` with **PascalCase** and **underscores** where the district name has a space.
- **Normalization:** `normalizeDistrictKey()` lowercases and strips non-alphanumerics, so `Mumbai_City.geojson` matches UI district **"Mumbai City"** (`mumbaicity`).

| File | District (as in app) |
|------|----------------------|
| `Ahmednagar.geojson` | Ahmednagar |
| `Akola.geojson` | Akola |
| `Amravati.geojson` | Amravati |
| `Aurangabad.geojson` | Aurangabad |
| `Beed.geojson` | Beed |
| `Bhandara.geojson` | Bhandara |
| `Buldhana.geojson` | Buldhana |
| `Chandrapur.geojson` | Chandrapur |
| `Dharashiv.geojson` | Dharashiv |
| `Dhule.geojson` | Dhule |
| `Gadchiroli.geojson` | Gadchiroli |
| `Gondia.geojson` | Gondia |
| `Hingoli.geojson` | Hingoli |
| `Jalgaon.geojson` | Jalgaon |
| `Jalna.geojson` | Jalna |
| `Kolhapur.geojson` | Kolhapur |
| `Latur.geojson` | Latur |
| `Mumbai_City.geojson` | Mumbai City |
| `Mumbai_Suburban.geojson` | Mumbai Suburban |
| `Nagpur.geojson` | Nagpur |
| `Nanded.geojson` | Nanded |
| `Nandurbar.geojson` | Nandurbar |
| `Nashik.geojson` | Nashik |
| `Palghar.geojson` | Palghar |
| `Parbhani.geojson` | Parbhani |
| `Pune.geojson` | Pune |
| `Raigad.geojson` | Raigad |
| `Ratnagiri.geojson` | Ratnagiri |
| `Sangli.geojson` | Sangli |
| `Satara.geojson` | Satara |
| `Sindhudurg.geojson` | Sindhudurg |
| `Thane.geojson` | Thane |
| `Wardha.geojson` | Wardha |
| `Washim.geojson` | Washim |
| `Yavatmal.geojson` | Yavatmal |

**Not present in this folder:** **Solapur** (listed in `maharashtraTalukas.json` but no bundled high-res polygon here). Use `public/data/maharashtra-districts-outline.geojson` for the simplified state grid.

## Source KML (field outlines)

| File | Role |
|------|------|
| `jalna-banana-source.kml` | Raw plots used to build `public/data/jalna-banana-plots.geojson` (pipeline / scripts). |
| `washim-soybean-source.kml` | Raw plots used to build `public/data/washim-soybean-plots.geojson`. |

These are large; they may be untracked — add to git only if your team wants them in the repo.

## Other JSON / JS

- **`maharashtraTalukas.json`** — canonical district → taluka lists (drives sidebar and **`MAHARASHTRA_DISTRICTS`**).
- **`maharashtraHierarchy.js`**, **`monitoringDefinitions.js`**, **`maharashtraDistrictSyntheticPlots.js`**, **`agriStateData.js`**, etc. — app logic and demo KPIs.

## Runtime assets (`public/data/`)

Served at `/data/…`: India/Maharashtra outlines, village index, Washim/Jalna enriched GeoJSON. See repo root **README** for paths.

## Rename history (for maintainers)

- Replaced `BHANDHANA` → **`Bhandara`**, `AURANGABAD_AKA_CHHATRAPATI_SAMBHAJINAGAR` → **`Aurangabad`**, and **SCREAMING_SNAKE** district stems with **PascalCase** names above.
- KML: `JALNA_BANANA.kml` / `WASHIM_SOYBEAN.kml` → **`jalna-banana-source.kml`** / **`washim-soybean-source.kml`**.
