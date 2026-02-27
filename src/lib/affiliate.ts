const THUMBTACK_TRADE_MAP: Record<string, string> = {
  plumber: "plumbing",
  electrician: "electrical-repairs",
  "hvac technician": "heating-and-cooling",
  painter: "interior-painting",
  "exterior painter": "exterior-painting",
  roofer: "roofing",
  landscaper: "landscaping",
  "flooring installer": "flooring",
  "general handyman": "handyman",
  handyman: "handyman",
  carpenter: "carpentry",
  "appliance repair technician": "appliance-repair",
  "garage door technician": "garage-door-repair",
  "pest control technician": "pest-control",
  locksmith: "locksmith",
  "window installer": "window-installation",
  "concrete contractor": "concrete",
  "fence installer": "fence-installation",
  "gutter installer": "gutter-installation",
  "tile installer": "tile-installation",
  "drywall contractor": "drywall",
  "insulation contractor": "insulation",
};

const ANGI_TRADE_MAP: Record<string, string> = {
  plumber: "plumbing",
  electrician: "electrical",
  "hvac technician": "heating-cooling",
  painter: "interior-painting",
  "exterior painter": "exterior-painting",
  roofer: "roofing",
  landscaper: "landscaping",
  "flooring installer": "flooring",
  "general handyman": "handyman",
  handyman: "handyman",
  carpenter: "carpentry",
  "appliance repair technician": "appliance-repair",
  "garage door technician": "garage-doors",
  "pest control technician": "pest-control",
  locksmith: "locksmiths",
  "window installer": "windows",
  "concrete contractor": "concrete",
  "fence installer": "fencing",
  "gutter installer": "gutters",
  "tile installer": "tile",
  "drywall contractor": "drywall",
  "insulation contractor": "insulation",
};

export function buildThumbAffiliateUrl(
  trade: string,
  zipCode?: string | null
): string {
  const category =
    THUMBTACK_TRADE_MAP[trade.toLowerCase()] || "handyman";
  let url = `https://www.thumbtack.com/k/${category}/near-me/`;
  if (zipCode) {
    url += `?zip_code=${zipCode}`;
  }
  return url;
}

export function buildAngiAffiliateUrl(
  trade: string,
  zipCode?: string | null
): string {
  const category =
    ANGI_TRADE_MAP[trade.toLowerCase()] || "handyman";
  return `https://www.angi.com/companylist/${category}.htm`;
}
