import { buildThumbAffiliateUrl, buildAngiAffiliateUrl } from "@/lib/affiliate";

interface FindProCTAProps {
  trade: string;
  searchTerms: string[];
  zipCode?: string | null;
}

export function FindProCTA({ trade, searchTerms, zipCode }: FindProCTAProps) {
  const thumbtackUrl = buildThumbAffiliateUrl(trade, zipCode);
  const angiUrl = buildAngiAffiliateUrl(trade, zipCode);

  return (
    <div className="p-6 bg-gray-50 rounded-xl">
      <h3 className="font-semibold text-lg text-gray-900 mb-2">
        Ready to hire a pro?
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Find vetted <span className="capitalize">{trade}s</span> in your area.
        Search for: {searchTerms.join(", ")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={thumbtackUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex-1 text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          Find pros on Thumbtack
        </a>
        <a
          href={angiUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex-1 text-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors"
        >
          Find pros on Angi
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        * We may earn a commission from partner links. This does not affect our
        estimates.
      </p>
    </div>
  );
}
