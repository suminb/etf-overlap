import * as fs from "fs";
import { getHoldings, getETFData, getAllETFs, searchETFs } from "@/lib/data";

jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

const sampleETFData = {
  symbol: "TEST",
  name: "Test ETF",
  last_updated: "2024-01-01",
  profile: {
    issuer: "Test Issuer",
    expense_ratio: 0.03,
  },
  holdings: [
    { symbol: "AAPL", name: "Apple Inc.", weight: 7.5 },
    { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.2 },
  ],
};

const sampleIndexData = {
  etfs: [
    {
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      issuer: "SPDR",
      last_updated: "2024-01-01",
    },
    {
      symbol: "QQQ",
      name: "Invesco QQQ Trust",
      issuer: "Invesco",
      last_updated: "2024-01-01",
    },
    {
      symbol: "VTI",
      name: "Vanguard Total Stock Market ETF",
      issuer: "Vanguard",
      last_updated: "2024-01-01",
    },
  ],
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe("getHoldings", () => {
  it("returns holdings array for an existing ETF", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleETFData) as any);

    const holdings = getHoldings("TEST");
    expect(holdings).not.toBeNull();
    expect(holdings).toHaveLength(2);
    expect(holdings![0].symbol).toBe("AAPL");
    expect(holdings![0].weight).toBe(7.5);
  });

  it("is case-insensitive (lowercase ticker)", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleETFData) as any);

    const holdings = getHoldings("test");
    expect(holdings).not.toBeNull();
    expect(holdings).toHaveLength(2);
  });

  it("returns null for a non-existent ETF", () => {
    mockFs.existsSync.mockReturnValue(false);

    const holdings = getHoldings("UNKNOWN_XYZ");
    expect(holdings).toBeNull();
  });

  it("returns null when the JSON file is malformed", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("{ not valid json" as any);

    const holdings = getHoldings("BAD");
    expect(holdings).toBeNull();
  });
});

describe("getETFData", () => {
  it("returns full ETF data for an existing ticker", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleETFData) as any);

    const data = getETFData("TEST");
    expect(data).not.toBeNull();
    expect(data!.symbol).toBe("TEST");
    expect(data!.name).toBe("Test ETF");
    expect(data!.profile?.issuer).toBe("Test Issuer");
    expect(data!.holdings).toHaveLength(2);
  });

  it("is case-insensitive", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleETFData) as any);

    const data = getETFData("test");
    expect(data).not.toBeNull();
    expect(data!.symbol).toBe("TEST");
  });

  it("returns null for a non-existent ETF", () => {
    mockFs.existsSync.mockReturnValue(false);

    const data = getETFData("NOTFOUND");
    expect(data).toBeNull();
  });
});

describe("getAllETFs", () => {
  it("returns all ETFs from the index", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleIndexData) as any);

    const etfs = getAllETFs();
    expect(etfs).toHaveLength(3);
    expect(etfs.map((e) => e.symbol)).toEqual(["SPY", "QQQ", "VTI"]);
  });

  it("returns an empty array when the index file is missing", () => {
    mockFs.existsSync.mockReturnValue(false);

    const etfs = getAllETFs();
    expect(etfs).toEqual([]);
  });

  it("returns an empty array when the index file is malformed", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("not json" as any);

    const etfs = getAllETFs();
    expect(etfs).toEqual([]);
  });
});

describe("searchETFs", () => {
  beforeEach(() => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleIndexData) as any);
  });

  it("finds ETFs by exact symbol match", () => {
    const results = searchETFs("SPY");
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe("SPY");
  });

  it("finds ETFs by partial name match", () => {
    const results = searchETFs("Vanguard");
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe("VTI");
  });

  it("is case-insensitive", () => {
    const results = searchETFs("spy");
    expect(results).toHaveLength(1);
    expect(results[0].symbol).toBe("SPY");
  });

  it("returns multiple results when query matches several ETFs", () => {
    // "Trust" appears in both SPY and QQQ names
    const results = searchETFs("Trust");
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("returns an empty array when nothing matches", () => {
    const results = searchETFs("XYZNOTEXIST");
    expect(results).toHaveLength(0);
  });
});

