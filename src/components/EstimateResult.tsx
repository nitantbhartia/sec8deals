import type { EstimateResponse } from "@/lib/types";
import { PriceBar } from "./PriceBar";
import { FindProCTA } from "./FindProCTA";

interface EstimateResultProps {
  estimate: EstimateResponse;
  taskDescription: string;
}

const complexityLabels: Record<string, { label: string; color: string }> = {
  simple: { label: "Simple", color: "bg-green-100 text-green-800" },
  moderate: { label: "Moderate", color: "bg-blue-100 text-blue-800" },
  complex: { label: "Complex", color: "bg-orange-100 text-orange-800" },
  specialist: { label: "Specialist Required", color: "bg-red-100 text-red-800" },
};

export function EstimateResult({
  estimate,
  taskDescription,
}: EstimateResultProps) {
  const complexity = complexityLabels[estimate.complexity] || complexityLabels.moderate;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Task Summary */}
      <div className="text-sm text-gray-500">
        Estimate for: <span className="font-medium text-gray-700">&ldquo;{taskDescription}&rdquo;</span>
      </div>

      {/* Trade Identification */}
      <div className="p-5 bg-blue-50 rounded-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-blue-600 font-medium">
              You need a
            </p>
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {estimate.trade}
            </h2>
            <p className="text-sm text-gray-600 mt-1 capitalize">
              {estimate.task_category}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${complexity.color}`}
          >
            {complexity.label}
          </span>
        </div>
      </div>

      {/* Price Range */}
      <div className="p-6 border-2 border-gray-100 rounded-xl">
        <h3 className="text-sm font-medium text-gray-500 mb-4">
          Estimated Price Range
        </h3>
        <div className="flex justify-between items-end">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Low</p>
            <p className="text-2xl font-bold text-gray-600">
              ${estimate.price_low.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Typical</p>
            <p className="text-4xl font-bold text-blue-600">
              ${estimate.price_mid.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">High</p>
            <p className="text-2xl font-bold text-gray-600">
              ${estimate.price_high.toLocaleString()}
            </p>
          </div>
        </div>

        <PriceBar
          low={estimate.price_low}
          mid={estimate.price_mid}
          high={estimate.price_high}
        />

        {estimate.region && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Adjusted for {estimate.region} pricing
          </p>
        )}
      </div>

      {/* Inclusions & Exclusions */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-5 bg-green-50 rounded-xl">
          <h3 className="text-sm font-semibold text-green-800 mb-3">
            Typically Included
          </h3>
          <ul className="space-y-2">
            {estimate.inclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <svg
                  className="w-4 h-4 text-green-600 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5 bg-gray-50 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Usually Costs Extra
          </h3>
          <ul className="space-y-2">
            {estimate.exclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <svg
                  className="w-4 h-4 text-gray-400 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Red Flags */}
      {estimate.red_flags.length > 0 && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">
            Watch Out For
          </h3>
          <ul className="space-y-2">
            {estimate.red_flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <svg
                  className="w-4 h-4 text-amber-600 mt-0.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search Terms */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-500 mb-2">
          What to search for when hiring:
        </p>
        <div className="flex flex-wrap gap-2">
          {estimate.search_terms.map((term, i) => (
            <span
              key={i}
              className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-full text-gray-700"
            >
              {term}
            </span>
          ))}
        </div>
      </div>

      {/* Find a Pro CTA */}
      <FindProCTA
        trade={estimate.trade}
        searchTerms={estimate.search_terms}
        zipCode={estimate.zip_code}
      />
    </div>
  );
}
