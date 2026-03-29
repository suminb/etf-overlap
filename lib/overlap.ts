export interface OverlapResult {
  etf1: string;
  etf2: string;
  overlapPercentage: number;
  sharedHoldings: Array<{
    symbol: string;
    name: string;
    weight1: number;
    weight2: number;
    overlapContribution: number;
  }>;
  totalSharedHoldings: number;
  uniqueHoldings1: number;
  uniqueHoldings2: number;
}

export interface CoreOverlap {
  totalOverlap: number;
  sharedHoldings: Array<{
    symbol: string;
    name: string;
    weights: { [etf: string]: number };
    minWeight: number;
  }>;
  totalSharedHoldings: number;
}

/**
 * Calculate weighted overlap coefficient between two ETFs
 */
export function calculateOverlap(
  etf1: string,
  holdings1: Array<{ symbol: string; name: string; weight: number }>,
  etf2: string,
  holdings2: Array<{ symbol: string; name: string; weight: number }>
): OverlapResult {
  const map1 = new Map(holdings1.map((h) => [h.symbol, h]));
  const map2 = new Map(holdings2.map((h) => [h.symbol, h]));

  const sharedSymbols = holdings1
    .map((h) => h.symbol)
    .filter((symbol) => map2.has(symbol));

  const sharedHoldings = sharedSymbols.map((symbol) => {
    const h1 = map1.get(symbol)!;
    const h2 = map2.get(symbol)!;
    const overlapContribution = Math.min(h1.weight, h2.weight);

    return {
      symbol,
      name: h1.name || h2.name,
      weight1: h1.weight,
      weight2: h2.weight,
      overlapContribution,
    };
  });

  // Sort by overlap contribution (highest first)
  sharedHoldings.sort((a, b) => b.overlapContribution - a.overlapContribution);

  // Calculate total weighted overlap
  const overlapPercentage = sharedHoldings.reduce(
    (sum, h) => sum + h.overlapContribution,
    0
  );

  return {
    etf1,
    etf2,
    overlapPercentage,
    sharedHoldings,
    totalSharedHoldings: sharedHoldings.length,
    uniqueHoldings1: holdings1.length - sharedHoldings.length,
    uniqueHoldings2: holdings2.length - sharedHoldings.length,
  };
}

/**
 * Calculate N-way overlap (holdings shared by ALL ETFs)
 */
export function calculateCoreOverlap(
  holdingsMap: Map<
    string,
    Array<{ symbol: string; name: string; weight: number }>
  >,
  tickers: string[]
): CoreOverlap {
  if (tickers.length < 2) {
    return { totalOverlap: 0, sharedHoldings: [], totalSharedHoldings: 0 };
  }

  // Get all symbols from first ETF
  const firstETF = holdingsMap.get(tickers[0])!;

  // Build a symbol-keyed Map for each ETF for O(1) lookup
  const symbolMaps = new Map(
    tickers.map((ticker) => [
      ticker,
      new Map(holdingsMap.get(ticker)!.map((h) => [h.symbol, h])),
    ])
  );

  // Find symbols that appear in ALL ETFs
  const sharedSymbols = firstETF
    .map((h) => h.symbol)
    .filter((symbol) =>
      tickers.slice(1).every((ticker) => symbolMaps.get(ticker)!.has(symbol))
    );

  // Build shared holdings data
  const sharedHoldings = sharedSymbols.map((symbol) => {
    const weights: { [etf: string]: number } = {};
    let name = symbol;

    tickers.forEach((ticker) => {
      const holding = symbolMaps.get(ticker)!.get(symbol);
      if (holding) {
        weights[ticker] = holding.weight;
        if (name === symbol && holding.name) {
          name = holding.name;
        }
      }
    });

    // Min weight across all ETFs
    const minWeight = Math.min(...Object.values(weights));

    return {
      symbol,
      name,
      weights,
      minWeight,
    };
  });

  // Sort by min weight (highest contribution first)
  sharedHoldings.sort((a, b) => b.minWeight - a.minWeight);

  // Calculate total core overlap
  const totalOverlap = sharedHoldings.reduce((sum, h) => sum + h.minWeight, 0);

  return {
    totalOverlap,
    sharedHoldings,
    totalSharedHoldings: sharedHoldings.length,
  };
}
