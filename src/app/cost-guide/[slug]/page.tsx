import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCostGuideSlugs, getCostGuide } from "@/lib/cost-guides";

export function generateStaticParams() {
  return getAllCostGuideSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const guide = getCostGuide(slug);
    return {
      title: guide.title,
      description: guide.meta_description,
      openGraph: {
        title: guide.title,
        description: guide.meta_description,
      },
    };
  } catch {
    return { title: "Cost Guide Not Found" };
  }
}

export default async function CostGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let guide;
  try {
    guide = getCostGuide(slug);
  } catch {
    notFound();
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.meta_description,
    dateModified: guide.last_updated,
    publisher: {
      "@type": "Organization",
      name: "PriceMyTask",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 py-12">
        <nav className="mb-6 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Home
          </Link>
          {" / "}
          <Link href="/cost-guide" className="hover:text-gray-600">
            Cost Guides
          </Link>
          {" / "}
          <span className="text-gray-600">{guide.title}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold mb-4">{guide.title}</h1>
        <p className="text-lg text-gray-600 mb-2">{guide.hero_summary}</p>
        <p className="text-xs text-gray-400 mb-8">
          Last updated: {guide.last_updated}
        </p>

        {/* Price Range Card */}
        <div className="p-6 border-2 border-gray-100 rounded-xl mb-8">
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Average Cost Range
          </h2>
          <div className="flex justify-between items-end">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Low</p>
              <p className="text-2xl font-bold text-gray-600">
                ${guide.price_range.low.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">Typical</p>
              <p className="text-4xl font-bold text-blue-600">
                ${guide.price_range.mid.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">High</p>
              <p className="text-2xl font-bold text-gray-600">
                ${guide.price_range.high.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="h-3 bg-gradient-to-r from-green-400 via-blue-500 to-orange-400 rounded-full mt-4" />
          <p className="text-xs text-gray-400 mt-2 text-center">
            {guide.price_range.unit}
          </p>
        </div>

        {/* Content Sections */}
        {guide.sections.map((section, i) => (
          <section key={i} className="my-8">
            <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {section.content.split("\n").map((line, j) => {
                if (line.startsWith("- **")) {
                  const match = line.match(/^- \*\*(.+?)\*\*:?\s*(.*)$/);
                  if (match) {
                    return (
                      <div key={j} className="flex gap-2 mb-2 ml-4">
                        <span className="text-blue-500 mt-1 shrink-0">
                          &bull;
                        </span>
                        <span>
                          <strong>{match[1]}</strong>
                          {match[2] ? `: ${match[2]}` : ""}
                        </span>
                      </div>
                    );
                  }
                }
                if (line.startsWith("- ")) {
                  return (
                    <div key={j} className="flex gap-2 mb-2 ml-4">
                      <span className="text-blue-500 mt-1 shrink-0">
                        &bull;
                      </span>
                      <span>{line.slice(2)}</span>
                    </div>
                  );
                }
                if (line.trim() === "") return <br key={j} />;
                return (
                  <p key={j} className="mb-3">
                    {line}
                  </p>
                );
              })}
            </div>
          </section>
        ))}

        {/* FAQ Section */}
        <section className="my-12">
          <h2 className="text-2xl font-semibold mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {guide.faq.map((item, i) => (
              <details
                key={i}
                className="group border border-gray-100 rounded-xl overflow-hidden"
              >
                <summary className="cursor-pointer p-4 font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                  {item.question}
                </summary>
                <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-12 p-8 bg-blue-50 rounded-2xl text-center">
          <h2 className="text-xl font-bold mb-2">
            Get a personalized estimate
          </h2>
          <p className="text-gray-600 mb-4">
            Describe your specific task for an AI-powered price estimate
            tailored to your location.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Get Free Estimate
          </Link>
        </div>

        {/* Related Guides */}
        {guide.related_guides.length > 0 && (
          <section className="mt-12">
            <h3 className="text-lg font-semibold mb-4">Related Cost Guides</h3>
            <div className="flex flex-wrap gap-3">
              {guide.related_guides.map((relatedSlug) => (
                <Link
                  key={relatedSlug}
                  href={`/cost-guide/${relatedSlug}`}
                  className="px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {relatedSlug
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
