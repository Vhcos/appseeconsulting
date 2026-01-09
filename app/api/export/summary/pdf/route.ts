import { NextRequest } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

function getBaseUrl(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  // fallback local
  const host = req.headers.get("host") || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") || "es";
  const engagementId = url.searchParams.get("engagementId");
  const period = url.searchParams.get("period") || "";
  const accountId = url.searchParams.get("accountId") || "";

  if (!engagementId) {
    return new Response("Missing engagementId", { status: 400 });
  }

  const base = getBaseUrl(req);

  const qs = new URLSearchParams();
  if (period) qs.set("period", period);
  if (accountId) qs.set("accountId", accountId);

  const printUrl = `${base}/${locale}/wizard/${engagementId}/check-in/summary/print?${qs.toString()}`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
  });

  try {
    const page = await browser.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "18mm", bottom: "18mm", left: "18mm" },
    });

    const filename = `checkin-summary_${engagementId}_${period || "period"}.pdf`;

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await browser.close();
  }
}
