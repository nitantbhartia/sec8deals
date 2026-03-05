#!/usr/bin/env python3
"""
Optional Crawl4AI bridge for Sec8Deals.

Usage:
  python3 scripts/crawl4ai_scrape.py --source affordablehousing --urls "https://...,..." --limit 20

Notes:
- This script is best-effort and only scrapes URLs explicitly provided via env-backed config.
- It does not implement anti-bot bypass behavior.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import dataclass
from typing import Any


@dataclass
class Listing:
  id: str
  sourceUrl: str
  address: str
  city: str
  state: str
  zip: str | None
  bedrooms: float
  bathrooms: float
  sqft: float
  askingPrice: float
  estimatedMonthlyRent: float


def to_number(value: Any, fallback: float) -> float:
  try:
    if value is None:
      return fallback
    if isinstance(value, (int, float)):
      return float(value)
    parsed = re.sub(r"[^0-9.\-]", "", str(value))
    if not parsed:
      return fallback
    return float(parsed)
  except Exception:
    return fallback


def split_city_state(city_state: str) -> tuple[str, str]:
  if not city_state:
    return "Unknown", "NA"
  parts = [p.strip() for p in city_state.split(",")]
  if len(parts) >= 2:
    return parts[0], parts[1]
  return city_state.strip(), "NA"


def extract_json_candidates(html: str) -> list[dict[str, Any]]:
  candidates: list[dict[str, Any]] = []

  for match in re.finditer(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
    block = match.group(1).strip()
    if not block:
      continue
    try:
      loaded = json.loads(block)
      if isinstance(loaded, dict):
        candidates.append(loaded)
      elif isinstance(loaded, list):
        candidates.extend([i for i in loaded if isinstance(i, dict)])
    except Exception:
      continue

  return candidates


def parse_from_json_ld(item: dict[str, Any], url: str, source: str, fallback_city: str, fallback_state: str) -> Listing | None:
  item_type = str(item.get("@type", "")).lower()
  if "residence" not in item_type and "house" not in item_type and "apartment" not in item_type:
    return None

  address = item.get("address", {})
  street = ""
  city = fallback_city
  state = fallback_state
  postal_code = None

  if isinstance(address, dict):
    street = str(address.get("streetAddress") or "")
    city = str(address.get("addressLocality") or city)
    state = str(address.get("addressRegion") or state)
    postal = address.get("postalCode")
    postal_code = str(postal) if postal else None

  bedrooms = to_number(item.get("numberOfRooms") or item.get("numberOfBedrooms"), 3)
  bathrooms = to_number(item.get("numberOfBathroomsTotal") or item.get("numberOfBathrooms"), 1.5)
  sqft = to_number(item.get("floorSize", {}).get("value") if isinstance(item.get("floorSize"), dict) else item.get("floorSize"), 1200)

  offers = item.get("offers")
  price = 0.0
  if isinstance(offers, dict):
    price = to_number(offers.get("price"), 0)

  if price <= 0:
    return None

  estimated_rent = max(900.0, round(price * 0.0095))

  listing_id_seed = f"{source}-{city}-{state}-{street or url}"
  listing_id = re.sub(r"[^a-zA-Z0-9-]", "-", listing_id_seed.lower())[:80]

  return Listing(
    id=listing_id,
    sourceUrl=url,
    address=street or "Address not provided",
    city=city,
    state=state,
    zip=postal_code,
    bedrooms=bedrooms,
    bathrooms=bathrooms,
    sqft=sqft,
    askingPrice=price,
    estimatedMonthlyRent=estimated_rent,
  )


async def scrape_urls(source: str, urls: list[str], limit: int, default_market: str) -> list[dict[str, Any]]:
  try:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
  except Exception as exc:
    raise RuntimeError(f"crawl4ai import failed: {exc}") from exc

  city, state = split_city_state(default_market)
  seen_ids: set[str] = set()
  results: list[dict[str, Any]] = []

  browser_config = BrowserConfig(headless=True, verbose=False)
  run_config = CrawlerRunConfig(word_count_threshold=0)

  async with AsyncWebCrawler(config=browser_config) as crawler:
    for url in urls:
      if len(results) >= limit:
        break

      try:
        page = await crawler.arun(url=url, config=run_config)
      except Exception:
        continue

      html = getattr(page, "html", "") or ""
      if not html:
        continue

      for obj in extract_json_candidates(html):
        listing = parse_from_json_ld(obj, url, source, city, state)
        if not listing:
          continue

        if listing.id in seen_ids:
          continue

        seen_ids.add(listing.id)
        hud_payment = round(listing.estimatedMonthlyRent * 1.03)

        results.append(
          {
            "id": listing.id,
            "sourceUrl": listing.sourceUrl,
            "address": listing.address,
            "city": listing.city,
            "state": listing.state,
            "zip": listing.zip,
            "bedrooms": listing.bedrooms,
            "bathrooms": listing.bathrooms,
            "sqft": listing.sqft,
            "askingPrice": listing.askingPrice,
            "estimatedMonthlyRent": listing.estimatedMonthlyRent,
            "hudPaymentStandard": hud_payment,
            "vacancyRate": 0.08,
            "propertyTaxRate": 0.014,
            "insuranceAnnual": 1200,
            "maintenanceRatio": 0.1,
            "neighborhoodGrade": 68,
          }
        )

        if len(results) >= limit:
          break

  return results


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser()
  parser.add_argument("--source", required=True, choices=["affordablehousing", "huddata"])
  parser.add_argument("--urls", required=True)
  parser.add_argument("--limit", type=int, default=20)
  parser.add_argument("--market", default="Unknown, NA")
  return parser.parse_args()


async def main() -> int:
  args = parse_args()
  urls = [u.strip() for u in args.urls.split(",") if u.strip()]
  if not urls:
    print(json.dumps({"listings": [], "error": "No URLs provided"}))
    return 0

  try:
    listings = await scrape_urls(args.source, urls, max(1, args.limit), args.market)
    print(json.dumps({"listings": listings}))
    return 0
  except Exception as exc:
    print(json.dumps({"listings": [], "error": str(exc)}))
    return 0


if __name__ == "__main__":
  sys.exit(asyncio.run(main()))
