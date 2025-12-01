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
  const radius = 60;
  const strokeWidth = 30;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div>
      <svg
        height={radius * 2}
        width={radius * 2}
        style={{ transform: "rotate(-90deg)" }}
        role="img"
        aria-label={`${overlap.toFixed(1)}% overlap visualization`}
      >
        {/* Background circle */}
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Overlap arc */}
        <circle
          stroke="#0070f3"
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
    <main
      className="main-container"
      style={{
        padding: "2rem",
        minHeight: "100vh",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      <h1>{t("title")}</h1>
      <p style={{ marginBottom: "2rem", color: "#666" }}>{t("subtitle")}</p>

      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginBottom: "1rem" }}>{t("enterTickers")}</h3>

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

        <div style={{ marginTop: "1rem" }}>
          <button
            onClick={() => {
              setHasAttemptedCalculation(true);
              calculateOverlap(tickers);
            }}
            disabled={loading || tickers.length < 2}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading || tickers.length < 2 ? "not-allowed" : "pointer",
              opacity: loading || tickers.length < 2 ? 0.6 : 1,
            }}
          >
            {loading ? t("calculating") : t("calculate")}
          </button>
          {tickers.length < 2 && tickers.length > 0 && (
            <span
              style={{
                marginLeft: "1rem",
                color: "#9ca3af",
                fontSize: "0.875rem",
              }}
            >
              {t("addAtLeastTwo")}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c33",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {data && data.matrix && data.matrix.length > 0 && (
        <div>
          {/* Core Overlap Section - Holdings in ALL ETFs */}
          {data.coreOverlap && data.etfs.length >= 2 && (
            <div
              style={{
                marginBottom: "3rem",
                padding: "2rem",
                backgroundColor: "#f0f9ff",
                borderRadius: "12px",
                border: "2px solid #0070f3",
              }}
            >
              <h2 style={{ marginBottom: "1.5rem", color: "#0070f3" }}>
                {t("coreOverlapTitle", { count: data.etfs.length })}
              </h2>

              <div
                className="core-overlap-container"
                style={{
                  display: "flex",
                  gap: "2rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                {/* Donut Chart */}
                <div
                  className="donut-wrapper"
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DonutChart
                    overlap={data.coreOverlap.totalOverlap}
                    total={100}
                    t={t}
                  />
                </div>

                {/* Statistics */}
                <div style={{ flex: "1", minWidth: "300px" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: "1.5rem",
                      padding: "1rem",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: "600",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {t("totalOverlap")}
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(2rem, 6vw, 3rem)",
                          fontWeight: "bold",
                          color: "#0070f3",
                          lineHeight: "1",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {data.coreOverlap.totalOverlap.toFixed(1)}%
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "#6b7280",
                          lineHeight: "1.4",
                        }}
                      >
                        {t("coreOverlapDesc")}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontWeight: "600",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {t("sharedHoldings")}
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
                          fontWeight: "bold",
                          color: "#1f2937",
                          lineHeight: "1",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {data.coreOverlap.totalSharedHoldings}
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "#6b7280",
                          lineHeight: "1.4",
                        }}
                      >
                        {t("sharedHoldingsDesc")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table of shared holdings */}
              {data.coreOverlap.sharedHoldings.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 style={{ marginBottom: "1rem" }}>
                    {t("holdingsSharedByAll", { count: data.etfs.length })}
                  </h3>
                  <div
                    style={{
                      overflowX: "auto",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      padding: "1rem",
                    }}
                  >
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f5f5f5" }}>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              borderBottom: "2px solid #ddd",
                            }}
                          >
                            {t("symbol")}
                          </th>
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "left",
                              borderBottom: "2px solid #ddd",
                            }}
                          >
                            {t("name")}
                          </th>
                          {data.etfs.map((etf) => (
                            <th
                              key={etf}
                              style={{
                                padding: "0.75rem",
                                textAlign: "right",
                                borderBottom: "2px solid #ddd",
                              }}
                            >
                              {etf} %
                            </th>
                          ))}
                          <th
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              borderBottom: "2px solid #ddd",
                              backgroundColor: "#eff6ff",
                            }}
                          >
                            {t("minWeight")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.coreOverlap.sharedHoldings.map(
                          (holding, index) => (
                            <tr
                              key={holding.symbol}
                              style={{ borderBottom: "1px solid #eee" }}
                            >
                              <td
                                style={{
                                  padding: "0.75rem",
                                  fontWeight: "500",
                                }}
                              >
                                {holding.symbol}
                              </td>
                              <td style={{ padding: "0.75rem" }}>
                                {holding.name}
                              </td>
                              {data.etfs.map((etf) => (
                                <td
                                  key={etf}
                                  style={{
                                    padding: "0.75rem",
                                    textAlign: "right",
                                  }}
                                >
                                  {holding.weights[etf]?.toFixed(2)}%
                                </td>
                              ))}
                              <td
                                style={{
                                  padding: "0.75rem",
                                  textAlign: "right",
                                  backgroundColor:
                                    index < 10 ? "#eff6ff" : "transparent",
                                  fontWeight: index < 5 ? "bold" : "normal",
                                }}
                              >
                                {holding.minWeight.toFixed(2)}%
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                      <tfoot>
                        <tr
                          style={{
                            backgroundColor: "#f5f5f5",
                            fontWeight: "bold",
                          }}
                        >
                          <td
                            colSpan={2 + data.etfs.length}
                            style={{ padding: "0.75rem", textAlign: "right" }}
                          >
                            {t("totalOverlap")}:
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              textAlign: "right",
                              color: "#0070f3",
                              fontSize: "1.1rem",
                            }}
                          >
                            {data.coreOverlap.totalOverlap.toFixed(2)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {data.coreOverlap.sharedHoldings.length === 0 && (
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1.5rem",
                    backgroundColor: "#fff3cd",
                    borderRadius: "8px",
                    border: "1px solid #ffc107",
                  }}
                >
                  <p style={{ margin: 0, color: "#856404" }}>
                    {t("noSharedHoldings", { count: data.etfs.length })}
                  </p>
                </div>
              )}
            </div>
          )}

          <h2 style={{ marginBottom: "1rem" }}>{t("pairwiseTitle")}</h2>
          <p style={{ marginBottom: "1.5rem", color: "#666" }}>
            {t("pairwiseDesc")}
          </p>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                backgroundColor: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                      backgroundColor: "#f5f5f5",
                      fontWeight: "bold",
                      minWidth: "100px",
                    }}
                  >
                    {t("etf")}
                  </th>
                  {data.etfs.map((etf) => (
                    <th
                      key={etf}
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        borderBottom: "2px solid #ddd",
                        backgroundColor: "#f5f5f5",
                        fontWeight: "bold",
                        minWidth: "100px",
                      }}
                    >
                      {etf}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.etfs.map((etf1, i) => (
                  <tr key={etf1}>
                    <td
                      style={{
                        padding: "1rem",
                        fontWeight: "bold",
                        backgroundColor: "#f5f5f5",
                        borderRight: "2px solid #ddd",
                      }}
                    >
                      {etf1}
                    </td>
                    {data.matrix[i].map((value, j) => (
                      <td
                        key={j}
                        onClick={() => handleCellClick(etf1, data.etfs[j])}
                        style={{
                          padding: "1.5rem",
                          textAlign: "center",
                          backgroundColor:
                            i === j ? "#f9fafb" : getHeatmapColor(value),
                          color: i === j ? "#9ca3af" : getTextColor(value),
                          fontWeight: i === j ? "normal" : "normal",
                          fontSize: "1.1rem",
                          border: "1px solid #e5e7eb",
                          transition: "all 0.2s",
                          cursor: i === j ? "default" : "pointer",
                        }}
                        title={
                          i === j
                            ? `${etf1}`
                            : `Click to see ${etf1} vs ${data.etfs[j]} overlap details`
                        }
                        onMouseEnter={(e) => {
                          if (i !== j) {
                            e.currentTarget.style.transform = "scale(1.05)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 8px rgba(0,0,0,0.2)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
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
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>
              {t("legend")}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "0-20%", color: "#dbeafe" },
                { label: "20-40%", color: "#93c5fd" },
                { label: "40-60%", color: "#60a5fa" },
                { label: "60-80%", color: "#3b82f6" },
                { label: "80-100%", color: "#1e3a8a" },
              ].map(({ label, color }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "20px",
                      backgroundColor: color,
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                    }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interpretation guide */}
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "#eff6ff",
              borderRadius: "8px",
              border: "1px solid #bfdbfe",
            }}
          >
            <h3
              style={{
                marginBottom: "0.5rem",
                fontSize: "1rem",
                color: "#1e40af",
              }}
            >
              {t("howToRead")}
            </h3>
            <ul
              style={{
                marginLeft: "1.5rem",
                color: "#1e40af",
                lineHeight: "1.6",
              }}
            >
              <li>{t("highOverlap")}</li>
              <li>{t("mediumOverlap")}</li>
              <li>{t("lowOverlap")}</li>
              <li>{t("clickCell")}</li>
            </ul>
          </div>

          {/* Detailed overlap view */}
          {selectedDetail && (
            <div
              id="overlap-details"
              style={{
                marginTop: "3rem",
                padding: "2rem",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h2>
                  {t("overlapDetails", {
                    etf1: selectedDetail.etf1,
                    etf2: selectedDetail.etf2,
                  })}
                </h2>
                <button
                  onClick={() => setSelectedDetail(null)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {t("close")}
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginBottom: "2rem",
                }}
              >
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("totalOverlap")}
                  </div>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#0070f3",
                    }}
                  >
                    {selectedDetail.overlapPercentage.toFixed(2)}%
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("sharedHoldings")}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                    {selectedDetail.totalSharedHoldings}
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("uniqueTo", { etf: selectedDetail.etf1 })}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                    {selectedDetail.uniqueHoldings1}
                  </div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("uniqueTo", { etf: selectedDetail.etf2 })}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                    {selectedDetail.uniqueHoldings2}
                  </div>
                </div>
              </div>

              <h3 style={{ marginBottom: "1rem" }}>
                {t("overlappingHoldings")}
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f5f5f5" }}>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #ddd",
                        }}
                      >
                        {t("symbol")}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #ddd",
                        }}
                      >
                        {t("name")}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "right",
                          borderBottom: "2px solid #ddd",
                        }}
                      >
                        {t("weight", { etf: selectedDetail.etf1 })}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "right",
                          borderBottom: "2px solid #ddd",
                        }}
                      >
                        {t("weight", { etf: selectedDetail.etf2 })}
                      </th>
                      <th
                        style={{
                          padding: "0.75rem",
                          textAlign: "right",
                          borderBottom: "2px solid #ddd",
                          backgroundColor: "#eff6ff",
                        }}
                      >
                        {t("overlapContribution")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetail.sharedHoldings.map((holding, index) => (
                      <tr
                        key={holding.symbol}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "0.75rem", fontWeight: "500" }}>
                          {holding.symbol}
                        </td>
                        <td style={{ padding: "0.75rem" }}>{holding.name}</td>
                        <td style={{ padding: "0.75rem", textAlign: "right" }}>
                          {holding.weight1.toFixed(2)}%
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "right" }}>
                          {holding.weight2.toFixed(2)}%
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                            backgroundColor:
                              index < 10 ? "#eff6ff" : "transparent",
                            fontWeight: index < 5 ? "bold" : "normal",
                          }}
                        >
                          {holding.overlapContribution.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}
                    >
                      <td
                        colSpan={4}
                        style={{ padding: "0.75rem", textAlign: "right" }}
                      >
                        {t("totalWeightedOverlap")}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          textAlign: "right",
                          color: "#0070f3",
                        }}
                      >
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
