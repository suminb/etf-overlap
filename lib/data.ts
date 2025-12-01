import * as fs from "fs";
import * as path from "path";

export interface ETFHoldingInsert {
  symbol: string;
  name: string;
  weight: number;
  shares?: number;
}

export interface ETFProfile {
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

export interface ETFData {
  symbol: string;
  name?: string;
  last_updated: string;
  profile?: ETFProfile;
  holdings: ETFHoldingInsert[];
}

export interface IndexEntry {
  symbol: string;
  name?: string;
  issuer?: string;
  expense_ratio?: number;
  aum?: number;
  last_updated: string;
}

export interface IndexData {
  etfs: IndexEntry[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const ETFS_DIR = path.join(DATA_DIR, "etfs");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

/**
 * Get ETF holdings from static JSON file
 * @param ticker ETF symbol
 * @returns Holdings array or null if not found
 */
export function getHoldings(ticker: string): ETFHoldingInsert[] | null {
  const filePath = path.join(ETFS_DIR, `${ticker.toUpperCase()}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const etfData: ETFData = JSON.parse(fileContent);
    return etfData.holdings;
  } catch (error) {
    console.error(`Error reading holdings for ${ticker}:`, error);
    return null;
  }
}

/**
 * Get full ETF data including profile and holdings
 * @param ticker ETF symbol
 * @returns ETF data or null if not found
 */
export function getETFData(ticker: string): ETFData | null {
  const filePath = path.join(ETFS_DIR, `${ticker.toUpperCase()}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading ETF data for ${ticker}:`, error);
    return null;
  }
}

/**
 * Get all available ETFs from index
 * @returns Array of ETF index entries
 */
export function getAllETFs(): IndexEntry[] {
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }

  try {
    const fileContent = fs.readFileSync(INDEX_FILE, "utf-8");
    const indexData: IndexData = JSON.parse(fileContent);
    return indexData.etfs;
  } catch (error) {
    console.error("Error reading ETF index:", error);
    return [];
  }
}

/**
 * Search ETFs by symbol or name
 * @param query Search query
 * @returns Array of matching ETF index entries
 */
export function searchETFs(query: string): IndexEntry[] {
  const allETFs = getAllETFs();
  const lowerQuery = query.toLowerCase();

  return allETFs.filter(
    (etf) =>
      etf.symbol.toLowerCase().includes(lowerQuery) ||
      (etf.name && etf.name.toLowerCase().includes(lowerQuery))
  );
}
