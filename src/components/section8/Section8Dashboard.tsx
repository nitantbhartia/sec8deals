"use client";

import { useMemo, useState, useTransition } from "react";
import type { DealsDataset, ScoredDeal } from "@/lib/section8/types";

type Props = {
  initialData: DealsDataset;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function round(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function shortUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "listing";
  }
}

function gradeClasses(grade: ScoredDeal["viability"]["grade"]) {
  switch (grade) {
    case "A":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "B":
      return "bg-lime-100 text-lime-700 border-lime-200";
    case "C":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "D":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-rose-100 text-rose-700 border-rose-200";
  }
}

export function Section8Dashboard({ initialData }: Props) {
  const [data, setData] = useState<DealsDataset>(initialData);
  const [isRefreshing, startRefresh] = useTransition();
  const [isEmailing, startEmail] = useTransition();
  const [emailStatus, setEmailStatus] = useState<string>("");

  const summary = useMemo(() => {
    const totalDeals = data.deals.length;
    const avgScore = totalDeals
      ? Math.round(data.deals.reduce((sum, d) => sum + d.viability.score, 0) / totalDeals)
      : 0;
    const topGradeCount = data.deals.filter((d) => d.viability.grade === "A" || d.viability.grade === "B").length;
    const topGradeShare = totalDeals ? Math.round((topGradeCount / totalDeals) * 100) : 0;

    return { totalDeals, avgScore, topGradeShare };
  }, [data]);

  function refreshNow() {
    setEmailStatus("");
    startRefresh(async () => {
      await fetch("/api/section8/run", { method: "POST" });
      const response = await fetch("/api/section8/deals", { cache: "no-store" });
      const next = (await response.json()) as DealsDataset;
      setData(next);
    });
  }

  function sendEmail() {
    setEmailStatus("");
    startEmail(async () => {
      const response = await fetch("/api/section8/email", { method: "POST" });
      const result = (await response.json()) as { sent: boolean; reason?: string };
      if (result.sent) {
        setEmailStatus("Top-10 digest sent.");
      } else {
        setEmailStatus(result.reason ?? "Email not sent.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_15%,#dbeafe_0%,#eff6ff_28%,#f8fafc_70%)] px-4 py-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-xl shadow-blue-100/40 backdrop-blur md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Section 8 Deal Lab</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Daily HUD Viability Dashboard
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">
                Ranked Section 8 opportunities by weighted metrics: cap rate, cash-on-cash return, annual cash flow,
                GRM, and market stability.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={refreshNow}
                disabled={isRefreshing}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isRefreshing ? "Refreshing..." : "Run Now"}
              </button>
              <button
                onClick={sendEmail}
                disabled={isEmailing}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50"
              >
                {isEmailing ? "Sending..." : "Email Top 10"}
              </button>
            </div>
          </div>

          {emailStatus ? <p className="mt-4 text-sm text-slate-600">{emailStatus}</p> : null}

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Last Refresh</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{new Date(data.generatedAt).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Deals Scored</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{summary.totalDeals}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Average Score</p>
              <p className="mt-1 text-2xl font-black text-blue-700">{summary.avgScore}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">A/B Grade Share</p>
              <p className="mt-1 text-2xl font-black text-emerald-700">{summary.topGradeShare}%</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(data.sourceHealth).map(([source, status]) => (
              <span
                key={source}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                {source}: {status}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_1.95fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Top 10 Markets</h2>
            <p className="mt-1 text-sm text-slate-500">Markets ranked by average viability score.</p>
            <div className="mt-4 space-y-3">
              {data.topMarkets.slice(0, 10).map((market, idx) => (
                <article key={market.market} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">#{idx + 1}</p>
                      <p className="font-semibold text-slate-900">{market.market}</p>
                      <p className="text-xs text-slate-500">{market.dealCount} scored deals</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{Math.round(market.averageScore)}</p>
                      <p className="text-xs text-slate-500">avg score</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Cap</p>
                      <p className="font-semibold text-slate-700">{pct(market.averageCapRate)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">CoC</p>
                      <p className="font-semibold text-slate-700">{pct(market.averageCashOnCash)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">A/B</p>
                      <p className="font-semibold text-slate-700">{Math.round(market.topGradeShare * 100)}%</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Top 10 Deals</h2>
                <p className="mt-1 text-sm text-slate-500">Best opportunities within top-ranked markets.</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Property</th>
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Specs</th>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Cash Flow</th>
                    <th className="px-3 py-2">Cap</th>
                    <th className="px-3 py-2">CoC</th>
                    <th className="px-3 py-2">DSCR</th>
                    <th className="px-3 py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deals.slice(0, 10).map((deal) => (
                    <tr key={deal.id} className="rounded-xl bg-slate-50">
                      <td className="px-3 py-3 font-semibold text-slate-900">{deal.address}</td>
                      <td className="px-3 py-3 text-slate-700">{deal.market}</td>
                      <td className="px-3 py-3 text-slate-700">
                        {deal.bedrooms} bd / {deal.bathrooms} ba {deal.sqft ? `/ ${Math.round(deal.sqft)} sqft` : ""}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${gradeClasses(deal.viability.grade)}`}>
                          {deal.viability.grade} {deal.viability.score}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{money(deal.askingPrice)}</td>
                      <td className="px-3 py-3 text-slate-700">{money(deal.metrics.annualCashFlow)}</td>
                      <td className="px-3 py-3 text-slate-700">{pct(deal.metrics.capRate)}</td>
                      <td className="px-3 py-3 text-slate-700">{pct(deal.metrics.cashOnCashReturn)}</td>
                      <td className="px-3 py-3 text-slate-700">{round(deal.metrics.debtServiceCoverageRatio)}</td>
                      <td className="px-3 py-3">
                        <a href={deal.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700">
                          {shortUrl(deal.sourceUrl)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Listing Intelligence and Calculations</h2>
          <p className="mt-1 text-sm text-slate-500">Full underwriting context for top-ranked deals.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.deals.slice(0, 6).map((deal) => (
              <article key={`details-${deal.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{deal.address}</p>
                    <p className="text-xs text-slate-500">{deal.market}</p>
                  </div>
                  <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${gradeClasses(deal.viability.grade)}`}>
                    {deal.viability.grade} {deal.viability.score}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <p className="text-slate-500">Listing URL</p>
                  <a href={deal.sourceUrl} target="_blank" rel="noreferrer" className="truncate text-right font-semibold text-blue-600 hover:text-blue-700">
                    {deal.sourceUrl}
                  </a>
                  <p className="text-slate-500">Source / ID</p>
                  <p className="text-right font-semibold text-slate-700">{deal.source} / {deal.id}</p>
                  <p className="text-slate-500">Updated</p>
                  <p className="text-right font-semibold text-slate-700">{new Date(deal.updatedAt).toLocaleString()}</p>
                  <p className="text-slate-500">Asking / HUD Standard</p>
                  <p className="text-right font-semibold text-slate-700">{money(deal.askingPrice)} / {money(deal.hudPaymentStandard)}</p>
                  <p className="text-slate-500">Rent Used / Rent-to-HUD</p>
                  <p className="text-right font-semibold text-slate-700">{money(deal.metrics.monthlyRentUsed)} / {pct(deal.metrics.rentToHudRatio)}</p>
                  <p className="text-slate-500">NOI / Debt Service</p>
                  <p className="text-right font-semibold text-slate-700">{money(deal.metrics.annualNetOperatingIncome)} / {money(deal.metrics.annualDebtService)}</p>
                  <p className="text-slate-500">Cash Flow (Monthly / Annual)</p>
                  <p className="text-right font-semibold text-slate-700">{money(deal.metrics.monthlyCashFlow)} / {money(deal.metrics.annualCashFlow)}</p>
                  <p className="text-slate-500">Cap / CoC / DSCR</p>
                  <p className="text-right font-semibold text-slate-700">{pct(deal.metrics.capRate)} / {pct(deal.metrics.cashOnCashReturn)} / {round(deal.metrics.debtServiceCoverageRatio)}</p>
                  <p className="text-slate-500">Break-Even / Expense Ratio</p>
                  <p className="text-right font-semibold text-slate-700">{pct(deal.metrics.breakEvenOccupancy)} / {pct(deal.metrics.expenseRatio)}</p>
                  <p className="text-slate-500">Vacancy / Taxes / Maintenance</p>
                  <p className="text-right font-semibold text-slate-700">{money(deal.metrics.annualVacancyLoss)} / {money(deal.metrics.annualTaxExpense)} / {money(deal.metrics.annualMaintenanceExpense)}</p>
                </div>

                <p className="mt-3 text-xs text-slate-600">
                  {deal.viability.reasons.join(" • ")}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
