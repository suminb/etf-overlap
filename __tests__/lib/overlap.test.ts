import { calculateOverlap, calculateCoreOverlap } from "@/lib/overlap";

// Helper to build a simple holdings list
type Holding = { symbol: string; name: string; weight: number };

function h(symbol: string, weight: number, name = ""): Holding {
  return { symbol, name: name || symbol, weight };
}

describe("calculateOverlap", () => {
  it("returns zero overlap when ETFs share no holdings", () => {
    const result = calculateOverlap(
      "ETF_A",
      [h("AAPL", 50), h("MSFT", 50)],
      "ETF_B",
      [h("AMZN", 60), h("GOOG", 40)]
    );

    expect(result.overlapPercentage).toBe(0);
    expect(result.sharedHoldings).toHaveLength(0);
    expect(result.totalSharedHoldings).toBe(0);
    expect(result.uniqueHoldings1).toBe(2);
    expect(result.uniqueHoldings2).toBe(2);
  });

  it("returns correct weighted overlap for partial overlap", () => {
    const result = calculateOverlap(
      "ETF_A",
      [h("AAPL", 30), h("MSFT", 20), h("AMZN", 50)],
      "ETF_B",
      [h("AAPL", 10), h("GOOG", 40), h("AMZN", 50)]
    );

    // AAPL: min(30, 10) = 10; AMZN: min(50, 50) = 50  → total 60
    expect(result.overlapPercentage).toBeCloseTo(60, 5);
    expect(result.totalSharedHoldings).toBe(2);
    expect(result.uniqueHoldings1).toBe(1); // MSFT unique to ETF_A
    expect(result.uniqueHoldings2).toBe(1); // GOOG unique to ETF_B
  });

  it("returns 100 overlap when holdings are identical", () => {
    const holdings = [h("AAPL", 40), h("MSFT", 60)];
    const result = calculateOverlap("ETF_A", holdings, "ETF_B", holdings);

    expect(result.overlapPercentage).toBeCloseTo(100, 5);
    expect(result.totalSharedHoldings).toBe(2);
    expect(result.uniqueHoldings1).toBe(0);
    expect(result.uniqueHoldings2).toBe(0);
  });

  it("picks the minimum weight as each holding's contribution", () => {
    const result = calculateOverlap(
      "ETF_A",
      [h("AAPL", 70)],
      "ETF_B",
      [h("AAPL", 30)]
    );

    expect(result.sharedHoldings[0].overlapContribution).toBe(30);
    expect(result.sharedHoldings[0].weight1).toBe(70);
    expect(result.sharedHoldings[0].weight2).toBe(30);
  });

  it("sorts shared holdings by overlap contribution descending", () => {
    const result = calculateOverlap(
      "ETF_A",
      [h("AAPL", 5), h("MSFT", 20), h("AMZN", 10)],
      "ETF_B",
      [h("AAPL", 5), h("MSFT", 20), h("AMZN", 10)]
    );

    const contributions = result.sharedHoldings.map(
      (sh) => sh.overlapContribution
    );
    expect(contributions).toEqual([...contributions].sort((a, b) => b - a));
  });

  it("uses the name from the first ETF when available", () => {
    const result = calculateOverlap(
      "ETF_A",
      [{ symbol: "AAPL", name: "Apple Inc.", weight: 10 }],
      "ETF_B",
      [{ symbol: "AAPL", name: "Apple", weight: 5 }]
    );

    expect(result.sharedHoldings[0].name).toBe("Apple Inc.");
  });

  it("falls back to the second ETF name when first name is empty", () => {
    const result = calculateOverlap(
      "ETF_A",
      [{ symbol: "AAPL", name: "", weight: 10 }],
      "ETF_B",
      [{ symbol: "AAPL", name: "Apple Inc.", weight: 5 }]
    );

    expect(result.sharedHoldings[0].name).toBe("Apple Inc.");
  });

  it("sets etf1 and etf2 correctly", () => {
    const result = calculateOverlap("SPY", [], "QQQ", []);
    expect(result.etf1).toBe("SPY");
    expect(result.etf2).toBe("QQQ");
  });
});

describe("calculateCoreOverlap", () => {
  it("returns empty result for fewer than 2 tickers", () => {
    const map = new Map([["ETF_A", [h("AAPL", 100)]]]);
    const result = calculateCoreOverlap(map, ["ETF_A"]);

    expect(result.totalOverlap).toBe(0);
    expect(result.sharedHoldings).toHaveLength(0);
    expect(result.totalSharedHoldings).toBe(0);
  });

  it("returns zero overlap when no holdings are common to all ETFs", () => {
    const map = new Map([
      ["ETF_A", [h("AAPL", 50), h("MSFT", 50)]],
      ["ETF_B", [h("AMZN", 60), h("GOOG", 40)]],
    ]);
    const result = calculateCoreOverlap(map, ["ETF_A", "ETF_B"]);

    expect(result.totalOverlap).toBe(0);
    expect(result.sharedHoldings).toHaveLength(0);
  });

  it("calculates core overlap for two ETFs with shared holdings", () => {
    const map = new Map([
      ["ETF_A", [h("AAPL", 30), h("MSFT", 20), h("AMZN", 50)]],
      ["ETF_B", [h("AAPL", 10), h("GOOG", 40), h("AMZN", 50)]],
    ]);
    const result = calculateCoreOverlap(map, ["ETF_A", "ETF_B"]);

    // AAPL: min(30,10)=10; AMZN: min(50,50)=50  → total 60
    expect(result.totalOverlap).toBeCloseTo(60, 5);
    expect(result.totalSharedHoldings).toBe(2);
  });

  it("calculates core overlap for three ETFs (N-way intersection)", () => {
    const map = new Map([
      ["A", [h("AAPL", 40), h("MSFT", 30), h("AMZN", 30)]],
      ["B", [h("AAPL", 20), h("MSFT", 50), h("GOOG", 30)]],
      ["C", [h("AAPL", 10), h("AMZN", 60), h("GOOG", 30)]],
    ]);
    const result = calculateCoreOverlap(map, ["A", "B", "C"]);

    // Only AAPL is in all three: min(40,20,10) = 10
    expect(result.totalOverlap).toBeCloseTo(10, 5);
    expect(result.totalSharedHoldings).toBe(1);
    expect(result.sharedHoldings[0].symbol).toBe("AAPL");
    expect(result.sharedHoldings[0].minWeight).toBe(10);
  });

  it("records individual ETF weights in each shared holding", () => {
    const map = new Map([
      ["ETF_A", [h("AAPL", 30)]],
      ["ETF_B", [h("AAPL", 10)]],
    ]);
    const result = calculateCoreOverlap(map, ["ETF_A", "ETF_B"]);

    expect(result.sharedHoldings[0].weights).toEqual({ ETF_A: 30, ETF_B: 10 });
  });

  it("sorts shared holdings by min weight descending", () => {
    const map = new Map([
      ["A", [h("AAPL", 5), h("MSFT", 30), h("AMZN", 15)]],
      ["B", [h("AAPL", 5), h("MSFT", 30), h("AMZN", 15)]],
    ]);
    const result = calculateCoreOverlap(map, ["A", "B"]);

    const minWeights = result.sharedHoldings.map((sh) => sh.minWeight);
    expect(minWeights).toEqual([...minWeights].sort((a, b) => b - a));
  });
});
