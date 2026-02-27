import { Metadata } from "next";
import Link from "next/link";
import { getAllCostGuides } from "@/lib/cost-guides";

export const metadata: Metadata = {
  title: "Home Service Cost Guides",
  description:
    "Free cost guides for plumbing, electrical, HVAC, painting, roofing, and more. Know what your home project should cost before you hire.",
};

export default function CostGuideIndexPage() {
  const guides = getAllCostGuides();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Home Service Cost Guides</h1>
      <p className="text-gray-600 mb-8">
        Comprehensive pricing guides to help you budget for your next home
        project.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/cost-guide/${guide.slug}`}
            className="block p-6 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <h2 className="font-semibold text-gray-900 mb-2">{guide.title}</h2>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {guide.hero_summary}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-blue-600 font-semibold text-sm">
                ${guide.price_range.low.toLocaleString()} - $
                {guide.price_range.high.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 capitalize">
                {guide.trade}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-xl font-bold mb-2">
          Need a price for a specific task?
        </h2>
        <p className="text-gray-500 mb-4">
          Get a personalized AI-powered estimate in seconds.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Get Free Estimate
        </Link>
      </div>
    </div>
  );
}
