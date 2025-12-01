#!/usr/bin/env tsx
/**
 * ETF Holdings Fetchr Script
 *
 * Usage:
 *   npm run fetch QQQ SPY VTI
 *   npm run fetch --all  # Fetch all popular ETFs from lib/etf-list.ts
 */

import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";

interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
  shares?: number;
}

interface ETFProfile {
  name?: string;
  issuer?: string;
  brand?: string;
  structure?: string;
  expense_ratio?: number;
  inception_date?: string;
  index_tracked?: string;
  home_page?: string;
  category?: string;
  asset_class?: string;
  asset_class_size?: string;
  asset_class_style?: string;
  sector_general?: string;
  sector_specific?: string;
  region_general?: string;
  region_specific?: string;
  aum?: number;
  shares_outstanding?: number;
}

interface ETFData {
  symbol: string;
  name?: string;
  last_updated: string;
  profile?: ETFProfile;
  holdings: ETFHolding[];
}

interface IndexData {
  etfs: Array<{
    symbol: string;
    name?: string;
    issuer?: string;
    expense_ratio?: number;
    aum?: number;
    last_updated: string;
  }>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const ETFS_DIR = path.join(DATA_DIR, "etfs");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(ETFS_DIR)) {
  fs.mkdirSync(ETFS_DIR, { recursive: true });
}

function extractProfileData($: any): ETFProfile {
  const profile: ETFProfile = {};

  // Extract ETF name from page title or h1
  const pageTitle = $("title").text();
  const h1Text = $("h1").first().text().trim();

  // Try to extract name from title (format: "SYMBOL - Name | ETF Database")
  const titleMatch = pageTitle.match(/^([A-Z]+)\s*-\s*(.+?)\s*\|/);
  if (titleMatch) {
    profile.name = titleMatch[2].trim();
  } else if (h1Text) {
    // Fallback to h1 text, remove ticker and clean up
    // Handle formats like "SPY\nSPDR S&P 500" or "SPY - SPDR S&P 500"
    const cleanName = h1Text
      .replace(/^[A-Z]+[\s\n-]+/, "") // Remove ticker at start
      .replace(/\n/g, " ") // Replace newlines with spaces
      .trim();
    if (cleanName) {
      profile.name = cleanName;
    }
  }

  // Extract from Vitals section
  $(".ticker-assets .row").each((_: any, row: any) => {
    const $row = $(row);
    const label = $row.find("span:first-child").text().trim();
    const value = $row.find("span:last-child").text().trim();

    switch (label) {
      case "Issuer":
        profile.issuer = value;
        break;
      case "Brand":
        profile.brand = value;
        break;
      case "Structure":
        profile.structure = value;
        break;
      case "Expense Ratio":
        const expenseMatch = value.match(/(\d+\.?\d*)%/);
        if (expenseMatch) {
          profile.expense_ratio = parseFloat(expenseMatch[1]) / 100;
        }
        break;
      case "Inception":
        profile.inception_date = value;
        break;
      case "Index Tracked":
        profile.index_tracked = value;
        break;
    }
  });

  // Extract home page
  const homePageLink = $(
    '.ticker-assets .row:contains("ETF Home Page") a'
  ).attr("href");
  if (homePageLink) {
    profile.home_page = homePageLink;
  }

  // Extract ETF Database Themes
  $('h3.h4:contains("ETF Database Themes")')
    .parent()
    .find(".ticker-assets .row")
    .each((_: any, row: any) => {
      const $row = $(row);
      const label = $row.find("span:first-child").text().trim();
      const value = $row.find("span:last-child").text().trim();

      switch (label) {
        case "Category":
          profile.category = value;
          break;
        case "Asset Class":
          profile.asset_class = value;
          break;
        case "Asset Class Size":
          profile.asset_class_size = value;
          break;
        case "Asset Class Style":
          profile.asset_class_style = value;
          break;
        case "Sector (General)":
          profile.sector_general = value;
          break;
        case "Sector (Specific)":
          profile.sector_specific = value;
          break;
        case "Region (General)":
          profile.region_general = value;
          break;
        case "Region (Specific)":
          profile.region_specific = value;
          break;
      }
    });

  // Extract trading data
  $(".trading-data li, ul.list-unstyled li").each((_: any, li: any) => {
    const $li = $(li);
    const label = $li.find("span:first-child").text().trim();
    const value = $li.find("span:last-child").text().trim();

    switch (label) {
      case "AUM":
        const aumMatch = value.match(/\$?([\d,]+\.?\d*)\s*([MBK])?/);
        if (aumMatch) {
          let aum = parseFloat(aumMatch[1].replace(/,/g, ""));
          const unit = aumMatch[2];
          if (unit === "M") aum *= 1000000;
          if (unit === "B") aum *= 1000000000;
          if (unit === "K") aum *= 1000;
          profile.aum = Math.round(aum);
        }
        break;
      case "Shares":
        const sharesMatch = value.match(/([\d,]+\.?\d*)\s*([MBK])?/);
        if (sharesMatch) {
          let shares = parseFloat(sharesMatch[1].replace(/,/g, ""));
          const unit = sharesMatch[2];
          if (unit === "M") shares *= 1000000;
          if (unit === "B") shares *= 1000000000;
          if (unit === "K") shares *= 1000;
          profile.shares_outstanding = Math.round(shares);
        }
        break;
    }
  });

  return profile;
}

async function fetchETF(ticker: string): Promise<ETFData | null> {
  console.log(`\nScraping ${ticker}...`);

  // Try to find Chrome on macOS
  const chromePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];

  let executablePath: string | undefined = undefined;
  for (const path of chromePaths) {
    try {
      const fs = await import("fs");
      if (fs.existsSync(path)) {
        executablePath = path;
        console.log(`  Using browser: ${path}`);
        break;
      }
    } catch (e) {
      // Continue checking
    }
  }

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath, // Use system Chrome if found
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = `https://etfdb.com/etf/${ticker.toUpperCase()}/#holdings`;
    console.log(`  Loading ${url}...`);

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    // Try to click holdings tab
    try {
      const holdingsTab = await page.$(
        'a[href*="#holdings"], button[data-tab="holdings"], .tab-holdings'
      );
      if (holdingsTab) {
        await holdingsTab.click();
        await page.waitForTimeout(1000);
      }
    } catch {}

    const pageTitle = await page.title();
    if (
      pageTitle.toLowerCase().includes("404") ||
      pageTitle.toLowerCase().includes("not found")
    ) {
      console.log(`  ✗ ETF ${ticker} not found`);
      await browser.close();
      return null;
    }

    const html = await page.content();
    await browser.close();

    // Parse HTML
    const cheerioModule = await import("cheerio");
    const cheerio =
      "default" in cheerioModule ? cheerioModule.default : cheerioModule;
    const $ = cheerio.load(html);

    const profile = extractProfileData($);
    const holdings: ETFHolding[] = [];

    const holdingsTable = $('#etf-holdings, table[id="etf-holdings"]');

    if (holdingsTable.length > 0) {
      holdingsTable.find("tbody tr").each((_, row) => {
        const $row = $(row);
        const cells = $row.find("td");

        if (cells.length >= 3) {
          const symbolCell = $(cells[0]);
          const nameCell = $(cells[1]);
          const weightCell = $(cells[2]);

          let symbol =
            symbolCell.find("a").text().trim() || symbolCell.text().trim();
          const name = nameCell.text().trim();
          const weightText = weightCell.text().trim();
          const weight = parseFloat(weightText.replace(/[%,]/g, "")) || 0;

          // Handle bonds and other holdings without stock symbols
          if (!symbol || symbol === "N/A" || symbol.length === 0) {
            // Use the holding name as the symbol for bonds/commodities
            // Extract a meaningful identifier from the name
            symbol = name
              .substring(0, 50)
              .replace(/[^a-zA-Z0-9\s-]/g, "")
              .trim();
          }

          if (symbol && name && weight > 0) {
            holdings.push({
              symbol: symbol.toUpperCase(),
              name: name,
              weight,
            });
          }
        }
      });
    }

    const uniqueHoldings = holdings.filter(
      (holding, index, self) =>
        index === self.findIndex((h) => h.symbol === holding.symbol)
    );

    const sortedHoldings = uniqueHoldings.sort((a, b) => b.weight - a.weight);

    console.log(`  ✓ Found ${sortedHoldings.length} holdings`);

    return {
      symbol: ticker.toUpperCase(),
      name: profile.name,
      last_updated: new Date().toISOString(),
      profile,
      holdings: sortedHoldings,
    };
  } catch (error) {
    await browser.close();
    console.error(`  ✗ Error scraping ${ticker}:`, error);
    return null;
  }
}

function saveETFData(etfData: ETFData): void {
  const filePath = path.join(ETFS_DIR, `${etfData.symbol}.json`);
  fs.writeFileSync(filePath, JSON.stringify(etfData, null, 2));
  console.log(`  ✓ Saved to ${filePath}`);
}

function updateIndex(etfData: ETFData): void {
  let indexData: IndexData = { etfs: [] };

  if (fs.existsSync(INDEX_FILE)) {
    indexData = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
  }

  const existingIndex = indexData.etfs.findIndex(
    (e) => e.symbol === etfData.symbol
  );

  const indexEntry = {
    symbol: etfData.symbol,
    name: etfData.profile?.name || etfData.name,
    issuer: etfData.profile?.issuer,
    expense_ratio: etfData.profile?.expense_ratio,
    aum: etfData.profile?.aum,
    last_updated: etfData.last_updated,
  };

  if (existingIndex >= 0) {
    indexData.etfs[existingIndex] = indexEntry;
  } else {
    indexData.etfs.push(indexEntry);
  }

  indexData.etfs.sort((a, b) => a.symbol.localeCompare(b.symbol));

  fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2));
  console.log(`  ✓ Updated index`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
ETF Holdings Fetchr

Usage:
  npm run fetch QQQ SPY VTI        # Fetch specific ETFs
  npm run fetch --all               # Fetch popular ETFs from lib/etf-list.ts

Options:
  -h, --help    Show this help message
    `);
    process.exit(0);
  }

  let tickers: string[] = [];

  if (args.includes("--all")) {
    // Load popular ETFs from lib/etf-list.ts
    try {
      const etfListModule = await import("../lib/etf-list.js");
      const popularETFs = etfListModule.POPULAR_ETFS || [];
      tickers = popularETFs.map((etf: any) => etf.symbol);
      console.log(`Fetching ${tickers.length} popular ETFs...`);
    } catch (error) {
      console.error("Error loading ETF list:", error);
      process.exit(1);
    }
  } else {
    tickers = args.map((t) => t.toUpperCase());
  }

  console.log(`\nStarting fetch for: ${tickers.join(", ")}\n`);

  for (const ticker of tickers) {
    const etfData = await fetchETF(ticker);

    if (etfData) {
      saveETFData(etfData);
      updateIndex(etfData);
    }

    // Add delay between requests to be respectful
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\n✓ Scraping complete!`);
  console.log(`\nData saved to: ${ETFS_DIR}`);
  console.log(`Index updated: ${INDEX_FILE}`);
}

main().catch(console.error);
