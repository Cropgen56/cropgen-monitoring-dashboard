/**
 * Crop preview images — files in `src/assets/crop-images/`.
 * Add new files there and extend `CROP_IMAGE_BY_KEY` (or aliases) below.
 */

import cottonImg from "../assets/crop-images/cotton.jpeg";
import soyabeanImg from "../assets/crop-images/soyabean.jpeg";
import bananaImg from "../assets/crop-images/banana.jpeg";
import sugarcanImg from "../assets/crop-images/sugarcan.jpeg";
import toorImg from "../assets/crop-images/toor.jpeg";
import wheatImg from "../assets/crop-images/wheat.jpeg";
import sorghumImg from "../assets/crop-images/sorghum.jpeg";
import bajraImg from "../assets/crop-images/bajra.jpeg";
import maizeImg from "../assets/crop-images/maize.jpeg";
import chickpeaImg from "../assets/crop-images/chickpea.jpeg";
import onionImg from "../assets/crop-images/onion.jpeg";
import grapsImg from "../assets/crop-images/graps.jpeg";
import orangeImg from "../assets/crop-images/orange.jpeg";
import groundnutImg from "../assets/crop-images/groundnut.jpeg";

/** Default when crop is unknown or we have no file yet (e.g. Rice, Chili). */
const FALLBACK_CROP_IMAGE = soyabeanImg;

/**
 * Primary keys match normalized crop strings (see `normalizeCropKeyForImage`).
 * @type {Record<string, string>}
 */
const CROP_IMAGE_BY_KEY = {
  cotton: cottonImg,
  soybean: soyabeanImg,
  soyabean: soyabeanImg,
  banana: bananaImg,
  sugarcane: sugarcanImg,
  sugarcan: sugarcanImg,
  tur: toorImg,
  toor: toorImg,
  arhar: toorImg,
  pigeonpea: toorImg,
  wheat: wheatImg,
  jowar: sorghumImg,
  sorghum: sorghumImg,
  bajra: bajraImg,
  maize: maizeImg,
  corn: maizeImg,
  /** Gram (Chana) */
  gram: chickpeaImg,
  chana: chickpeaImg,
  chickpea: chickpeaImg,
  gramchana: chickpeaImg,
  onion: onionImg,
  grapes: grapsImg,
  graps: grapsImg,
  orange: orangeImg,
  groundnut: groundnutImg,
  peanut: groundnutImg,
  /** No file yet — fall back */
  rice: FALLBACK_CROP_IMAGE,
  chili: FALLBACK_CROP_IMAGE,
  chilli: FALLBACK_CROP_IMAGE,
};

/** Backward compatibility */
export const SOYBEAN_CROP_IMAGE_URL = soyabeanImg;
export const BANANA_CROP_IMAGE_URL = bananaImg;

/**
 * Normalize crop label for lookup: "Gram (Chana)" → "gramchana", "Soybean" → "soybean".
 */
export function normalizeCropKeyForImage(raw) {
  let s = String(raw || "")
    .trim()
    .toLowerCase();
  s = s.replace(/\(([^)]*)\)/g, " $1 ");
  s = s.replace(/[^a-z0-9]+/g, "");
  return s;
}

/**
 * Image URL (Vite-resolved string) for a crop name or `cropType` from plot props.
 */
export function getCropImageUrl(cropName) {
  const key = normalizeCropKeyForImage(cropName);
  if (!key) return FALLBACK_CROP_IMAGE;
  return CROP_IMAGE_BY_KEY[key] ?? FALLBACK_CROP_IMAGE;
}
