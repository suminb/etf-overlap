import { NextRequest, NextResponse } from "next/server";
import { getETFData } from "@/lib/data";

interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
  shares?: number;
}

interface ETFHoldingsResponse {
  symbol: string;
  holdings: ETFHolding[];
  error?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { error: "Ticker parameter is required" },
      { status: 400 }
    );
  }

  const normalizedTicker = ticker.toUpperCase().trim();

  try {
    console.log(`Looking up holdings for ${normalizedTicker}...`);
    const etfData = getETFData(normalizedTicker);

    if (!etfData || !etfData.holdings || etfData.holdings.length === 0) {
      console.log(`✗ No data found for ${normalizedTicker}`);
      return NextResponse.json(
        {
          error: `ETF "${normalizedTicker}" not found. Run 'npm run scrape ${normalizedTicker}' to fetch its data.`,
          symbol: normalizedTicker,
          holdings: [],
        },
        { status: 404 }
      );
    }

    console.log(
      `✓ Found ${etfData.holdings.length} holdings for ${normalizedTicker}`
    );

    return NextResponse.json({
      symbol: normalizedTicker,
      holdings: etfData.holdings,
    } as ETFHoldingsResponse);
  } catch (error) {
    console.error("Error fetching ETF holdings:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch ETF holdings",
        symbol: normalizedTicker,
        holdings: [],
      },
      { status: 500 }
    );
  }
}
