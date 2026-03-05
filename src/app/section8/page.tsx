import type { Metadata } from "next";
import { Section8Dashboard } from "@/components/section8/Section8Dashboard";
import { getDealsDataset } from "@/lib/section8/service";

export const metadata: Metadata = {
  title: "Section 8 Dashboard",
  description: "Daily-ranked Section 8 opportunities and market viability.",
};

export default async function Section8Page() {
  const dataset = await getDealsDataset();
  return <Section8Dashboard initialData={dataset} />;
}
