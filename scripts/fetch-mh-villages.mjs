/**
 * One-time / build script: fetch village names per district from Wikipedia
 * categories (Census-based village articles). Writes public/data/mh-villages-by-district.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const talukasPath = path.join(root, "src/data/maharashtraTalukas.json");
const outPath = path.join(root, "public/data/mh-villages-by-district.json");

/** Wikipedia category page suffix (after "Category:Villages in ") */
/** Suffix after "Category:Villages in " when the default "{district} district" is wrong */
const DISTRICT_CATEGORY_SUFFIX = {
  Dharashiv: "Osmanabad district", // renamed district; articles use old name
  Aurangabad: "Aurangabad district, Maharashtra", // disambiguate from Bihar
};

async function fetchCategoryMembers(categoryTitle) {
  const villages = [];
  let cmcontinue = undefined;
  const enc = encodeURIComponent(categoryTitle);
  do {
    let url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${enc}&cmlimit=500&format=json`;
    if (cmcontinue) url += `&cmcontinue=${encodeURIComponent(cmcontinue)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CropGenDashboard/1.0 (https://github.com; educational)" },
    });
    if (!res.ok) throw new Error(`${categoryTitle}: ${res.status}`);
    const j = await res.json();
    const batch = j.query?.categorymembers || [];
    for (const m of batch) {
      if (m.ns !== 0) continue;
      let name = (m.title || "").replace(/, Maharashtra$/, "").replace(/, Osmanabad$/, "").trim();
      if (name && !villages.includes(name)) villages.push(name);
    }
    cmcontinue = j.continue?.cmcontinue;
  } while (cmcontinue);
  return villages.sort((a, b) => a.localeCompare(b));
}

async function main() {
  const talukasByDistrict = JSON.parse(fs.readFileSync(talukasPath, "utf8"));
  const districts = Object.keys(talukasByDistrict).sort((a, b) => a.localeCompare(b));
  const out = {};

  for (const d of districts) {
    const suffix = DISTRICT_CATEGORY_SUFFIX[d] || `${d} district`;
    const cat = `Category:Villages in ${suffix}`;
    process.stderr.write(`Fetching ${cat}...\n`);
    try {
      out[d] = await fetchCategoryMembers(cat);
      process.stderr.write(`  -> ${out[d].length} villages\n`);
    } catch (e) {
      process.stderr.write(`  !! ${e.message}\n`);
      out[d] = [];
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 0), "utf8");
  process.stderr.write(`Wrote ${outPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
