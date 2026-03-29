import { NextRequest, NextResponse } from "next/server";
import { getHoldings } from "@/lib/data";
import {
  calculateOverlap,
  calculateCoreOverlap,
  OverlapResult,
  CoreOverlap,
} from "@/lib/overlap";

interface OverlapMatrixResponse {
  etfs: string[];
  matrix: number[][];
  details: { [key: string]: OverlapResult };
  coreOverlap: CoreOverlap;
  error?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tickersParam = searchParams.get("tickers");

  if (!tickersParam) {
    return NextResponse.json(
      { error: "tickers parameter is required (comma-separated)" },
      { status: 400 }
    );
  }

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  if (tickers.length < 2) {
    return NextResponse.json(
      { error: "At least 2 ETF tickers are required" },
      { status: 400 }
    );
  }

  try {
    // Fetch holdings for all ETFs
    const holdingsMap = new Map<
      string,
      Array<{ symbol: string; name: string; weight: number }>
    >();

    for (const ticker of tickers) {
      const holdings = getHoldings(ticker);

      if (!holdings || holdings.length === 0) {
        return NextResponse.json(
          {
            error: `No holdings found for ${ticker}`,
            etfs: tickers,
            matrix: [],
          },
          { status: 404 }
        );
      }

      holdingsMap.set(ticker, holdings);
    }

    // Calculate overlap matrix and store details
    const matrix: number[][] = [];
    const details: { [key: string]: OverlapResult } = {};

    for (let i = 0; i < tickers.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < tickers.length; j++) {
        if (i === j) {
          // Diagonal: self-overlap is 100%
          matrix[i][j] = 100;
        } else {
          const holdings1 = holdingsMap.get(tickers[i])!;
          const holdings2 = holdingsMap.get(tickers[j])!;
          const overlap = calculateOverlap(
            tickers[i],
            holdings1,
            tickers[j],
            holdings2
          );

          matrix[i][j] = Math.round(overlap.overlapPercentage * 100) / 100;

          // Store details with key "ETF1-ETF2"
          const key = `${tickers[i]}-${tickers[j]}`;
          details[key] = overlap;
        }
      }
    }

    // Calculate N-way core overlap (shared by ALL ETFs)
    const coreOverlap = calculateCoreOverlap(holdingsMap, tickers);

    return NextResponse.json({
      etfs: tickers,
      matrix,
      details,
      coreOverlap,
    } as OverlapMatrixResponse);
  } catch (error) {
    console.error("Error calculating overlap:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate overlap",
        etfs: tickers,
        matrix: [],
      },
      { status: 500 }
    );
  }
}
