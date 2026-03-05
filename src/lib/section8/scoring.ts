import type { DealMetrics, DealScore, RawListing, ScoredDeal } from "./types";

const ASSUMED_DOWN_PAYMENT_RATIO = 0.25;
const ASSUMED_INTEREST_RATE = 0.072;
const ASSUMED_LOAN_YEARS = 30;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function monthlyMortgagePayment(principal: number, annualRate: number, years: number) {
  const r = annualRate / 12;
  const n = years * 12;
  if (principal <= 0 || r <= 0 || n <= 0) {
    return 0;
  }

  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

function gradeFromScore(score: number): DealScore["grade"] {
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 55) return "D";
  return "F";
}

function toPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function computeMetrics(deal: RawListing): DealMetrics {
  const rentUsed = Math.min(deal.estimatedMonthlyRent, deal.hudPaymentStandard);
  const annualGrossRent = rentUsed * 12;
  const vacancyLoss = annualGrossRent * clamp(deal.vacancyRate, 0, 0.25);
  const taxExpense = deal.askingPrice * deal.propertyTaxRate;
  const maintenanceExpense = annualGrossRent * clamp(deal.maintenanceRatio, 0.05, 0.2);
  const annualOperatingExpenses = vacancyLoss + taxExpense + maintenanceExpense + deal.insuranceAnnual;
  const annualNetOperatingIncome = annualGrossRent - annualOperatingExpenses;

  const downPayment = deal.askingPrice * ASSUMED_DOWN_PAYMENT_RATIO;
  const financedPrincipal = deal.askingPrice - downPayment;
  const monthlyDebtService = monthlyMortgagePayment(financedPrincipal, ASSUMED_INTEREST_RATE, ASSUMED_LOAN_YEARS);
  const annualDebtService = monthlyDebtService * 12;
  const annualCashFlow = annualNetOperatingIncome - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  const capRate = deal.askingPrice > 0 ? annualNetOperatingIncome / deal.askingPrice : 0;
  const cashOnCashReturn = downPayment > 0 ? annualCashFlow / downPayment : 0;
  const grossRentMultiplier = annualGrossRent > 0 ? deal.askingPrice / annualGrossRent : 99;
  const debtServiceCoverageRatio = annualDebtService > 0 ? annualNetOperatingIncome / annualDebtService : 0;
  const breakEvenOccupancy = annualGrossRent > 0 ? (annualOperatingExpenses + annualDebtService) / annualGrossRent : 0;
  const rentToHudRatio = deal.hudPaymentStandard > 0 ? rentUsed / deal.hudPaymentStandard : 0;
  const expenseRatio = annualGrossRent > 0 ? annualOperatingExpenses / annualGrossRent : 0;

  const vacancyHealth = clamp(1 - deal.vacancyRate / 0.15, 0, 1);
  const neighborhoodHealth = clamp(deal.neighborhoodGrade / 100, 0, 1);
  const marketHealth = (vacancyHealth * 0.6 + neighborhoodHealth * 0.4) * 100;

  return {
    monthlyRentUsed: rentUsed,
    annualVacancyLoss: vacancyLoss,
    annualTaxExpense: taxExpense,
    annualMaintenanceExpense: maintenanceExpense,
    expenseRatio,
    annualGrossRent,
    annualOperatingExpenses,
    annualNetOperatingIncome,
    monthlyDebtService,
    annualDebtService,
    downPayment,
    financedPrincipal,
    totalCashInvested: downPayment,
    annualCashFlow,
    monthlyCashFlow,
    capRate,
    cashOnCashReturn,
    debtServiceCoverageRatio,
    breakEvenOccupancy,
    rentToHudRatio,
    grossRentMultiplier,
    marketHealth,
  };
}

function computeScore(metrics: DealMetrics): DealScore {
  const normalizedCapRate = clamp((metrics.capRate - 0.03) / 0.09, 0, 1) * 100;
  const normalizedCoC = clamp((metrics.cashOnCashReturn - 0.02) / 0.16, 0, 1) * 100;
  const normalizedCashFlow = clamp((metrics.annualCashFlow + 3000) / 12000, 0, 1) * 100;
  const normalizedGRM = clamp((16 - metrics.grossRentMultiplier) / 10, 0, 1) * 100;

  const weightedScore =
    normalizedCapRate * 0.3 +
    normalizedCoC * 0.25 +
    normalizedCashFlow * 0.2 +
    normalizedGRM * 0.1 +
    metrics.marketHealth * 0.15;

  const score = Math.round(clamp(weightedScore, 0, 100));
  const grade = gradeFromScore(score);

  const reasons: string[] = [];
  if (metrics.capRate >= 0.08) reasons.push(`Strong cap rate (${toPct(metrics.capRate)})`);
  if (metrics.cashOnCashReturn >= 0.1) reasons.push(`Healthy cash-on-cash (${toPct(metrics.cashOnCashReturn)})`);
  if (metrics.annualCashFlow > 0) reasons.push(`Positive annual cash flow ($${Math.round(metrics.annualCashFlow).toLocaleString()})`);
  if (metrics.marketHealth >= 70) reasons.push(`Resilient market profile (${Math.round(metrics.marketHealth)}/100)`);
  if (reasons.length === 0) reasons.push("Weak returns under current assumptions");

  return { score, grade, reasons };
}

export function scoreDeal(deal: RawListing): ScoredDeal {
  const metrics = computeMetrics(deal);
  const viability = computeScore(metrics);
  return { ...deal, metrics, viability };
}

export function rankDeals(deals: ScoredDeal[]): ScoredDeal[] {
  return [...deals].sort((a, b) => {
    if (b.viability.score !== a.viability.score) {
      return b.viability.score - a.viability.score;
    }
    return b.metrics.annualCashFlow - a.metrics.annualCashFlow;
  });
}
