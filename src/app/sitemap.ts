import { MetadataRoute } from "next";
import { getAllCostGuideSlugs } from "@/lib/cost-guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://pricemytask.com";

  const costGuideUrls = getAllCostGuideSlugs().map((slug) => ({
    url: `${baseUrl}/cost-guide/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cost-guide`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...costGuideUrls,
  ];
}
