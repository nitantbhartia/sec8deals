export type SourceName = "affordablehousing" | "huddata" | "demo";

export type RawListing = {
  id: string;
  source: SourceName;
  sourceUrl: string;
  market: string;
  city: string;
  state: string;
  zip?: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  askingPrice: number;
  estimatedMonthlyRent: number;
  hudPaymentStandard: number;
  vacancyRate: number;
  propertyTaxRate: number;
  insuranceAnnual: number;
  maintenanceRatio: number;
  neighborhoodGrade: number; // 0-100
  updatedAt: string;
};

export type DealMetrics = {
  monthlyRentUsed: number;
  annualVacancyLoss: number;
  annualTaxExpense: number;
  annualMaintenanceExpense: number;
  expenseRatio: number;
  annualGrossRent: number;
  annualOperatingExpenses: number;
  annualNetOperatingIncome: number;
  monthlyDebtService: number;
  annualDebtService: number;
  downPayment: number;
  financedPrincipal: number;
  totalCashInvested: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCashReturn: number;
  debtServiceCoverageRatio: number;
  breakEvenOccupancy: number;
  rentToHudRatio: number;
  grossRentMultiplier: number;
  marketHealth: number;
};

export type DealScore = {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  reasons: string[];
};

export type ScoredDeal = RawListing & {
  metrics: DealMetrics;
  viability: DealScore;
};

export type MarketSummary = {
  market: string;
  city: string;
  state: string;
  dealCount: number;
  averageScore: number;
  averageCapRate: number;
  averageCashOnCash: number;
  topGradeShare: number;
};

export type DealsDataset = {
  generatedAt: string;
  sourceHealth: Record<SourceName, "ok" | "degraded" | "disabled">;
  deals: ScoredDeal[];
  topMarkets: MarketSummary[];
};

export type SourceRunResult = {
  source: SourceName;
  listings: RawListing[];
  status: "ok" | "degraded" | "disabled";
};

export type SourceQuery = {
  markets: string[];
  limitPerMarket: number;
};
