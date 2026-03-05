#!/usr/bin/env python3
"""
Best-effort scraper bridge for Sec8Deals.

It prefers Crawl4AI when available, and falls back to urllib-based HTML fetch
and regex parsing when Crawl4AI is unavailable in the runtime.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import dataclass
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import gzip


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


def clamp(value: float, min_value: float, max_value: float) -> float:
  return max(min_value, min(max_value, value))


def split_city_state(city_state: str) -> tuple[str, str]:
  if not city_state:
    return "Unknown", "NA"
  parts = [p.strip() for p in city_state.split(",")]
  if len(parts) >= 2:
    return parts[0], parts[1]
  return city_state.strip(), "NA"


def fetch_html(url: str) -> str:
  req = Request(
    url,
    headers={
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  )
  with urlopen(req, timeout=20) as res:
    return res.read().decode("utf-8", errors="ignore")


def extract_script_blocks(html: str) -> list[str]:
  blocks: list[str] = []
  for match in re.finditer(r"<script[^>]*>(.*?)</script>", html, re.DOTALL | re.IGNORECASE):
    content = match.group(1).strip()
    if content:
      blocks.append(content)
  return blocks


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

  # Also attempt to parse JSON payloads embedded in scripts (e.g. Next.js state)
  for block in extract_script_blocks(html):
    if "{" not in block or "}" not in block:
      continue
    if "listing" not in block.lower() and "property" not in block.lower() and "price" not in block.lower():
      continue

    # naive extraction of JSON object literals
    for blob in re.findall(r"\{.*?\}", block, re.DOTALL):
      try:
        loaded = json.loads(blob)
      except Exception:
        continue
      if isinstance(loaded, dict):
        candidates.append(loaded)

  return candidates


def walk_dicts(node: Any) -> Iterable[dict[str, Any]]:
  if isinstance(node, dict):
    yield node
    for value in node.values():
      yield from walk_dicts(value)
  elif isinstance(node, list):
    for item in node:
      yield from walk_dicts(item)


def pick_text_field(obj: dict[str, Any], keys: list[str]) -> str:
  for key in keys:
    value = obj.get(key)
    if isinstance(value, str) and value.strip():
      return value.strip()
  return ""


def pick_number_field(obj: dict[str, Any], keys: list[str], fallback: float) -> float:
  for key in keys:
    if key in obj:
      n = to_number(obj.get(key), fallback)
      if n != fallback:
        return n
  return fallback


def parse_candidate_dict(obj: dict[str, Any], url: str, source: str, fallback_city: str, fallback_state: str) -> Listing | None:
  addr_obj = obj.get("address") if isinstance(obj.get("address"), dict) else {}

  address = pick_text_field(obj, ["address", "street", "streetAddress", "fullAddress"])
  if not address and isinstance(addr_obj, dict):
    address = pick_text_field(addr_obj, ["streetAddress", "line1", "address1"])

  city = pick_text_field(obj, ["city", "addressLocality"]) or fallback_city
  state = pick_text_field(obj, ["state", "addressRegion"]) or fallback_state
  postal_code = pick_text_field(obj, ["zip", "zipcode", "postalCode"]) or None

  if isinstance(addr_obj, dict):
    city = pick_text_field(addr_obj, ["addressLocality", "city"]) or city
    state = pick_text_field(addr_obj, ["addressRegion", "state"]) or state
    postal_code = pick_text_field(addr_obj, ["postalCode", "zip"]) or postal_code

  price = pick_number_field(obj, ["askingPrice", "listPrice", "price", "salePrice", "amount"], 0)
  rent = pick_number_field(obj, ["estimatedMonthlyRent", "monthlyRent", "rent", "rentAmount"], 0)
  offers = obj.get("offers")
  if price <= 0 and isinstance(offers, dict):
    price = pick_number_field(offers, ["price", "amount"], 0)
    if rent <= 0:
      rent = pick_number_field(offers, ["rent", "monthlyRent"], 0)

  if (price < 50000 or price > 5000000) and rent > 300:
    # Rental-first sites often have no acquisition price. Convert monthly rent to
    # a conservative implied value using target cap assumptions.
    price = (rent * 12) / 0.085

  if price < 50000 or price > 5000000:
    return None

  bedrooms = clamp(pick_number_field(obj, ["bedrooms", "beds", "numberOfBedrooms", "numberOfRooms"], 3), 0, 8)
  bathrooms = clamp(pick_number_field(obj, ["bathrooms", "baths", "numberOfBathrooms", "numberOfBathroomsTotal"], 1.5), 1, 6)
  sqft = clamp(pick_number_field(obj, ["sqft", "squareFeet", "livingArea"], 1200), 350, 15000)

  if sqft == 1200:
    floor_size = obj.get("floorSize")
    if isinstance(floor_size, dict):
      sqft = clamp(pick_number_field(floor_size, ["value"], 1200), 350, 15000)

  if not address:
    address = "Address not provided"

  estimated_rent = max(900.0, round(price * 0.0095))
  if rent > 300:
    estimated_rent = rent

  listing_id_seed = f"{source}-{city}-{state}-{address}-{price}"
  listing_id = re.sub(r"[^a-zA-Z0-9-]", "-", listing_id_seed.lower())[:90]

  return Listing(
    id=listing_id,
    sourceUrl=url,
    address=address,
    city=city,
    state=state,
    zip=postal_code,
    bedrooms=bedrooms,
    bathrooms=bathrooms,
    sqft=sqft,
    askingPrice=price,
    estimatedMonthlyRent=estimated_rent,
  )


def parse_listing_from_text(html: str, url: str, source: str, fallback_city: str, fallback_state: str) -> Listing | None:
  price_match = re.search(r"\$\s*([0-9][0-9,]{4,})", html)
  rent_match = re.search(r"\$\s*([0-9][0-9,]{2,4})\s*(?:/mo|per month|monthly)?", html, re.IGNORECASE)
  if not price_match and not rent_match:
    return None

  price = to_number(price_match.group(1), 0) if price_match else 0
  rent = to_number(rent_match.group(1), 0) if rent_match else 0
  if rent < 300 or rent > 10000:
    rent = 0
  if (price < 50000 or price > 5000000) and rent > 300:
    price = (rent * 12) / 0.085
  if price < 50000 or price > 5000000:
    return None

  address = "Address not provided"
  address_match = re.search(r"(\d{2,6}\s+[A-Za-z0-9.\-\s]+(?:St|Street|Ave|Avenue|Blvd|Lane|Ln|Rd|Road|Dr|Drive|Ct|Court)\b)", html)
  if address_match:
    address = re.sub(r"\s+", " ", address_match.group(1)).strip()

  city, state = fallback_city, fallback_state
  zip_code = None
  csz_match = re.search(r"([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})", html)
  if csz_match:
    city = csz_match.group(1).strip()
    state = csz_match.group(2).strip()
    zip_code = csz_match.group(3).strip()

  beds_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:bed|beds|br)\b", html, re.IGNORECASE)
  baths_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:bath|baths|ba)\b", html, re.IGNORECASE)
  sqft_match = re.search(r"([0-9,]{3,7})\s*(?:sq\.?\s?ft|sqft)", html, re.IGNORECASE)

  beds = clamp(to_number(beds_match.group(1), 3), 0, 8) if beds_match else 3
  baths = clamp(to_number(baths_match.group(1), 1.5), 1, 6) if baths_match else 1.5
  sqft = clamp(to_number(sqft_match.group(1), 1200), 350, 15000) if sqft_match else 1200

  estimated_rent = max(900.0, round(price * 0.0095))
  if rent > 300:
    estimated_rent = rent
  listing_id_seed = f"{source}-{city}-{state}-{address}-{price}"
  listing_id = re.sub(r"[^a-zA-Z0-9-]", "-", listing_id_seed.lower())[:90]

  return Listing(
    id=listing_id,
    sourceUrl=url,
    address=address,
    city=city,
    state=state,
    zip=zip_code,
    bedrooms=beds,
    bathrooms=baths,
    sqft=sqft,
    askingPrice=price,
    estimatedMonthlyRent=estimated_rent,
  )


def extract_links(seed_url: str, html: str, source: str) -> list[str]:
  found: list[str] = []
  for href in re.findall(r'href=["\']([^"\']+)["\']', html, re.IGNORECASE):
    abs_url = urljoin(seed_url, href)
    parsed = urlparse(abs_url)
    if parsed.scheme not in ("http", "https"):
      continue
    if source == "affordablehousing" and "affordablehousing.com" not in parsed.netloc:
      continue
    if source == "huddata" and "huddata" not in parsed.netloc and "huduser.gov" not in parsed.netloc:
      continue

    lowered = parsed.path.lower()
    if any(x in lowered for x in ["/listing", "/property", "/detail", "/home", "/homes", "homedetails"]):
      found.append(abs_url)

  # de-dup stable order
  unique: list[str] = []
  seen: set[str] = set()
  for url in found:
    if url in seen:
      continue
    seen.add(url)
    unique.append(url)
  return unique


def is_affordablehousing_detail_url(url: str) -> bool:
  parsed = urlparse(url)
  if "affordablehousing.com" not in parsed.netloc:
    return False
  path = parsed.path.strip("/")
  return bool(re.search(r"-\d+/?$", path))


def expand_affordablehousing_urls(urls: list[str], target_count: int) -> list[str]:
  if any(is_affordablehousing_detail_url(u) for u in urls):
    return urls

  expanded = list(urls)
  try:
    index_xml = fetch_html("https://www.affordablehousing.com/sitemapindex.xml")
    gz_maps = re.findall(r"<loc>\s*(https://www\\.affordablehousing\\.com/sitemapxml/propertydetails-\\d+\\.xml\\.gz)\s*</loc>", index_xml)
    for sitemap_url in gz_maps[:3]:
      raw = urlopen(sitemap_url, timeout=20).read()
      xml = gzip.decompress(raw).decode("utf-8", errors="ignore")
      locs = re.findall(r"<loc>\s*(https://www\\.affordablehousing\\.com/[^<]+)\s*</loc>", xml)
      expanded.extend(locs[: max(target_count, 30)])
      if len(expanded) >= target_count:
        break
  except Exception:
    return urls

  # stable dedupe
  unique: list[str] = []
  seen: set[str] = set()
  for url in expanded:
    if url in seen:
      continue
    seen.add(url)
    unique.append(url)
  return unique


async def fetch_html_with_optional_crawl4ai(url: str, crawler: Any, run_config: Any) -> str:
  if crawler is not None:
    try:
      page = await crawler.arun(url=url, config=run_config)
      html = getattr(page, "html", "") or ""
      if html:
        return html
    except Exception:
      pass

  return fetch_html(url)


async def scrape_urls(source: str, urls: list[str], limit: int, default_market: str) -> tuple[list[dict[str, Any]], str | None]:
  city, state = split_city_state(default_market)
  seen_ids: set[str] = set()
  results: list[dict[str, Any]] = []
  crawl_note: str | None = None

  if source == "affordablehousing":
    urls = expand_affordablehousing_urls(urls, max(limit * 3, 40))

  crawler = None
  run_config = None

  try:
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

    browser_config = BrowserConfig(headless=True, verbose=False)
    run_config = CrawlerRunConfig(word_count_threshold=0)
    crawler = AsyncWebCrawler(config=browser_config)
    await crawler.__aenter__()
    crawl_note = "crawl4ai"
  except Exception as exc:
    crawl_note = f"urllib-fallback ({exc})"

  try:
    detail_urls: list[str] = []

    for url in urls:
      if len(results) >= limit:
        break

      try:
        html = await fetch_html_with_optional_crawl4ai(url, crawler, run_config)
      except Exception:
        continue

      # Try parsing listings directly from each page
      seed_dicts = extract_json_candidates(html)
      page_added = False
      for obj in seed_dicts:
        for candidate in walk_dicts(obj):
          listing = parse_candidate_dict(candidate, url, source, city, state)
          if not listing or listing.id in seen_ids:
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
          page_added = True
          if len(results) >= limit:
            break
        if len(results) >= limit:
          break

      if not page_added and source == "affordablehousing":
        listing = parse_listing_from_text(html, url, source, city, state)
        if listing and listing.id not in seen_ids:
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

      detail_urls.extend(extract_links(url, html, source))

    # Crawl detail pages
    for durl in detail_urls[: max(limit * 3, 30)]:
      if len(results) >= limit:
        break

      try:
        html = await fetch_html_with_optional_crawl4ai(durl, crawler, run_config)
      except Exception:
        continue

      found = False
      for obj in extract_json_candidates(html):
        for candidate in walk_dicts(obj):
          listing = parse_candidate_dict(candidate, durl, source, city, state)
          if not listing or listing.id in seen_ids:
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
          found = True
          if len(results) >= limit:
            break
        if len(results) >= limit:
          break

      if not found and source == "affordablehousing":
        listing = parse_listing_from_text(html, durl, source, city, state)
        if listing and listing.id not in seen_ids:
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

    return results, crawl_note
  finally:
    if crawler is not None:
      await crawler.__aexit__(None, None, None)


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
    listings, mode = await scrape_urls(args.source, urls, max(1, args.limit), args.market)
    print(json.dumps({"listings": listings, "mode": mode}))
    return 0
  except Exception as exc:
    print(json.dumps({"listings": [], "error": str(exc)}))
    return 0


if __name__ == "__main__":
  sys.exit(asyncio.run(main()))
