import type { ScoredDeal } from "./types";

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildHtml(deals: ScoredDeal[]) {
  const rows = deals
    .map(
      (deal, index) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${index + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${deal.address}, ${deal.market}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${deal.viability.grade} (${deal.viability.score})</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${money(deal.askingPrice)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${money(deal.metrics.annualCashFlow)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${pct(deal.metrics.capRate)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;"><a href="${deal.sourceUrl}">Source</a></td>
      </tr>`,
    )
    .join("");

  return `
  <div style="font-family: Arial, sans-serif; padding: 20px; color: #111827;">
    <h2 style="margin:0 0 8px;">Section 8 Daily Deal Digest</h2>
    <p style="margin:0 0 16px;color:#6b7280;">Top 10 deals from top markets by weighted viability score.</p>
    <table style="width:100%; border-collapse: collapse; font-size:14px;">
      <thead>
        <tr style="text-align:left;background:#f3f4f6;">
          <th style="padding:8px;">#</th>
          <th style="padding:8px;">Property</th>
          <th style="padding:8px;">Grade</th>
          <th style="padding:8px;">Price</th>
          <th style="padding:8px;">Annual Cash Flow</th>
          <th style="padding:8px;">Cap Rate</th>
          <th style="padding:8px;">Link</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export async function sendDigestEmail(deals: ScoredDeal[]) {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.SECTION8_EMAIL_FROM;
  const to = process.env.SECTION8_EMAIL_TO;

  if (!resendKey || !from || !to) {
    return { sent: false, reason: "Email env vars missing" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Section 8 Top Deals - ${new Date().toLocaleDateString("en-US")}`,
      html: buildHtml(deals),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { sent: false, reason: `Resend failed: ${response.status} ${text}` };
  }

  return { sent: true };
}
