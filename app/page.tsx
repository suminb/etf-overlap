"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import ETFAutocomplete from "@/components/ETFAutocomplete";

interface SharedHolding {
  symbol: string;
  name: string;
  weight1: number;
  weight2: number;
  overlapContribution: number;
}

interface OverlapDetail {
  etf1: string;
  etf2: string;
  overlapPercentage: number;
  sharedHoldings: SharedHolding[];
  totalSharedHoldings: number;
  uniqueHoldings1: number;
  uniqueHoldings2: number;
}

interface CoreOverlap {
  totalOverlap: number;
  sharedHoldings: Array<{
    symbol: string;
    name: string;
    weights: { [etf: string]: number };
    minWeight: number;
  }>;
  totalSharedHoldings: number;
}

interface OverlapMatrixResponse {
  etfs: string[];
  matrix: number[][];
  details: { [key: string]: OverlapDetail };
  coreOverlap: CoreOverlap;
  error?: string;
}

function DonutChart({
  overlap,
  total,
  t,
}: {
  overlap: number;
  total: number;
  t: any;
}) {
  const percentage = (overlap / total) * 100;
  const radius = 64;
  const strokeWidth = 28;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg
        height={radius * 2}
        width={radius * 2}
        style={{ transform: "rotate(-90deg)" }}
        role="img"
        aria-label={`${overlap.toFixed(1)}% overlap visualization`}
      >
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#2563eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#2563eb", lineHeight: 1 }}>
          {overlap.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

const STORAGE_KEY = "etf-overlap-selected-tickers";

function OverlapPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickers, setTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OverlapMatrixResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<OverlapDetail | null>(
    null
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasAttemptedCalculation, setHasAttemptedCalculation] = useState(false);

  // Load tickers from URL on mount (only once)
  useEffect(() => {
    const urlTickers = searchParams.get("tickers");
    if (urlTickers) {
      const tickerList = urlTickers.split(",").filter(Boolean);
      if (tickerList.length >= 2) {
        setTickers(tickerList);
        setIsInitialized(true);
        // Auto-calculate only when loading from URL
        calculateOverlap(tickerList);
        return;
      }
    }

    // Don't load from localStorage - start with empty state
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update URL when tickers change (after initialization)
  useEffect(() => {
    if (!isInitialized) return;

    if (tickers.length > 0) {
      const params = new URLSearchParams();
      params.set("tickers", tickers.join(","));
      router.replace(`?${params.toString()}`, { scroll: false });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
    } else {
      router.replace("/", { scroll: false });
      localStorage.removeItem(STORAGE_KEY);
    }

    // Reset calculation flag when user manually changes tickers
    // (but not on initial load)
    if (hasAttemptedCalculation) {
      setHasAttemptedCalculation(false);
    }
  }, [tickers, router, isInitialized]);

  const calculateOverlap = useCallback(async (tickerList: string[]) => {
    if (tickerList.length < 2) {
      setError("Please enter at least 2 ETF tickers");
      return;
    }

    setLoading(true);
    setError(null);
    // Don't clear data immediately to prevent flicker

    try {
      const response = await fetch(
        `/api/overlap?tickers=${tickerList.join(",")}`
      );
      const result: OverlapMatrixResponse = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || "Failed to calculate overlap");
        setData(null); // Only clear on error
        return;
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setData(null); // Only clear on error
    } finally {
      setLoading(false);
    }
  }, []);

  // No auto-calculation - user must click the button manually

  const getHeatmapColor = (value: number): string => {
    // Color scale: 0% = white, 100% = dark blue
    if (value >= 80) return "#1e3a8a"; // dark blue
    if (value >= 60) return "#3b82f6"; // blue
    if (value >= 40) return "#60a5fa"; // light blue
    if (value >= 20) return "#93c5fd"; // lighter blue
    return "#dbeafe"; // very light blue
  };

  const getTextColor = (value: number): string => {
    return value >= 60 ? "#ffffff" : "#1f2937";
  };

  const handleCellClick = (etf1: string, etf2: string) => {
    if (etf1 === etf2) return; // Skip diagonal

    const key = `${etf1}-${etf2}`;
    const detail = data?.details[key];

    if (detail) {
      setSelectedDetail(detail);
      // Scroll to details section
      setTimeout(() => {
        document
          .getElementById("overlap-details")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <main className="app-main">
      {/* Hero */}
      <div className="page-hero">
        <div className="page-hero-badge">✦ Free Tool</div>
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>

      {/* Search card */}
      <div className="card-section">
        <div className="form-label" style={{ fontSize: "0.9375rem", marginBottom: "0.75rem" }}>
          {t("enterTickers")}
        </div>

        <ETFAutocomplete
          selectedETFs={tickers}
          onChange={setTickers}
          disabled={false}
          onSubmit={() => {
            if (tickers.length >= 2 && !loading) {
              setHasAttemptedCalculation(true);
              calculateOverlap(tickers);
            }
          }}
        />

        <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setHasAttemptedCalculation(true);
              calculateOverlap(tickers);
            }}
            disabled={loading || tickers.length < 2}
            className="btn btn-primary btn-lg"
          >
            {loading && <span className="btn-spinner" />}
            {loading ? t("calculating") : t("calculate")}
          </button>
          {tickers.length === 1 && (
            <span style={{ fontSize: "0.875rem", color: "var(--color-gray-400)" }}>
              {t("addAtLeastTwo")}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && !data && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p className="loading-text">{t("calculating")}&hellip;</p>
        </div>
      )}

      {/* Empty state (when no data and not loading) */}
      {!loading && !data && !error && hasAttemptedCalculation && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-title">No data available</p>
          <p className="empty-state-text">Please try different ETF tickers.</p>
        </div>
      )}

      {data && data.matrix && data.matrix.length > 0 && (
        <div>
          {/* Core Overlap Section */}
          {data.coreOverlap && data.etfs.length >= 2 && (
            <div className="card-highlight">
              <h2 className="section-title" style={{ color: "var(--color-primary)" }}>
                {t("coreOverlapTitle", { count: data.etfs.length })}
              </h2>

              <div className="core-overlap-stats">
                {/* Donut Chart */}
                <div className="donut-wrapper">
                  <DonutChart
                    overlap={data.coreOverlap.totalOverlap}
                    total={100}
                    t={t}
                  />
                </div>

                {/* Statistics */}
                <div className="overlap-stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">{t("totalOverlap")}</div>
                    <div className="stat-value">
                      {data.coreOverlap.totalOverlap.toFixed(1)}%
                    </div>
                    <div className="stat-description">{t("coreOverlapDesc")}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">{t("sharedHoldings")}</div>
                    <div className="stat-value stat-value--neutral">
                      {data.coreOverlap.totalSharedHoldings}
                    </div>
                    <div className="stat-description">{t("sharedHoldingsDesc")}</div>
                  </div>
                </div>
              </div>

              {/* Table of shared holdings */}
              {data.coreOverlap.sharedHoldings.length > 0 && (
                <div style={{ marginTop: "1.75rem" }}>
                  <h3 className="card-section-title" style={{ marginBottom: "0.75rem" }}>
                    {t("holdingsSharedByAll", { count: data.etfs.length })}
                  </h3>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t("symbol")}</th>
                          <th>{t("name")}</th>
                          {data.etfs.map((etf) => (
                            <th key={etf} className="text-right">{etf} %</th>
                          ))}
                          <th className="text-right col-highlight">{t("minWeight")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.coreOverlap.sharedHoldings.map((holding, index) => (
                          <tr key={holding.symbol}>
                            <td className="font-semibold">{holding.symbol}</td>
                            <td>{holding.name}</td>
                            {data.etfs.map((etf) => (
                              <td key={etf} className="text-right">
                                {holding.weights[etf]?.toFixed(2)}%
                              </td>
                            ))}
                            <td
                              className={`text-right ${index < 5 ? "cell-highlight-strong" : index < 10 ? "cell-highlight" : ""}`}
                            >
                              {holding.minWeight.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2 + data.etfs.length} className="text-right">
                            {t("totalOverlap")}:
                          </td>
                          <td className="text-right total-value">
                            {data.coreOverlap.totalOverlap.toFixed(2)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {data.coreOverlap.sharedHoldings.length === 0 && (
                <div className="alert alert-warning" style={{ marginTop: "1.5rem", marginBottom: 0 }}>
                  <span className="alert-icon">ℹ</span>
                  <span>{t("noSharedHoldings", { count: data.etfs.length })}</span>
                </div>
              )}
            </div>
          )}

          {/* Pairwise Heatmap */}
          <div className="card-section">
            <h2 className="section-title">{t("pairwiseTitle")}</h2>
            <p className="section-subtitle">{t("pairwiseDesc")}</p>

            <div className="heatmap-wrapper">
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th className="col-header">{t("etf")}</th>
                    {data.etfs.map((etf) => (
                      <th key={etf}>{etf}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.etfs.map((etf1, i) => (
                    <tr key={etf1}>
                      <td className="row-header">{etf1}</td>
                      {data.matrix[i].map((value, j) => (
                        <td
                          key={j}
                          onClick={() => handleCellClick(etf1, data.etfs[j])}
                          className={i === j ? "diagonal" : "clickable"}
                          style={
                            i !== j
                              ? {
                                  backgroundColor: getHeatmapColor(value),
                                  color: getTextColor(value),
                                }
                              : undefined
                          }
                          title={
                            i === j
                              ? etf1
                              : `Click to see ${etf1} vs ${data.etfs[j]} overlap details`
                          }
                        >
                          {i === j ? "—" : `${value.toFixed(1)}%`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Color legend */}
            <div className="legend">
              <span className="legend-title">{t("legend")}</span>
              {[
                { label: "0–20%", color: "#dbeafe" },
                { label: "20–40%", color: "#93c5fd" },
                { label: "40–60%", color: "#60a5fa" },
                { label: "60–80%", color: "#3b82f6" },
                { label: "80–100%", color: "#1e3a8a" },
              ].map(({ label, color }) => (
                <div key={label} className="legend-item">
                  <div className="legend-swatch" style={{ backgroundColor: color }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Interpretation guide */}
            <div className="guide-box">
              <div className="guide-box-title">{t("howToRead")}</div>
              <ul>
                <li>{t("highOverlap")}</li>
                <li>{t("mediumOverlap")}</li>
                <li>{t("lowOverlap")}</li>
                <li>{t("clickCell")}</li>
              </ul>
            </div>
          </div>

          {/* Detailed overlap view */}
          {selectedDetail && (
            <div id="overlap-details" className="detail-panel">
              <div className="detail-panel-header">
                <h2 className="detail-panel-title">
                  {t("overlapDetails", {
                    etf1: selectedDetail.etf1,
                    etf2: selectedDetail.etf2,
                  })}
                </h2>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="btn btn-secondary"
                >
                  {t("close")}
                </button>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-label">{t("totalOverlap")}</div>
                  <div className="stat-value">
                    {selectedDetail.overlapPercentage.toFixed(2)}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t("sharedHoldings")}</div>
                  <div className="stat-value stat-value--neutral">
                    {selectedDetail.totalSharedHoldings}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t("uniqueTo", { etf: selectedDetail.etf1 })}</div>
                  <div className="stat-value stat-value--neutral">
                    {selectedDetail.uniqueHoldings1}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">{t("uniqueTo", { etf: selectedDetail.etf2 })}</div>
                  <div className="stat-value stat-value--neutral">
                    {selectedDetail.uniqueHoldings2}
                  </div>
                </div>
              </div>

              <h3 className="card-section-title">{t("overlappingHoldings")}</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("symbol")}</th>
                      <th>{t("name")}</th>
                      <th className="text-right">{t("weight", { etf: selectedDetail.etf1 })}</th>
                      <th className="text-right">{t("weight", { etf: selectedDetail.etf2 })}</th>
                      <th className="text-right col-highlight">{t("overlapContribution")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetail.sharedHoldings.map((holding, index) => (
                      <tr key={holding.symbol}>
                        <td className="font-semibold">{holding.symbol}</td>
                        <td>{holding.name}</td>
                        <td className="text-right">{holding.weight1.toFixed(2)}%</td>
                        <td className="text-right">{holding.weight2.toFixed(2)}%</td>
                        <td
                          className={`text-right ${index < 5 ? "cell-highlight-strong" : index < 10 ? "cell-highlight" : ""}`}
                        >
                          {holding.overlapContribution.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right">
                        {t("totalWeightedOverlap")}
                      </td>
                      <td className="text-right total-value">
                        {selectedDetail.overlapPercentage.toFixed(2)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <OverlapPage />
    </Suspense>
  );
}
