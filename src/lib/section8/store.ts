import { promises as fs } from "node:fs";
import path from "node:path";
import type { DealsDataset } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "section8");
const DATA_FILE = path.join(DATA_DIR, "deals.json");

export async function readDealsDataset(): Promise<DealsDataset | null> {
  try {
    const file = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(file) as DealsDataset;
    if (!parsed?.deals || !parsed?.topMarkets) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDealsDataset(dataset: DealsDataset): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(dataset, null, 2), "utf8");
}
