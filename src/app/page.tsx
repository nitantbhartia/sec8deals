import Link from "next/link";

export default function HomePage() {
  return (
    <section className="min-h-[78vh] bg-[radial-gradient(circle_at_0%_0%,#dbeafe_0%,#f8fafc_30%,#f8fafc_100%)] px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-700">Section 8 Intelligence</p>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
          Find high-viability Section 8 deals every morning.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Sec8Deals sources properties, scores viability from A to F, ranks top markets, and supports optional daily
          top-10 email digests.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/section8"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
          <a
            href="/api/section8/deals"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            View JSON API
          </a>
        </div>
      </div>
    </section>
  );
}
