import fs from "fs";
import path from "path";
import type { CostGuide } from "./types";

const GUIDES_DIR = path.join(process.cwd(), "src/data/cost-guides");

export function getAllCostGuideSlugs(): string[] {
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

export function getCostGuide(slug: string): CostGuide {
  const filePath = path.join(GUIDES_DIR, `${slug}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export function getAllCostGuides(): CostGuide[] {
  return getAllCostGuideSlugs().map(getCostGuide);
}
