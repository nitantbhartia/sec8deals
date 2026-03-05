import { promises as fs } from "node:fs";
import path from "node:path";
import type { DealsDataset } from "./types";

const WRITABLE_DATA_DIR = process.env.SECTION8_DATA_DIR ?? path.join("/tmp", "sec8deals", "section8");
const WRITABLE_DATA_FILE = path.join(WRITABLE_DATA_DIR, "deals.json");
const SEEDED_DATA_FILE = path.join(process.cwd(), "data", "section8", "deals.json");

async function readJsonFile(filePath: string): Promise<DealsDataset | null> {
  try {
    const file = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(file) as DealsDataset;
    if (!parsed?.deals || !parsed?.topMarkets) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function readDealsDataset(): Promise<DealsDataset | null> {
  const runtimeData = await readJsonFile(WRITABLE_DATA_FILE);
  if (runtimeData) {
    return runtimeData;
  }

  return readJsonFile(SEEDED_DATA_FILE);
}

export async function writeDealsDataset(dataset: DealsDataset): Promise<void> {
  await fs.mkdir(WRITABLE_DATA_DIR, { recursive: true });
  await fs.writeFile(WRITABLE_DATA_FILE, JSON.stringify(dataset, null, 2), "utf8");
}
